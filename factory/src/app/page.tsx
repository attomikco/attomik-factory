'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { colors, font, fontWeight, fontSize, spacing, radius, shadow, styles, letterSpacing } from '@/lib/design-tokens';

interface StoreEntry {
  alias: string;
  store_url: string;
  brand_name: string;
  client_id?: string;
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
        style={{ background: colors.paper, borderRadius: radius.xl, padding: spacing[8], width: '100%', maxWidth: 480, boxShadow: shadow.modal }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ ...styles.headingCard, marginBottom: spacing[6] }}>Connect Store</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          <div>
            <label style={{ ...styles.label, display: 'block', marginBottom: spacing[1] }}>Alias</label>
            <input value={alias} onChange={e => setAlias(e.target.value)} placeholder="jolene" style={styles.input} />
            <span style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.subtle, marginTop: 2, display: 'block' }}>Short name used in CLI commands</span>
          </div>
          <div>
            <label style={{ ...styles.label, display: 'block', marginBottom: spacing[1] }}>Shopify Store URL</label>
            <input value={storeUrl} onChange={e => setStoreUrl(e.target.value)} placeholder="xyz.myshopify.com" style={styles.input} />
          </div>
          <div>
            <label style={{ ...styles.label, display: 'block', marginBottom: spacing[1] }}>Brand Name</label>
            <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Jolene Coffee Spice" style={styles.input} />
          </div>
        </div>
        {error && <p style={{ marginTop: spacing[3], fontFamily: font.mono, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[6] }}>
          <button onClick={onClose} style={styles.btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !alias || !storeUrl || !brandName} style={{ ...styles.btnPrimary, opacity: saving || !alias || !storeUrl || !brandName ? 0.4 : 1 }}>
            {saving ? 'Adding...' : 'Add Store'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Output Modal ─────────────────────────────────────────────────────────────

function OutputModal({ title, output, success, onClose }: { title: string; output: string; success: boolean; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{ background: colors.paper, borderRadius: radius.xl, padding: spacing[6], width: '100%', maxWidth: 640, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: shadow.modal }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: success ? colors.success : colors.danger,
            }} />
            <h3 style={{ fontFamily: font.heading, fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold, color: colors.ink }}>
              {title}
            </h3>
          </div>
          <button onClick={onClose} style={{ ...styles.btnGhost, padding: '4px 8px', fontSize: fontSize.xs }}>Close</button>
        </div>
        <pre style={{
          flex: 1, overflow: 'auto', background: colors.ink, color: colors.accent, borderRadius: radius.md,
          padding: spacing[4], fontFamily: font.mono, fontSize: fontSize.xs, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {output || (success ? 'Completed successfully.' : 'No output.')}
        </pre>
      </div>
    </div>
  );
}

// ── Action Button ────────────────────────────────────────────────────────────

function ActionButton({
  label, description, action, alias, variant = 'ghost',
  onResult,
}: {
  label: string; description: string; action: string; alias: string;
  variant?: 'ghost' | 'primary' | 'dark';
  onResult: (title: string, output: string, success: boolean) => void;
}) {
  const [running, setRunning] = useState(false);

  const handleClick = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/stores/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, action }),
      });
      const data = await res.json();
      onResult(
        `${label} — ${alias}`,
        data.output || data.error || 'Done',
        data.success ?? res.ok,
      );
    } catch (err) {
      onResult(`${label} — ${alias}`, err instanceof Error ? err.message : 'Failed', false);
    } finally {
      setRunning(false);
    }
  };

  const btnStyle = variant === 'primary' ? styles.btnPrimary : variant === 'dark' ? styles.btnDark : styles.btnGhost;

  return (
    <button
      onClick={handleClick}
      disabled={running}
      title={description}
      style={{
        ...btnStyle,
        fontSize: fontSize.xs,
        padding: '6px 12px',
        opacity: running ? 0.5 : 1,
        cursor: running ? 'wait' : 'pointer',
        position: 'relative' as const,
      }}
    >
      {running && <span className="spinner spinner-sm" style={{ borderColor: 'rgba(0,0,0,0.15)', borderTopColor: 'currentColor', marginRight: 6 }} />}
      {label}
    </button>
  );
}

// ── Store Card ───────────────────────────────────────────────────────────────

function StoreCard({ store, onResult }: { store: StoreEntry; onResult: (t: string, o: string, s: boolean) => void }) {
  return (
    <div
      style={{
        background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
        padding: spacing[6], boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: spacing[4],
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          {store.client_id ? (
            <Link href={`/stores/${store.client_id}`} style={{ textDecoration: 'none' }}>
              <h3 style={{ fontFamily: font.heading, fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold, color: colors.ink, letterSpacing: letterSpacing.tight, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = colors.accentDark; }}
                onMouseLeave={e => { e.currentTarget.style.color = colors.ink; }}
              >
                {store.brand_name}
              </h3>
            </Link>
          ) : (
            <h3 style={{ fontFamily: font.heading, fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold, color: colors.ink, letterSpacing: letterSpacing.tight }}>
              {store.brand_name}
            </h3>
          )}
          <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 }}>
            {store.store_url}
          </p>
        </div>
        <span style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.subtle, background: colors.cream, padding: '2px 8px', borderRadius: radius.xs }}>
          {store.alias}
        </span>
      </div>

      {/* Push Actions */}
      <div>
        <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: spacing[2] }}>Deploy to Shopify</div>
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <ActionButton
            label="Push Code"
            description="Push sections, snippets, and assets only. Won't overwrite images, copy, or settings you changed in the Shopify builder."
            action="push-code"
            alias={store.alias}
            variant="primary"
            onResult={onResult}
          />
          <ActionButton
            label="Push Full Theme"
            description="Push everything — code, templates, and settings. This WILL overwrite any changes made in the Shopify builder."
            action="push"
            alias={store.alias}
            variant="dark"
            onResult={onResult}
          />
        </div>
      </div>

      {/* Pull Actions */}
      <div>
        <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: spacing[2] }}>Sync from Shopify</div>
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <ActionButton
            label="Pull Settings"
            description="Download settings, templates, and section configs from the store. Use this after customizing in the Shopify builder to save your work locally."
            action="pull-settings"
            alias={store.alias}
            onResult={onResult}
          />
          <ActionButton
            label="Pull Full Theme"
            description="Download the entire theme from Shopify. This will overwrite local code changes."
            action="pull"
            alias={store.alias}
            onResult={onResult}
          />
        </div>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', paddingTop: spacing[2], borderTop: `1px solid ${colors.border}`, alignItems: 'center' }}>
        {store.client_id && (
          <>
            <Link href={`/stores/${store.client_id}`}
              style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.accent, textDecoration: 'none', fontWeight: fontWeight.bold }}
            >Manage</Link>
            <span style={{ color: colors.border }}>·</span>
          </>
        )}
        <a href={`https://${store.store_url}/admin`} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.color = colors.accent; }}
          onMouseLeave={e => { e.currentTarget.style.color = colors.muted; }}
        >Shopify Admin</a>
        <span style={{ color: colors.border }}>·</span>
        <a href={`https://${store.store_url}/admin/themes`} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.color = colors.accent; }}
          onMouseLeave={e => { e.currentTarget.style.color = colors.muted; }}
        >Theme Editor</a>
        <span style={{ color: colors.border }}>·</span>
        <a href={`https://${store.store_url}`} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.color = colors.accent; }}
          onMouseLeave={e => { e.currentTarget.style.color = colors.muted; }}
        >Live Store</a>
      </div>
    </div>
  );
}

// ── Guide Section ────────────────────────────────────────────────────────────

function WorkflowGuide() {
  const steps = [
    {
      title: 'Push Code',
      tag: 'SAFE',
      tagColor: colors.accentLight,
      tagTextColor: '#007a48',
      description: 'Pushes only Liquid code (sections, snippets, assets). Your images, copy, and settings in Shopify stay untouched. Use this after making code changes here.',
    },
    {
      title: 'Push Full Theme',
      tag: 'CAUTION',
      tagColor: colors.warningLight,
      tagTextColor: colors.warning,
      description: 'Pushes everything — code AND settings. This will overwrite any changes you made in the Shopify theme builder. Use this for fresh deployments or after pulling the latest settings.',
    },
    {
      title: 'Pull Settings',
      tag: 'SAFE',
      tagColor: colors.accentLight,
      tagTextColor: '#007a48',
      description: 'Downloads settings, templates, and section configs from Shopify. Use this after customizing in the builder (adding images, changing copy, rearranging blocks) to save your work locally.',
    },
    {
      title: 'Pull Full Theme',
      tag: 'CAUTION',
      tagColor: colors.warningLight,
      tagTextColor: colors.warning,
      description: 'Downloads the entire theme from Shopify. This will overwrite any local code changes you haven\'t committed. Use this to reset your local copy to match the live store.',
    },
  ];

  return (
    <div style={{
      background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
      padding: spacing[6], boxShadow: shadow.card,
    }}>
      <h3 style={{ fontFamily: font.heading, fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold, color: colors.ink, textTransform: 'uppercase', letterSpacing: letterSpacing.tight, marginBottom: spacing[2] }}>
        How It Works
      </h3>
      <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, marginBottom: spacing[5], lineHeight: 1.6 }}>
        Customize content in the Shopify builder (images, copy, settings). Make code changes here (sections, snippets, logic). Use these actions to sync between the two.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {steps.map(step => (
          <div key={step.title} style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-start' }}>
            <span style={{
              flexShrink: 0, padding: '2px 8px', borderRadius: radius.pill,
              fontSize: fontSize['2xs'], fontWeight: fontWeight.bold, fontFamily: font.mono,
              textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
              background: step.tagColor, color: step.tagTextColor,
              marginTop: 2,
            }}>
              {step.tag}
            </span>
            <div>
              <span style={{ fontFamily: font.heading, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink }}>{step.title}</span>
              <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, lineHeight: 1.5, marginTop: 2 }}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: spacing[5], paddingTop: spacing[4], borderTop: `1px solid ${colors.border}` }}>
        <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: spacing[2] }}>Typical Workflow</div>
        <ol style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, lineHeight: 2, paddingLeft: spacing[5], margin: 0 }}>
          <li>Customize content in the Shopify theme builder (images, copy, colors)</li>
          <li>Click <strong style={{ color: colors.ink }}>Pull Settings</strong> to save your work locally</li>
          <li>Make code changes here (new sections, bug fixes, snippets)</li>
          <li>Click <strong style={{ color: colors.ink }}>Push Code</strong> to deploy without overwriting your content</li>
        </ol>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stores, setStores] = useState<StoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [outputModal, setOutputModal] = useState<{ title: string; output: string; success: boolean } | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const [storesRes, clientsRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/clients'),
      ]);
      const storesData = await storesRes.json();
      const clientsData = await clientsRes.json();
      const storeList: StoreEntry[] = storesData.stores || [];
      const clients = clientsData.clients || [];

      // Match stores to Supabase clients by store_url
      const enriched = storeList.map(s => {
        const match = clients.find((c: { store_url: string; id: string }) => c.store_url === s.store_url);
        return { ...s, client_id: match?.id };
      });
      setStores(enriched);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleResult = (title: string, output: string, success: boolean) => {
    setOutputModal({ title, output, success });
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.cream }}>
      {/* Header */}
      <header style={{
        background: colors.paper, borderBottom: `1px solid ${colors.border}`,
        padding: `${spacing[5]}px ${spacing[8]}px`, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[3] }}>
            <h1 style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['3xl'],
              textTransform: 'uppercase', letterSpacing: letterSpacing.wide, color: colors.ink,
            }}>
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

        {/* Two-column layout: stores + guide */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: spacing[6], alignItems: 'start' }}>

          {/* Left: Stores */}
          <div>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[5] }}>
              <div style={{ width: 3, height: 22, borderRadius: 2, background: colors.accent, flexShrink: 0 }} />
              <h2 style={{ fontFamily: font.heading, fontSize: fontSize['4xl'], fontWeight: fontWeight.extrabold, letterSpacing: letterSpacing.tight, color: colors.ink }}>
                Stores
              </h2>
              <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>{stores.length}</span>
              <div style={{ flex: 1, height: 1, background: colors.border }} />
            </div>

            {loading ? (
              <div style={{ padding: `${spacing[16]}px 0`, textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto', marginBottom: spacing[3], borderColor: colors.border, borderTopColor: colors.ink }} />
                <span style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>Loading stores...</span>
              </div>
            ) : stores.length === 0 ? (
              <div style={{
                background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
                padding: `${spacing[12]}px ${spacing[8]}px`, textAlign: 'center', boxShadow: shadow.card,
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                {stores.map(store => (
                  <StoreCard key={store.alias} store={store} onResult={handleResult} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Guide */}
          <div style={{ position: 'sticky', top: 80 }}>
            <WorkflowGuide />
          </div>
        </div>
      </main>

      {showAddModal && <AddStoreModal onClose={() => setShowAddModal(false)} onAdded={fetchStores} />}
      {outputModal && <OutputModal {...outputModal} onClose={() => setOutputModal(null)} />}
    </div>
  );
}
