import { NextRequest, NextResponse } from 'next/server';

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

interface ShopifyTheme {
  id: number;
  name: string;
  role: string;
}

async function shopifyFetch(storeUrl: string, apiKey: string, path: string, options?: RequestInit) {
  const url = `https://${storeUrl}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': apiKey,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API ${res.status}: ${body}`);
  }

  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { store_url, api_key, config } = await request.json();

    if (!store_url || !api_key || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: store_url, api_key, config' },
        { status: 400 },
      );
    }

    // 1. Verify connection
    const shopData = await shopifyFetch(store_url, api_key, '/shop.json');
    const shopName = shopData.shop?.name || store_url;

    // 2. Get published theme
    const themesData = await shopifyFetch(store_url, api_key, '/themes.json');
    const publishedTheme = themesData.themes?.find((t: ShopifyTheme) => t.role === 'main');

    if (!publishedTheme) {
      return NextResponse.json(
        { error: 'No published theme found on this store' },
        { status: 404 },
      );
    }

    // 3. Read existing settings_data.json
    let existingSettings: Record<string, unknown> = {};
    try {
      const existingAsset = await shopifyFetch(
        store_url,
        api_key,
        `/themes/${publishedTheme.id}/assets.json?asset[key]=config/settings_data.json`,
      );
      if (existingAsset.asset?.value) {
        existingSettings = JSON.parse(existingAsset.asset.value);
      }
    } catch {
      // No existing settings — start fresh
    }

    // 4. Merge theme_settings (global tokens) into settings_data.json
    const themeSettings = config.theme_settings || {};
    const existingCurrent = (existingSettings as { current?: Record<string, unknown> }).current || {};
    const mergedCurrent = {
      ...existingCurrent,
      ...themeSettings,
    };

    const settingsData = {
      ...existingSettings,
      current: mergedCurrent,
    };

    // 5. Push updated settings_data.json
    await shopifyFetch(store_url, api_key, `/themes/${publishedTheme.id}/assets.json`, {
      method: 'PUT',
      body: JSON.stringify({
        asset: {
          key: 'config/settings_data.json',
          value: JSON.stringify(settingsData),
        },
      }),
    });

    // 6. Build and push templates/index.json from sections + section_order
    if (config.sections && config.section_order) {
      const indexTemplate: { sections: Record<string, unknown>; order: string[] } = {
        sections: {},
        order: [],
      };

      for (const sectionKey of config.section_order) {
        const sectionData = config.sections[sectionKey];
        if (!sectionData) continue;

        indexTemplate.sections[sectionKey] = {
          type: sectionData.type,
          ...(sectionData.settings && { settings: sectionData.settings }),
          ...(sectionData.blocks && { blocks: sectionData.blocks }),
          ...(sectionData.block_order && { block_order: sectionData.block_order }),
          ...(sectionData.disabled !== undefined && { disabled: sectionData.disabled }),
        };
        indexTemplate.order.push(sectionKey);
      }

      await shopifyFetch(store_url, api_key, `/themes/${publishedTheme.id}/assets.json`, {
        method: 'PUT',
        body: JSON.stringify({
          asset: {
            key: 'templates/index.json',
            value: JSON.stringify(indexTemplate),
          },
        }),
      });
    }

    const previewUrl = `https://${store_url}/?preview_theme_id=${publishedTheme.id}`;

    return NextResponse.json({
      success: true,
      shop_name: shopName,
      theme_id: publishedTheme.id,
      theme_name: publishedTheme.name,
      preview_url: previewUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deployment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
