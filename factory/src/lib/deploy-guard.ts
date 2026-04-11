export function normalizeStoreUrl(raw: string): string {
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
