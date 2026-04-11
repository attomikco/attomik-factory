import { NextRequest, NextResponse } from 'next/server';
import { assertStoreAllowed } from '../route';

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

interface ShopifyTheme {
  id: number;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const { store_url, api_key } = await request.json();
    if (!store_url || !api_key) {
      return NextResponse.json({ error: 'Missing store_url or api_key' }, { status: 400 });
    }

    const allowlistError = assertStoreAllowed(store_url);
    if (allowlistError) {
      return NextResponse.json({ error: allowlistError }, { status: 403 });
    }

    const normalized = store_url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const res = await fetch(`https://${normalized}/admin/api/${API_VERSION}/themes.json`, {
      headers: {
        'X-Shopify-Access-Token': api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Shopify API ${res.status}: ${body}` }, { status: res.status });
    }

    const data = await res.json();
    const themes: ShopifyTheme[] = (data.themes || []).map((t: ShopifyTheme) => ({
      id: t.id,
      name: t.name,
      role: t.role,
    }));

    return NextResponse.json({ themes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list themes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
