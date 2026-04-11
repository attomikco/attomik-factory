import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { assertStoreAllowed, normalizeStoreUrl } from '../route';

const execFileAsync = promisify(execFile);

interface RawTheme {
  id: number | string;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const { store_url } = await request.json();
    if (!store_url) {
      return NextResponse.json({ error: 'Missing store_url' }, { status: 400 });
    }

    const allowlistError = assertStoreAllowed(store_url);
    if (allowlistError) {
      return NextResponse.json({ error: allowlistError }, { status: 403 });
    }

    const normalized = normalizeStoreUrl(store_url);

    try {
      const { stdout } = await execFileAsync(
        'shopify',
        ['theme', 'list', '--store', normalized, '--json'],
        { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 },
      );

      // The CLI may print a banner / update-available notice before the JSON.
      // Extract the first top-level array.
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

      return NextResponse.json({ themes });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string; code?: string };
      if (e.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'shopify CLI not found on PATH. Install with `npm i -g @shopify/cli@latest` and restart the dev server.' },
          { status: 500 },
        );
      }
      const detail = (e.stderr || e.stdout || e.message || 'theme list failed').toString();
      console.error('[deploy/themes] shopify theme list failed:', detail);
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
