import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';

const execFileAsync = promisify(execFile);

const STORES_FILE = join(process.cwd(), '..', 'stores.json');

interface StoreEntry {
  alias: string;
  store_url: string;
  brand_name: string;
}

interface RawTheme {
  id: number | string;
  name: string;
  role: string;
}

async function loadStores(): Promise<StoreEntry[]> {
  try {
    const raw = await readFile(STORES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { alias } = await request.json();
    if (!alias) {
      return NextResponse.json({ error: 'Missing alias' }, { status: 400 });
    }

    const stores = await loadStores();
    const store = stores.find(s => s.alias === alias);
    if (!store) {
      return NextResponse.json({ error: `Store "${alias}" not found` }, { status: 404 });
    }

    try {
      const { stdout } = await execFileAsync(
        'shopify',
        ['theme', 'list', '--store', store.store_url, '--json'],
        { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 },
      );

      const jsonStart = stdout.indexOf('[');
      const jsonEnd = stdout.lastIndexOf(']');
      if (jsonStart < 0 || jsonEnd < 0 || jsonEnd < jsonStart) {
        return NextResponse.json(
          { error: 'shopify theme list did not return JSON', raw: stdout.slice(0, 1000) },
          { status: 500 },
        );
      }

      const raw: RawTheme[] = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
      const themes = raw.map(t => ({
        id: typeof t.id === 'string' ? Number(t.id) : t.id,
        name: t.name,
        role: t.role,
      }));

      return NextResponse.json({ themes, store_url: store.store_url });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string; code?: string };
      if (e.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'shopify CLI not found on PATH. Install with `npm i -g @shopify/cli@latest` and restart the dev server.' },
          { status: 500 },
        );
      }
      const detail = (e.stderr || e.stdout || e.message || 'theme list failed').toString();
      console.error('[stores/themes] shopify theme list failed:', detail);
      return NextResponse.json(
        { error: `shopify theme list failed: ${detail.slice(0, 1500)}` },
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list themes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
