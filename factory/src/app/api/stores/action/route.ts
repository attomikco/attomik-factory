import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';

const exec = promisify(execFile);

const STORES_FILE = join(process.cwd(), '..', 'stores.json');
const THEME_PATH = join(process.cwd(), '..', 'theme');

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

type ActionType = 'push' | 'push-code' | 'pull-settings' | 'pull' | 'push-template';

const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  'push': 'Push full theme (all files)',
  'push-code': 'Push code only (sections, snippets, assets — safe for builder)',
  'pull-settings': 'Pull settings + templates from Shopify',
  'pull': 'Pull full theme from Shopify',
  'push-template': 'Push a specific template + code',
};

function buildArgs(action: ActionType, storeUrl: string, template?: string): string[] {
  const base = ['theme'];

  switch (action) {
    case 'push':
      return [...base, 'push', '--store', storeUrl, '--path', THEME_PATH, '--force'];

    case 'push-code':
      return [...base, 'push', '--store', storeUrl, '--path', THEME_PATH, '--force',
        '--only', 'sections/*.liquid',
        '--only', 'snippets/*',
        '--only', 'assets/*',
        '--only', 'layout/*',
      ];

    case 'pull-settings':
      return [...base, 'pull', '--store', storeUrl, '--path', THEME_PATH, '--force',
        '--only', 'config/settings_data.json',
        '--only', 'templates/*',
        '--only', 'sections/*-group.json',
      ];

    case 'pull':
      return [...base, 'pull', '--store', storeUrl, '--path', THEME_PATH, '--force'];

    case 'push-template':
      if (!template) throw new Error('Template name required for push-template');
      return [...base, 'push', '--store', storeUrl, '--path', THEME_PATH, '--force',
        '--only', `templates/${template}`,
        '--only', 'sections/*.liquid',
        '--only', 'snippets/*',
      ];

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { alias, action, template } = await request.json();

    if (!alias || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: alias, action' },
        { status: 400 },
      );
    }

    const validActions: ActionType[] = ['push', 'push-code', 'pull-settings', 'pull', 'push-template'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid actions: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    const stores = await loadStores();
    const store = stores.find(s => s.alias === alias);
    if (!store) {
      return NextResponse.json(
        { error: `Store "${alias}" not found` },
        { status: 404 },
      );
    }

    const args = buildArgs(action as ActionType, store.store_url, template);
    const description = ACTION_DESCRIPTIONS[action as ActionType];

    console.log(`[Action] ${description} → ${store.store_url}`);
    console.log(`[Action] shopify ${args.join(' ')}`);

    const { stdout, stderr } = await exec('shopify', args, {
      timeout: 120000,
      env: { ...process.env, SHOPIFY_FLAG_STORE: store.store_url },
    });

    const output = [stdout, stderr].filter(Boolean).join('\n').trim();

    return NextResponse.json({
      success: true,
      action,
      alias,
      description,
      output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed';

    // Extract stdout/stderr from exec errors
    const execError = error as { stdout?: string; stderr?: string };
    const output = [execError.stdout, execError.stderr].filter(Boolean).join('\n').trim();

    return NextResponse.json({
      success: false,
      error: message,
      output: output || undefined,
    }, { status: 500 });
  }
}
