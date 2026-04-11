'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { colors, font, fontWeight, fontSize, spacing, radius, shadow, styles, letterSpacing } from '@/lib/design-tokens';
import type { Client, GeneratedConfig, ColorVariant } from '@/lib/types';

const COLOR_TOKENS = [
  { key: 'color_background_body', label: 'Body' },
  { key: 'color_foreground_body', label: 'Text' },
  { key: 'color_foreground_body_alt', label: 'Alt Text' },
  { key: 'color_background_primary', label: 'Primary BG' },
  { key: 'color_foreground_primary', label: 'Primary FG' },
  { key: 'color_background_secondary', label: 'Secondary BG' },
  { key: 'color_foreground_secondary', label: 'Secondary FG' },
  { key: 'color_background_tertiary', label: 'Tertiary BG' },
  { key: 'color_foreground_tertiary', label: 'Tertiary FG' },
  { key: 'color_bar', label: 'Mobile Bar' },
] as const;

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: spacing[8] }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: colors.accent, flexShrink: 0 }} />
        <h3 style={{ fontFamily: font.heading, fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold, letterSpacing: letterSpacing.tight, color: colors.ink, textTransform: 'uppercase' }}>
          {title}
        </h3>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
      </div>
      {children}
    </div>
  );
}

// ── Color Scheme Panel ───────────────────────────────────────────────────────

function ColorSchemePanel({ variants, selected }: { variants: ColorVariant[]; selected: number }) {
  const variant = variants[selected];
  if (!variant) return null;

  return (
    <div style={{ background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: spacing[5], boxShadow: shadow.card }}>
      {/* Variant tabs */}
      <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4] }}>
        {variants.map((v, i) => (
          <div
            key={v.name}
            style={{
              padding: `${spacing[1]}px ${spacing[3]}px`,
              borderRadius: radius.xs,
              fontFamily: font.heading,
              fontSize: fontSize['2xs'],
              textTransform: 'uppercase',
              letterSpacing: letterSpacing.wider,
              background: i === selected ? colors.ink : colors.cream,
              color: i === selected ? colors.accent : colors.muted,
              fontWeight: i === selected ? fontWeight.bold : fontWeight.normal,
            }}
          >
            {v.name.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Color swatches */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: `${spacing[2]}px ${spacing[4]}px` }}>
        {COLOR_TOKENS.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <div style={{
              width: 24, height: 24, borderRadius: 3,
              backgroundColor: variant.theme_settings[key] || '#000',
              border: `1px solid ${colors.border}`,
              flexShrink: 0,
            }} />
            <span style={{ fontFamily: font.heading, fontSize: fontSize['2xs'], color: colors.muted }}>{label}</span>
            <span style={{ marginLeft: 'auto', fontFamily: font.heading, fontSize: fontSize['2xs'], color: colors.subtle }}>
              {variant.theme_settings[key] || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Copy Preview ─────────────────────────────────────────────────────────────

function CopyPreview({ config }: { config: GeneratedConfig }) {
  const sections = (config.index_json as { sections?: Record<string, Record<string, unknown>> })?.sections || {};

  const items: { label: string; value: string }[] = [];

  for (const sec of Object.values(sections)) {
    const sType = sec.type as string;
    const blocks = (sec.blocks || {}) as Record<string, { type: string; settings: Record<string, string> }>;

    if (sType === 'banner') {
      for (const b of Object.values(blocks)) {
        if (b.type === 'heading' && b.settings?.content) items.push({ label: 'Hero Headline', value: b.settings.content });
        if (b.type === 'content' && b.settings?.content) items.push({ label: 'Hero Subtext', value: b.settings.content.replace(/<[^>]+>/g, '') });
      }
    }
    if (sType === 'marquee') {
      const tickers: string[] = [];
      for (const b of Object.values(blocks)) {
        if (b.type === 'heading' && b.settings?.content && b.settings.content !== '✦') tickers.push(b.settings.content);
      }
      if (tickers.length > 0) items.push({ label: 'Ticker', value: tickers.join(' · ') });
    }
    if (sType === 'icon-grid') {
      const pillars: string[] = [];
      for (const b of Object.values(blocks)) {
        if (b.type === 'icon' && b.settings?.heading) pillars.push(b.settings.heading);
      }
      if (pillars.length > 0) items.push({ label: 'Pillars', value: pillars.join(' · ') });
    }
  }

  // PDP copy
  if (config.product_json) {
    const pdpSections = (config.product_json as { sections?: Record<string, Record<string, unknown>> })?.sections || {};
    for (const sec of Object.values(pdpSections)) {
      const blocks = (sec.blocks || {}) as Record<string, { type: string; settings: Record<string, string> }>;
      for (const b of Object.values(blocks)) {
        if (b.type === 'badge' && b.settings?.badge_text) items.push({ label: 'PDP Badge', value: b.settings.badge_text });
        if (b.type === 'checklist') {
          const checks: string[] = [];
          for (let i = 1; i <= 5; i++) {
            if (b.settings?.[`item_${i}`]) checks.push(b.settings[`item_${i}`]);
          }
          if (checks.length > 0) items.push({ label: 'Checklist', value: checks.join(' · ') });
        }
      }
    }
  }

  if (items.length === 0) return <p style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.muted }}>No copy preview available</p>;

  return (
    <div style={{ background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl, boxShadow: shadow.card, overflow: 'hidden' }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            padding: `${spacing[3]}px ${spacing[5]}px`,
            borderBottom: i < items.length - 1 ? `1px solid ${colors.cream}` : 'none',
            display: 'flex',
            gap: spacing[4],
          }}
        >
          <span style={{ ...styles.label, fontSize: fontSize['2xs'], minWidth: 80, flexShrink: 0, paddingTop: 2 }}>{item.label}</span>
          <span style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.ink, lineHeight: 1.5 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Action Button ────────────────────────────────────────────────────────────

interface ThemeOption {
  id: number;
  name: string;
  role: string;
}

interface ThemeColor {
  key: string;
  label: string;
  hex: string | null;
}

function ActionButton({ label, action, alias, themeId, disabled, disabledReason, variant = 'ghost', onResult }: {
  label: string; action: string; alias: string;
  themeId: number | null;
  disabled?: boolean;
  disabledReason?: string | null;
  variant?: 'ghost' | 'primary' | 'dark';
  onResult: (output: string, success: boolean) => void;
}) {
  const [running, setRunning] = useState(false);
  const blocked = disabled || themeId === null;

  const handleClick = async () => {
    if (blocked || themeId === null) return;
    setRunning(true);
    try {
      const res = await fetch('/api/stores/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, action, theme_id: themeId }),
      });
      const data = await res.json();
      onResult(data.output || data.error || 'Done', data.success ?? res.ok);
    } catch (err) {
      onResult(err instanceof Error ? err.message : 'Failed', false);
    } finally {
      setRunning(false);
    }
  };

  const btnStyle = variant === 'primary' ? styles.btnPrimary : variant === 'dark' ? styles.btnDark : styles.btnGhost;
  const effectiveCursor = running ? 'wait' : blocked ? 'not-allowed' : 'pointer';
  const effectiveOpacity = running ? 0.5 : blocked ? 0.35 : 1;

  return (
    <button
      onClick={handleClick}
      disabled={running || blocked}
      title={blocked ? (disabledReason || 'Select a theme first') : undefined}
      style={{ ...btnStyle, fontSize: fontSize.xs, padding: '8px 14px', opacity: effectiveOpacity, cursor: effectiveCursor }}
    >
      {running && <span className="spinner spinner-sm" style={{ borderColor: 'rgba(0,0,0,0.15)', borderTopColor: 'currentColor', marginRight: 6 }} />}
      {label}
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function StoreDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [config, setConfig] = useState<GeneratedConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState<{ text: string; success: boolean } | null>(null);
  const [storeAlias, setStoreAlias] = useState<string>('');

  // Shared theme picker state for action buttons
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [themeListError, setThemeListError] = useState<string | null>(null);

  // Current theme colors from pulled settings_data.json
  const [themeColors, setThemeColors] = useState<ThemeColor[]>([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [colorsError, setColorsError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load client
        const clientsRes = await fetch('/api/clients');
        const clientsData = await clientsRes.json();
        const found = (clientsData.clients || []).find((c: Client) => c.id === clientId);
        if (found) {
          setClient(found);
          // Find alias from stores.json
          const storesRes = await fetch('/api/stores');
          const storesData = await storesRes.json();
          const storeMatch = (storesData.stores || []).find((s: { store_url: string; alias: string }) => s.store_url === found.store_url);
          if (storeMatch) setStoreAlias(storeMatch.alias);
        }

        // Load config
        const configRes = await fetch(`/api/clients/config?client_id=${clientId}`);
        const configData = await configRes.json();
        if (configData.config?.config) {
          setConfig(configData.config.config);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  useEffect(() => {
    if (!storeAlias) return;
    let cancelled = false;
    async function loadThemes() {
      setLoadingThemes(true);
      setThemeListError(null);
      try {
        const res = await fetch('/api/stores/themes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alias: storeAlias }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Failed to load themes');
        const list: ThemeOption[] = data.themes || [];
        setThemes(list);
        // Auto-select the development theme if present, otherwise first non-main, otherwise nothing.
        const dev = list.find(t => t.role === 'development');
        const unpub = list.find(t => t.role === 'unpublished');
        const firstSafe = list.find(t => t.role !== 'main');
        setSelectedThemeId(dev?.id ?? unpub?.id ?? firstSafe?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setThemeListError(err instanceof Error ? err.message : 'Failed to load themes');
        setThemes([]);
        setSelectedThemeId(null);
      } finally {
        if (!cancelled) setLoadingThemes(false);
      }
    }
    loadThemes();
    return () => { cancelled = true; };
  }, [storeAlias]);

  const loadColors = async () => {
    if (!storeAlias) return;
    setLoadingColors(true);
    setColorsError(null);
    try {
      const res = await fetch('/api/stores/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: storeAlias }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to read colors');
      setThemeColors(data.colors || []);
    } catch (err) {
      setColorsError(err instanceof Error ? err.message : 'Failed to read colors');
      setThemeColors([]);
    } finally {
      setLoadingColors(false);
    }
  };

  useEffect(() => {
    if (!storeAlias) return;
    loadColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeAlias]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto', marginBottom: spacing[3], borderColor: colors.border, borderTopColor: colors.ink }} />
          <span style={{ fontFamily: font.heading, fontSize: fontSize.sm, color: colors.muted }}>Loading store...</span>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', background: colors.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: font.heading, fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold, color: colors.ink, textTransform: 'uppercase' }}>Store not found</p>
          <Link href="/" style={{ ...styles.btnGhost, marginTop: spacing[4], textDecoration: 'none', display: 'inline-flex' }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.cream }}>
      {/* Header */}
      <header style={{
        background: colors.paper, borderBottom: `1px solid ${colors.border}`,
        padding: `${spacing[5]}px ${spacing[8]}px`, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
            <Link href="/" style={{ fontFamily: font.heading, fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.muted, textDecoration: 'none' }}>
              &larr; Dashboard
            </Link>
            <div style={{ width: 1, height: 20, background: colors.border }} />
            <h1 style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['3xl'], textTransform: 'uppercase', letterSpacing: letterSpacing.tight, color: colors.ink }}>
              {client.brand_name}
            </h1>
            {storeAlias && (
              <span style={{ fontFamily: font.heading, fontSize: fontSize['2xs'], color: colors.subtle, background: colors.cream, padding: '2px 8px', borderRadius: radius.xs }}>
                {storeAlias}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            {client.store_url && (
              <>
                <a href={`https://${client.store_url}`} target="_blank" rel="noopener noreferrer" style={{ ...styles.btnGhost, fontSize: fontSize.xs, padding: '6px 12px', textDecoration: 'none' }}>
                  Live Store
                </a>
                <a href={`https://${client.store_url}/admin/themes`} target="_blank" rel="noopener noreferrer" style={{ ...styles.btnGhost, fontSize: fontSize.xs, padding: '6px 12px', textDecoration: 'none' }}>
                  Theme Editor
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: `${spacing[8]}px ${spacing[8]}px` }}>

        {/* Store Info */}
        <div style={{
          background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
          padding: spacing[6], boxShadow: shadow.card, marginBottom: spacing[8],
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[6],
        }}>
          <div>
            <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: 4 }}>Status</div>
            <span className={`badge badge-${client.status === 'deployed' ? 'green' : client.status === 'pitched' ? 'yellow' : 'gray'}`}>
              {client.status}
            </span>
          </div>
          <div>
            <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: 4 }}>Store URL</div>
            <p style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.ink }}>{client.store_url || '—'}</p>
          </div>
          <div>
            <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: 4 }}>Category</div>
            <p style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.ink }}>{config?.brief?.category || '—'}</p>
          </div>
          <div>
            <div style={{ ...styles.label, fontSize: fontSize['2xs'], marginBottom: 4 }}>Created</div>
            <p style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.ink }}>
              {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Actions */}
        {storeAlias && (() => {
          const selectedTheme = themes.find(t => t.id === selectedThemeId) || null;
          const themeBlockedReason = (() => {
            if (loadingThemes) return 'Loading themes…';
            if (themeListError) return themeListError;
            if (themes.length === 0) return 'No themes found on this store';
            if (!selectedTheme) return 'Select a target theme';
            if (selectedTheme.role === 'main') return 'Refusing to target the live published theme';
            return null;
          })();

          return (
          <Section title="Actions">
            <div style={{
              background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
              padding: spacing[5], boxShadow: shadow.card,
            }}>
              {/* Target theme picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
                <span style={{ fontFamily: font.heading, fontSize: fontSize['2xs'], textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.muted }}>
                  Target theme
                </span>
                <select
                  value={selectedThemeId ?? ''}
                  onChange={(e) => setSelectedThemeId(e.target.value ? Number(e.target.value) : null)}
                  disabled={loadingThemes || themes.length === 0}
                  style={{
                    padding: `${spacing[2]}px ${spacing[3]}px`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm,
                    background: colors.cream,
                    fontFamily: font.heading,
                    fontSize: fontSize.xs,
                    color: colors.ink,
                    minWidth: 260,
                  }}
                >
                  {loadingThemes && <option value="">Loading…</option>}
                  {!loadingThemes && themes.length === 0 && <option value="">(no themes)</option>}
                  {!loadingThemes && themes.length > 0 && <option value="">— choose —</option>}
                  {themes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.role === 'main' ? '⚠ LIVE' : `(${t.role})`}
                    </option>
                  ))}
                </select>
                {themeBlockedReason && (
                  <span style={{ fontFamily: font.heading, fontSize: fontSize['2xs'], color: selectedTheme?.role === 'main' ? '#c93030' : colors.muted }}>
                    {themeBlockedReason}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
                <ActionButton label="Push Code" action="push-code" alias={storeAlias} themeId={selectedThemeId} disabled={!!themeBlockedReason} disabledReason={themeBlockedReason} variant="primary" onResult={(text, success) => setOutput({ text, success })} />
                <ActionButton label="Push Full Theme" action="push" alias={storeAlias} themeId={selectedThemeId} disabled={!!themeBlockedReason} disabledReason={themeBlockedReason} variant="dark" onResult={(text, success) => setOutput({ text, success })} />
                <ActionButton label="Pull Settings" action="pull-settings" alias={storeAlias} themeId={selectedThemeId} disabled={!!themeBlockedReason} disabledReason={themeBlockedReason} onResult={(text, success) => setOutput({ text, success })} />
                <ActionButton label="Pull Full Theme" action="pull" alias={storeAlias} themeId={selectedThemeId} disabled={!!themeBlockedReason} disabledReason={themeBlockedReason} onResult={(text, success) => setOutput({ text, success })} />
              </div>
            </div>

            {output && (
              <pre style={{
                marginTop: spacing[3], background: colors.ink, color: output.success ? colors.accent : colors.dangerSoft,
                borderRadius: radius.md, padding: spacing[4], fontFamily: font.heading, fontSize: fontSize.xs,
                lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto',
              }}>
                {output.text}
              </pre>
            )}
          </Section>
          );
        })()}

        {/* Current Theme Colors */}
        {storeAlias && (
          <Section title="Current Theme Colors">
            <div style={{
              background: colors.ink,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.xl,
              padding: spacing[5],
              boxShadow: shadow.card,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
                <span style={{ fontFamily: font.heading, fontSize: fontSize['2xs'], textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.muted }}>
                  Pulled from theme/config/settings_data.json
                </span>
                <button
                  type="button"
                  onClick={loadColors}
                  disabled={loadingColors}
                  style={{
                    ...styles.btnGhost,
                    fontFamily: font.heading,
                    fontSize: fontSize['2xs'],
                    padding: '6px 12px',
                    color: colors.paper,
                    borderColor: colors.muted,
                    opacity: loadingColors ? 0.4 : 1,
                    cursor: loadingColors ? 'wait' : 'pointer',
                  }}
                >
                  {loadingColors ? 'Refreshing…' : 'Refresh Colors'}
                </button>
              </div>

              {colorsError && (
                <div style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.dangerSoft, marginBottom: spacing[3] }}>
                  {colorsError}
                </div>
              )}

              {!loadingColors && !colorsError && themeColors.length === 0 && (
                <div style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.muted }}>
                  No colors loaded. Run Pull Settings first.
                </div>
              )}

              {themeColors.length > 0 && (
                <div style={{ display: 'flex', gap: spacing[4], alignItems: 'center', flexWrap: 'wrap' }}>
                  {themeColors.map(c => (
                    <div
                      key={c.key}
                      title={`${c.label} — ${c.hex || '(unset)'}`}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing[2] }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: c.hex || 'transparent',
                          border: `1px solid ${c.hex ? 'rgba(255,255,255,0.2)' : colors.dangerSoft}`,
                          boxShadow: c.hex ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
                        }}
                      />
                      <span style={{ fontFamily: font.heading, fontSize: 9, textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.muted }}>
                        {c.hex || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {config ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[6] }}>
            {/* Left Column */}
            <div>
              {/* Brief */}
              <Section title="Brand Brief">
                <div style={{
                  background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
                  boxShadow: shadow.card, overflow: 'hidden',
                }}>
                  {[
                    { label: 'One-Liner', value: config.brief?.one_liner },
                    { label: 'Audience', value: config.brief?.target_audience },
                    { label: 'Vibe', value: config.brief?.brand_vibe?.join(', ') },
                  ].filter(r => r.value).map((row, i) => (
                    <div key={i} style={{ padding: `${spacing[3]}px ${spacing[5]}px`, borderBottom: `1px solid ${colors.cream}`, display: 'flex', gap: spacing[4] }}>
                      <span style={{ ...styles.label, fontSize: fontSize['2xs'], minWidth: 70, flexShrink: 0, paddingTop: 2 }}>{row.label}</span>
                      <span style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.ink, lineHeight: 1.5 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Color Scheme */}
              <Section title="Color Scheme">
                <ColorSchemePanel variants={config.color_variants} selected={config.selected_variant || 0} />
              </Section>
            </div>

            {/* Right Column */}
            <div>
              {/* Generated Copy */}
              <Section title="Generated Copy">
                <CopyPreview config={config} />
              </Section>

              {/* Templates */}
              <Section title="Templates">
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                  {[
                    { label: 'Homepage', key: 'index_json', data: config.index_json },
                    { label: 'Product Page', key: 'product_json', data: config.product_json },
                    { label: 'About Page', key: 'about_json', data: config.about_json },
                  ].map(tpl => (
                    <div key={tpl.key} style={{
                      background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.md,
                      padding: `${spacing[3]}px ${spacing[4]}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: tpl.data ? colors.success : colors.disabled,
                        }} />
                        <span style={{ fontFamily: font.heading, fontSize: fontSize.xs, color: colors.ink }}>{tpl.label}</span>
                      </div>
                      {tpl.data && (
                        <button
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(tpl.data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${tpl.key.replace('_json', '')}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          style={{ ...styles.btnGhost, fontSize: fontSize['2xs'], padding: '3px 8px' }}
                        >
                          Download
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        ) : (
          <div style={{
            background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl,
            padding: `${spacing[12]}px ${spacing[8]}px`, textAlign: 'center', boxShadow: shadow.card,
          }}>
            <p style={{ fontFamily: font.heading, fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold, color: colors.ink, textTransform: 'uppercase', marginBottom: spacing[2] }}>
              No config generated yet
            </p>
            <p style={{ fontFamily: font.heading, fontSize: fontSize.sm, color: colors.muted, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Generate a store configuration to see colors, copy, and templates here.
            </p>
            <Link href="/clients/new" style={{ ...styles.btnPrimary, marginTop: spacing[6], textDecoration: 'none', display: 'inline-flex' }}>
              Generate Store
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
