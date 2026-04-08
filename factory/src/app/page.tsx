'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { colors, font, fontWeight, fontSize, spacing, radius, shadow, styles, letterSpacing } from '@/lib/design-tokens';

interface StoreEntry {
  alias: string;
  store_url: string;
  brand_name: string;
}

interface StoreStatus {
  connected: boolean;
  shop?: { name: string; domain: string; plan: string; currency: string };
  theme?: { id: number; name: string; preview_url: string };
  error?: string;
}

interface StoreWithStatus extends StoreEntry {
  status: StoreStatus | null;
  loading: boolean;
  api_key?: string;
}

// ── Add Store Modal ──────────────────────────────────────────────────────────

function AddStoreModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [alias, setAlias] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [brandName, setBrandName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, store_url: storeUrl, brand_name: brandName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add store');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.paper, borderRadius: radius.xl, padding: spacing[8],
          width: '100%', maxWidth: 480, boxShadow: shadow.modal,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ ...styles.headingCard, marginBottom: spacing[6] }}>Connect Store</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          <div>
            <label style={{ ...styles.label, display: 'block', marginBottom: spacing[1] }}>Alias</label>
            <input
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="jolene"
              style={styles.input}
            />
          </div>
          <div>
            <label style={{ ...styles.label, display: 'block', marginBottom: spacing[1] }}>Shopify Store URL</label>
            <input
              value={storeUrl}
              onChange={e => setStoreUrl(e.target.value)}
              placeholder="xyz.myshopify.com"
              style={styles.input}
            />
          </div>
          <div>
            <label style={{ ...styles.label, display: 'block', marginBottom: spacing[1] }}>Brand Name</label>
            <input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="Jolene Coffee Spice"
              style={styles.input}
            />
          </div>
        </div>

        {error && (
          <p style={{ marginTop: spacing[3], fontFamily: font.mono, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[6] }}>
          <button onClick={onClose} style={styles.btnGhost}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !alias || !storeUrl || !brandName}
            style={{ ...styles.btnPrimary, opacity: saving || !alias || !storeUrl || !brandName ? 0.4 : 1 }}
          >
            {saving ? 'Adding...' : 'Add Store'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Store Card ───────────────────────────────────────────────────────────────

function StoreCard({ store }: { store: StoreWithStatus }) {
  const connected = store.status?.connected;

  return (
    <div
      style={{
        background: colors.paper,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.xl,
        padding: spacing[6],
        boxShadow: shadow.card,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: font.heading, fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold, color: colors.ink, letterSpacing: letterSpacing.tight }}>
            {store.brand_name}
          </h3>
          <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 }}>
            {store.store_url}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          {store.loading ? (
            <div className="spinner spinner-sm" style={{ borderColor: colors.border, borderTopColor: colors.ink }} />
          ) : connected ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: radius.pill,
              fontSize: fontSize.xs, fontWeight: fontWeight.bold, fontFamily: font.mono,
              textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
              background: colors.accentLight, color: '#007a48',
            }}>
              Connected
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: radius.pill,
              fontSize: fontSize.xs, fontWeight: fontWeight.bold, fontFamily: font.mono,
              textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
              background: colors.warningLight, color: colors.warning,
            }}>
              No API Key
            </span>
          )}
        </div>
      </div>

      {/* Shop Info */}
      {store.status?.shop && (
        <div style={{ display: 'flex', gap: spacing[6], fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>
          <span>{store.status.shop.domain}</span>
          <span>{store.status.shop.plan}</span>
          <span>{store.status.shop.currency}</span>
        </div>
      )}

      {/* Theme Info */}
      {store.status?.theme && (
        <div style={{
          background: colors.cream, borderRadius: radius.md, padding: `${spacing[3]}px ${spacing[4]}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ ...styles.label, fontSize: fontSize['2xs'] }}>Active Theme</span>
            <p style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.ink, marginTop: 2 }}>{store.status.theme.name}</p>
          </div>
          <a
            href={store.status.theme.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...styles.btnGhost, fontSize: fontSize.xs, padding: '5px 10px', textDecoration: 'none' }}
          >
            Preview
          </a>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', marginTop: 'auto' }}>
        <a
          href={`https://${store.store_url}/admin`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...styles.btnGhost, fontSize: fontSize.xs, padding: '6px 12px', textDecoration: 'none' }}
        >
          Admin
        </a>
        <a
          href={`https://${store.store_url}/admin/themes`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...styles.btnGhost, fontSize: fontSize.xs, padding: '6px 12px', textDecoration: 'none' }}
        >
          Theme Editor
        </a>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.muted, alignSelf: 'center' }}>
          CLI: ./shopify.sh push {store.alias}
        </span>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stores, setStores] = useState<StoreWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      const storeList: StoreEntry[] = data.stores || [];
      setStores(storeList.map(s => ({ ...s, status: null, loading: false })));
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const stats = {
    total: stores.length,
    connected: stores.filter(s => s.status?.connected).length,
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.cream }}>
      {/* Header */}
      <header
        style={{
          background: colors.paper,
          borderBottom: `1px solid ${colors.border}`,
          padding: `${spacing[5]}px ${spacing[8]}px`,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[3] }}>
            <h1
              style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: fontSize['3xl'],
                textTransform: 'uppercase',
                letterSpacing: letterSpacing.wide,
                color: colors.ink,
              }}
            >
              ATTOMIK FACTORY
            </h1>
            <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>v2.0</span>
          </div>
          <div style={{ display: 'flex', gap: spacing[3] }}>
            <Link href="/clients/new" style={{ ...styles.btnDark, fontSize: fontSize.xs, padding: '8px 16px', textDecoration: 'none' }}>
              + Generate Store
            </Link>
            <button onClick={() => setShowAddModal(true)} style={{ ...styles.btnPrimary, fontSize: fontSize.xs, padding: '8px 16px' }}>
              + Connect Store
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: `${spacing[8]}px ${spacing[8]}px` }}>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[8] }}>
          <div style={{
            background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
            padding: `${spacing[4]}px ${spacing[6]}px`, boxShadow: shadow.card, flex: 1,
            display: 'flex', alignItems: 'center', gap: spacing[4],
          }}>
            <div>
              <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: 4 }}>Stores</div>
              <div style={{ fontFamily: font.heading, fontSize: fontSize['5xl'], fontWeight: fontWeight.extrabold, color: colors.ink, lineHeight: 1 }}>
                {stats.total}
              </div>
            </div>
          </div>
          <div style={{
            background: colors.ink, borderRadius: radius.xl,
            padding: `${spacing[4]}px ${spacing[6]}px`, flex: 1,
            display: 'flex', alignItems: 'center', gap: spacing[4],
          }}>
            <div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: letterSpacing.caps, color: colors.whiteAlpha40, marginBottom: 4 }}>Connected</div>
              <div style={{ fontFamily: font.heading, fontSize: fontSize['5xl'], fontWeight: fontWeight.extrabold, color: colors.accent, lineHeight: 1 }}>
                {stats.connected}
              </div>
            </div>
          </div>
          <div style={{
            background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
            padding: `${spacing[4]}px ${spacing[6]}px`, boxShadow: shadow.card, flex: 2,
            display: 'flex', alignItems: 'center',
          }}>
            <div>
              <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: 4 }}>Quick Commands</div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, lineHeight: 1.8 }}>
                <code>./shopify.sh push-code jolene</code> — push code without overwriting content<br />
                <code>./shopify.sh pull-settings jolene</code> — save builder changes locally
              </div>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[5] }}>
          <div style={{ width: 3, height: 22, borderRadius: 2, background: colors.accent, flexShrink: 0 }} />
          <h2 style={{ fontFamily: font.heading, fontSize: fontSize['4xl'], fontWeight: fontWeight.extrabold, letterSpacing: letterSpacing.tight, color: colors.ink }}>
            Connected Stores
          </h2>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
        </div>

        {/* Store Grid */}
        {loading ? (
          <div style={{ padding: `${spacing[16]}px 0`, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto', marginBottom: spacing[3], borderColor: colors.border, borderTopColor: colors.ink }} />
            <span style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>Loading stores...</span>
          </div>
        ) : stores.length === 0 ? (
          <div style={{
            background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
            padding: `${spacing[16]}px ${spacing[8]}px`, textAlign: 'center', boxShadow: shadow.card,
          }}>
            <p style={{ fontFamily: font.heading, fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold, color: colors.ink, textTransform: 'uppercase', marginBottom: spacing[2] }}>
              No stores connected
            </p>
            <p style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Generate a new store or connect an existing Shopify store to manage it from here.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: spacing[3], marginTop: spacing[6] }}>
              <Link href="/clients/new" style={{ ...styles.btnDark, textDecoration: 'none' }}>Generate Store</Link>
              <button onClick={() => setShowAddModal(true)} style={styles.btnPrimary}>Connect Store</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: spacing[4] }}>
            {stores.map(store => (
              <StoreCard key={store.alias} store={store} />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddStoreModal
          onClose={() => setShowAddModal(false)}
          onAdded={fetchStores}
        />
      )}
    </div>
  );
}
