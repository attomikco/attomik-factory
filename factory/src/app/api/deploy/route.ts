import { NextRequest, NextResponse } from 'next/server';

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

interface ShopifyTheme {
  id: number;
  name: string;
  role: string;
}

interface ImageAssignment {
  section_id: string;
  block_id: string | null;
  setting_id: string;
  url: string | null;
  role?: string;
}

interface IndexJson {
  sections?: Record<string, {
    settings?: Record<string, unknown>;
    blocks?: Record<string, { settings?: Record<string, unknown> }>;
  }>;
  order?: string[];
}

// ---------------------------------------------------------------------------
// Store allowlist guard
// ---------------------------------------------------------------------------

function normalizeStoreUrl(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function assertStoreAllowed(storeUrl: string): string | null {
  const allowedRaw = process.env.DEPLOY_ALLOWED_STORES || '';
  const allowed = allowedRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) {
    return 'DEPLOY_ALLOWED_STORES is not configured. Add the store to .env.local and restart the dev server to enable deploys.';
  }
  const normalized = normalizeStoreUrl(storeUrl);
  if (!allowed.includes(normalized)) {
    return `Store "${normalized}" is not in DEPLOY_ALLOWED_STORES. Allowed: ${allowed.join(', ')}.`;
  }
  return null;
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

async function shopifyGraphQL<T>(storeUrl: string, apiKey: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const url = `https://${storeUrl}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify GraphQL ${res.status}: ${body}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Image upload via fileCreate (originalSource)
// ---------------------------------------------------------------------------

const FILE_CREATE_MUTATION = `
  mutation factoryFileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
        alt
        ... on MediaImage {
          image { url }
        }
      }
      userErrors { field message }
    }
  }
`;

const FILE_NODES_QUERY = `
  query factoryFileNodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      id
      ... on MediaImage {
        fileStatus
        image { url }
      }
    }
  }
`;

interface FileCreateResponse {
  fileCreate: {
    files: Array<{
      id: string;
      fileStatus: string;
      image?: { url: string } | null;
    }>;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface FileNodesResponse {
  nodes: Array<{
    id: string;
    fileStatus?: string;
    image?: { url: string } | null;
  } | null>;
}

async function uploadImages(
  storeUrl: string,
  apiKey: string,
  sourceUrls: string[],
): Promise<Map<string, string>> {
  // Map: scraped URL -> Shopify CDN URL. Empty on empty input.
  const result = new Map<string, string>();
  if (sourceUrls.length === 0) return result;

  // fileCreate in batches of 20 to keep payloads reasonable.
  const BATCH_SIZE = 20;
  const idToSource = new Map<string, string>();
  const pendingIds: string[] = [];

  for (let i = 0; i < sourceUrls.length; i += BATCH_SIZE) {
    const batch = sourceUrls.slice(i, i + BATCH_SIZE);
    const files = batch.map(url => ({
      originalSource: url,
      contentType: 'IMAGE',
      alt: '',
    }));

    const data = await shopifyGraphQL<FileCreateResponse>(
      storeUrl,
      apiKey,
      FILE_CREATE_MUTATION,
      { files },
    );

    const errors = data.fileCreate.userErrors;
    if (errors.length) {
      throw new Error(`fileCreate errors: ${errors.map(e => e.message).join('; ')}`);
    }

    data.fileCreate.files.forEach((file, idx) => {
      idToSource.set(file.id, batch[idx]);
      if (file.image?.url) {
        result.set(batch[idx], file.image.url);
      } else {
        pendingIds.push(file.id);
      }
    });
  }

  // Poll any files that don't have an image URL yet.
  const POLL_ATTEMPTS = 20;
  const POLL_INTERVAL_MS = 1500;
  let remaining = [...pendingIds];

  for (let attempt = 0; attempt < POLL_ATTEMPTS && remaining.length > 0; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const data = await shopifyGraphQL<FileNodesResponse>(
      storeUrl,
      apiKey,
      FILE_NODES_QUERY,
      { ids: remaining },
    );

    const stillPending: string[] = [];
    for (const node of data.nodes) {
      if (!node) continue;
      const source = idToSource.get(node.id);
      if (!source) continue;
      if (node.fileStatus === 'READY' && node.image?.url) {
        result.set(source, node.image.url);
      } else if (node.fileStatus === 'FAILED') {
        console.warn(`[deploy] fileCreate FAILED for ${source}`);
      } else {
        stillPending.push(node.id);
      }
    }
    remaining = stillPending;
  }

  if (remaining.length > 0) {
    console.warn(`[deploy] ${remaining.length} file uploads did not reach READY; leaving their URLs unmapped`);
  }

  return result;
}

function rewriteIndexImages(
  indexJson: IndexJson,
  assignments: ImageAssignment[],
  urlMap: Map<string, string>,
): number {
  let rewrites = 0;
  const sections = indexJson.sections || {};
  for (const a of assignments) {
    if (!a.url) continue;
    const mapped = urlMap.get(a.url);
    if (!mapped) continue;
    const section = sections[a.section_id];
    if (!section) continue;
    if (a.block_id === null) {
      section.settings = section.settings || {};
      section.settings[a.setting_id] = mapped;
    } else {
      const block = section.blocks?.[a.block_id];
      if (!block) continue;
      block.settings = block.settings || {};
      block.settings[a.setting_id] = mapped;
    }
    rewrites++;
  }
  return rewrites;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_url, api_key } = body;

    if (!store_url || !api_key) {
      return NextResponse.json(
        { error: 'Missing required fields: store_url, api_key' },
        { status: 400 },
      );
    }

    // 0. Store allowlist — strict: refuses unknown stores and refuses when env is empty
    const allowlistError = assertStoreAllowed(store_url);
    if (allowlistError) {
      return NextResponse.json({ error: allowlistError }, { status: 403 });
    }

    // 1. Verify connection
    const shopData = await shopifyFetch(store_url, api_key, '/shop.json');
    const shopName = shopData.shop?.name || store_url;

    // 2. Resolve target theme — require explicit theme_name or theme_id, never guess
    const themesData = await shopifyFetch(store_url, api_key, '/themes.json');
    const themes: ShopifyTheme[] = themesData.themes || [];

    const requestedThemeId = body.theme_id as number | undefined;
    const requestedThemeName = body.theme_name as string | undefined;
    const confirmLive = body.confirm_live === true;

    if (!requestedThemeId && !requestedThemeName) {
      return NextResponse.json(
        {
          error: 'No target theme specified. Provide theme_name or theme_id.',
          available_themes: themes.map(t => ({ id: t.id, name: t.name, role: t.role })),
        },
        { status: 400 },
      );
    }

    const publishedTheme = requestedThemeId
      ? themes.find(t => t.id === requestedThemeId)
      : themes.find(t => t.name === requestedThemeName);

    if (!publishedTheme) {
      return NextResponse.json(
        {
          error: `Theme "${requestedThemeName ?? requestedThemeId}" not found on ${store_url}.`,
          available_themes: themes.map(t => ({ id: t.id, name: t.name, role: t.role })),
        },
        { status: 404 },
      );
    }

    if (publishedTheme.role === 'main' && !confirmLive) {
      return NextResponse.json(
        {
          error: `Refusing to deploy to "${publishedTheme.name}" because it is the live published theme (role: main). Pass { "confirm_live": true } to override.`,
          theme: { id: publishedTheme.id, name: publishedTheme.name, role: publishedTheme.role },
        },
        { status: 403 },
      );
    }

    // -----------------------------------------------------------------------
    // New branch: caller supplies index_json + settings_data + image_assignments
    // -----------------------------------------------------------------------
    if (body.index_json) {
      const indexJson = body.index_json as IndexJson;
      const settingsDataInput = body.settings_data as Record<string, unknown> | undefined;
      const assignments = (body.image_assignments as ImageAssignment[] | undefined) || [];

      // 3a. Upload unique image URLs via fileCreate (originalSource)
      const uniqueSources = Array.from(
        new Set(assignments.map(a => a.url).filter((u): u is string => typeof u === 'string' && u.length > 0)),
      );

      let urlMap = new Map<string, string>();
      if (uniqueSources.length > 0) {
        urlMap = await uploadImages(store_url, api_key, uniqueSources);
      }

      // 3b. Rewrite matching URLs in index_json with Shopify CDN URLs
      const rewrites = rewriteIndexImages(indexJson, assignments, urlMap);
      console.log(`[deploy] Uploaded ${urlMap.size}/${uniqueSources.length} images, rewrote ${rewrites} slots`);

      // 3c. Merge settings_data (accept either { current: {...} } or flat token map)
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
        // No existing settings
      }

      const incomingCurrent = settingsDataInput && typeof settingsDataInput === 'object'
        ? ('current' in settingsDataInput && typeof settingsDataInput.current === 'object' && settingsDataInput.current !== null
            ? settingsDataInput.current as Record<string, unknown>
            : settingsDataInput as Record<string, unknown>)
        : {};

      const existingCurrent = (existingSettings as { current?: Record<string, unknown> }).current || {};
      const mergedSettingsData = {
        ...existingSettings,
        current: { ...existingCurrent, ...incomingCurrent },
      };

      // 3d. Push config/settings_data.json
      await shopifyFetch(store_url, api_key, `/themes/${publishedTheme.id}/assets.json`, {
        method: 'PUT',
        body: JSON.stringify({
          asset: {
            key: 'config/settings_data.json',
            value: JSON.stringify(mergedSettingsData),
          },
        }),
      });

      // 3e. Push templates/index.json
      await shopifyFetch(store_url, api_key, `/themes/${publishedTheme.id}/assets.json`, {
        method: 'PUT',
        body: JSON.stringify({
          asset: {
            key: 'templates/index.json',
            value: JSON.stringify(indexJson),
          },
        }),
      });

      const previewUrl = `https://${store_url}/?preview_theme_id=${publishedTheme.id}`;

      return NextResponse.json({
        success: true,
        shop_name: shopName,
        theme_id: publishedTheme.id,
        theme_name: publishedTheme.name,
        preview_url: previewUrl,
        uploaded_images_count: urlMap.size,
        total_images: uniqueSources.length,
        rewritten_slots: rewrites,
      });
    }

    // -----------------------------------------------------------------------
    // Legacy branch: caller supplies { config } (sections + section_order + theme_settings)
    // -----------------------------------------------------------------------
    const { config } = body;
    if (!config) {
      return NextResponse.json(
        { error: 'Missing required field: config (or provide index_json)' },
        { status: 400 },
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
