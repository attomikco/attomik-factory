import { NextRequest, NextResponse } from 'next/server';

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

async function shopifyFetch(storeUrl: string, apiKey: string, path: string) {
  const url = `https://${storeUrl}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API ${res.status}: ${body}`);
  }

  return res.json();
}

// POST — check store connection + get theme info
export async function POST(request: NextRequest) {
  try {
    const { store_url, api_key } = await request.json();

    if (!store_url || !api_key) {
      return NextResponse.json(
        { error: 'Missing store_url or api_key' },
        { status: 400 },
      );
    }

    // Get shop info
    const shopData = await shopifyFetch(store_url, api_key, '/shop.json');
    const shop = shopData.shop;

    // Get themes
    const themesData = await shopifyFetch(store_url, api_key, '/themes.json');
    const themes = themesData.themes || [];
    const published = themes.find((t: { role: string }) => t.role === 'main');

    return NextResponse.json({
      connected: true,
      shop: {
        name: shop?.name,
        domain: shop?.domain,
        plan: shop?.plan_display_name,
        currency: shop?.currency,
      },
      theme: published ? {
        id: published.id,
        name: published.name,
        role: published.role,
        preview_url: `https://${store_url}/?preview_theme_id=${published.id}`,
      } : null,
      theme_count: themes.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}
