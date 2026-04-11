import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const SETTINGS_FILE = join(process.cwd(), '..', 'theme', 'config', 'settings_data.json');

const COLOR_KEYS: { key: string; label: string }[] = [
  { key: 'color_background_body', label: 'Body Background' },
  { key: 'color_foreground_body', label: 'Body Text' },
  { key: 'color_background_primary', label: 'Primary Background' },
  { key: 'color_foreground_primary', label: 'Primary Text' },
  { key: 'color_background_secondary', label: 'Secondary Background' },
  { key: 'color_foreground_secondary', label: 'Secondary Text' },
  { key: 'color_background_tertiary', label: 'Tertiary Background' },
  { key: 'color_foreground_tertiary', label: 'Tertiary Text' },
];

export async function POST(request: NextRequest) {
  try {
    const { alias } = await request.json();
    if (!alias) {
      return NextResponse.json({ error: 'Missing alias' }, { status: 400 });
    }

    let raw: string;
    try {
      raw = await readFile(SETTINGS_FILE, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Could not read settings_data.json — run Pull Settings first. (${message})` },
        { status: 404 },
      );
    }

    // Shopify prepends a /* */ header comment; strip before parsing.
    const stripped = raw.replace(/^\s*\/\*[\s\S]*?\*\//, '');
    let parsed: { current?: Record<string, unknown> };
    try {
      parsed = JSON.parse(stripped);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Could not parse settings_data.json: ${message}` },
        { status: 500 },
      );
    }

    const current = parsed.current || {};
    const colors = COLOR_KEYS.map(({ key, label }) => ({
      key,
      label,
      hex: typeof current[key] === 'string' ? (current[key] as string) : null,
    }));

    return NextResponse.json({ alias, colors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
