import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const STORES_FILE = join(process.cwd(), '..', 'stores.json');

interface StoreEntry {
  alias: string;
  store_url: string;
  brand_name: string;
}

async function loadStores(): Promise<StoreEntry[]> {
  try {
    const raw = await readFile(STORES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveStores(stores: StoreEntry[]) {
  await writeFile(STORES_FILE, JSON.stringify(stores, null, 2));
}

// GET — list all stores
export async function GET() {
  const stores = await loadStores();
  return NextResponse.json({ stores });
}

// POST — add a store
export async function POST(request: NextRequest) {
  const { alias, store_url, brand_name } = await request.json();

  if (!alias || !store_url || !brand_name) {
    return NextResponse.json(
      { error: 'Missing required fields: alias, store_url, brand_name' },
      { status: 400 },
    );
  }

  const stores = await loadStores();
  const exists = stores.find(s => s.alias === alias);
  if (exists) {
    return NextResponse.json(
      { error: `Store alias "${alias}" already exists` },
      { status: 409 },
    );
  }

  stores.push({ alias, store_url, brand_name });
  await saveStores(stores);

  return NextResponse.json({ success: true, store: { alias, store_url, brand_name } });
}

// DELETE — remove a store
export async function DELETE(request: NextRequest) {
  const { alias } = await request.json();

  if (!alias) {
    return NextResponse.json({ error: 'Missing alias' }, { status: 400 });
  }

  const stores = await loadStores();
  const filtered = stores.filter(s => s.alias !== alias);

  if (filtered.length === stores.length) {
    return NextResponse.json({ error: `Store "${alias}" not found` }, { status: 404 });
  }

  await saveStores(filtered);
  return NextResponse.json({ success: true });
}
