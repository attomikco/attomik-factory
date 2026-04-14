import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { assertStoreAllowed, normalizeStoreUrl } from '@/lib/deploy-guard';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// CLI-backed theme push
// ---------------------------------------------------------------------------

// process.cwd() is the factory/ package root when Next runs; theme lives one
// level up at attomik-factory/theme.
const THEME_DIR = resolve(process.cwd(), '..', 'theme');
const EXEC_TIMEOUT_MS = 5 * 60 * 1000;

interface DeployBody {
  store_url?: string;
  theme_name?: string;
  theme_id?: number;
  index_json?: Record<string, unknown>;
  settings_data?: Record<string, unknown>;
  product_json?: Record<string, unknown>;
  about_json?: Record<string, unknown>;
  footer_group_json?: Record<string, unknown>;
}

async function writeThemeFile(relPath: string, data: Record<string, unknown>): Promise<void> {
  const absPath = join(THEME_DIR, relPath);
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeployBody;
    const {
      store_url,
      theme_name,
      theme_id,
      index_json,
      settings_data,
      product_json,
      about_json,
      footer_group_json,
    } = body;

    if (!store_url || !theme_name || typeof theme_id !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: store_url, theme_name, theme_id' },
        { status: 400 },
      );
    }

    // Strict store allowlist
    const allowlistError = assertStoreAllowed(store_url);
    if (allowlistError) {
      return NextResponse.json({ error: allowlistError }, { status: 403 });
    }

    const normalizedStore = normalizeStoreUrl(store_url);

    // Write each supplied JSON file to the theme directory and collect the
    // --only arguments so the CLI push only touches files we generated.
    const onlyFiles: string[] = [];

    if (index_json) {
      await writeThemeFile('templates/index.json', index_json);
      onlyFiles.push('templates/index.json');
    }
    if (settings_data) {
      await writeThemeFile('config/settings_data.json', settings_data);
      onlyFiles.push('config/settings_data.json');
    }
    if (product_json) {
      await writeThemeFile('templates/product.json', product_json);
      onlyFiles.push('templates/product.json');
    }
    if (about_json) {
      await writeThemeFile('templates/page.about.json', about_json);
      onlyFiles.push('templates/page.about.json');
    }
    if (footer_group_json) {
      await writeThemeFile('sections/footer-group.json', footer_group_json);
      onlyFiles.push('sections/footer-group.json');
    }

    if (onlyFiles.length === 0) {
      return NextResponse.json({ error: 'No files supplied to push' }, { status: 400 });
    }

    // Build CLI args. Using execFile with an arg array avoids shell
    // interpolation and neutralizes injection risk from store_url / theme_name.
    const args = [
      'theme',
      'push',
      '--store',
      normalizedStore,
      '--theme',
      theme_name,
      '--path',
      THEME_DIR,
      '--nodelete',
    ];
    for (const f of onlyFiles) {
      args.push('--only', f);
    }

    try {
      const { stdout, stderr } = await execFileAsync('shopify', args, {
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
      });
      console.log('[deploy] shopify theme push stdout:\n', stdout.slice(0, 4000));
      if (stderr) console.warn('[deploy] shopify theme push stderr:\n', stderr.slice(0, 2000));
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string; code?: string };
      if (e.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'shopify CLI not found on PATH. Install with `npm i -g @shopify/cli@latest` and restart the dev server.' },
          { status: 500 },
        );
      }
      const detail = (e.stderr || e.stdout || e.message || 'theme push failed').toString();
      console.error('[deploy] shopify theme push failed:', detail);
      return NextResponse.json(
        { error: `shopify theme push failed: ${detail.slice(0, 1500)}` },
        { status: 500 },
      );
    }

    const previewUrl = `https://${normalizedStore}/?preview_theme_id=${theme_id}`;

    return NextResponse.json({
      success: true,
      preview_url: previewUrl,
      theme_id,
      theme_name,
      pushed_files: onlyFiles,
      shop: normalizedStore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deployment failed';
    console.error('[deploy] handler error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
