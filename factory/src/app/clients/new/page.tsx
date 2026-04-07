'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { colors, font, fontWeight, fontSize, spacing, radius, transition, styles, letterSpacing } from '@/lib/design-tokens';

const CATEGORIES = ['Beverage', 'Skincare', 'Food', 'Supplement', 'Other'] as const;
const VIBES = ['Premium', 'Playful', 'Clinical', 'Earthy', 'Bold', 'Minimal', 'Luxe', 'Raw'] as const;

interface ScrapedBrand {
  name: string;
  colors: string[];
  fonts: string[];
  logo: string | null;
  images: { url: string; tag: string }[];
  products: { title: string; description: string; image: string | null }[];
  platform: string | null;
  url: string;
}

interface ColorVariant {
  name: string;
  theme_settings: Record<string, string>;
}

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

interface BrandBrief {
  brand_name: string;
  one_liner: string;
  category: string;
  website: string;
  store_url: string;
  api_key: string;
  target_audience: string;
  brand_vibe: string[];
  competitors: string;
  differentiators: string;
  primary_color: string;
  secondary_color: string;
  notes: string;
  scraped_brand: ScrapedBrand | null;
}

const INITIAL: BrandBrief = {
  brand_name: '', one_liner: '', category: '', website: '',
  store_url: '', api_key: '', target_audience: '', brand_vibe: [],
  competitors: '', differentiators: '', primary_color: '#000000',
  secondary_color: '#2c2c2c', notes: '', scraped_brand: null,
};

// ── Style helpers ───────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  ...styles.label,
  display: 'block',
  marginBottom: spacing[1],
};

const inputStyle: React.CSSProperties = {
  ...styles.input,
};

// ── Utility components ──────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const labels = ['Scan', 'Brief', 'Results'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const isActive = n === current;
        const isDone = n < current;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: font.mono,
                fontSize: fontSize.xs,
                border: `1px solid ${isActive ? colors.accent : isDone ? colors.borderStrong : colors.border}`,
                color: isActive ? colors.accent : isDone ? colors.borderStrong : colors.muted,
                borderRadius: radius.xs,
              }}
            >
              {n}
            </div>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: letterSpacing.wider,
                color: isActive ? colors.accent : colors.muted,
              }}
            >
              {label}
            </span>
            {n < 3 && (
              <div style={{ width: 32, height: 1, background: colors.border, margin: `0 ${spacing[2]}px` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function TextArea({ id, value, onChange, placeholder, rows = 3 }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'none' as const }}
    />
  );
}

function download(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function NewClientPage() {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState<BrandBrief>(INITIAL);
  const [scanUrl, setScanUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const genStartRef = useRef(0);

  // Results
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [indexJson, setIndexJson] = useState<Record<string, unknown> | null>(null);
  const [productJson, setProductJson] = useState<Record<string, unknown> | null>(null);
  const [aboutJson, setAboutJson] = useState<Record<string, unknown> | null>(null);
  const [previewTab, setPreviewTab] = useState<'homepage' | 'pdp'>('homepage');

  const scraped = brief.scraped_brand;

  useEffect(() => {
    if (!generating) return;
    genStartRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - genStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [generating]);

  useEffect(() => {
    if (genStep !== 2) { setLoadingMsg(0); return; }
    setLoadingMsg(0);
    const id = setInterval(() => {
      setLoadingMsg(prev => prev + 1);
    }, 8000);
    return () => clearInterval(id);
  }, [genStep]);

  const update = (field: keyof BrandBrief, value: string | string[] | ScrapedBrand | null) => {
    setBrief(prev => ({ ...prev, [field]: value }));
  };

  // ── Scan ─────────────────────────────────────────────────────────────────

  const handleScan = async () => {
    if (!scanUrl.trim()) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      const brand = data.brand as ScrapedBrand;
      setBrief(prev => ({
        ...prev,
        brand_name: brand.name || prev.brand_name,
        website: brand.url,
        primary_color: brand.colors[0] || prev.primary_color,
        secondary_color: brand.colors[1] || prev.secondary_color,
        scraped_brand: brand,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  // ── Generate ─────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setGenStep(1);
    try {
      const step1Timer = setTimeout(() => setGenStep(2), 5000);
      const step2Timer = setTimeout(() => setGenStep(prev => (prev < 3 ? 3 : prev)), 30000);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
      });
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      setGenStep(3);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setColorVariants(data.color_variants || []);
      setIndexJson(data.index_json || null);
      setProductJson(data.product_json || null);
      setAboutJson(data.about_json || null);
      setSelectedVariant(0);
      setPreviewTab('homepage');
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
      setGenStep(0);
    }
  };

  // ── Extract preview data ────────────────────────────────────────────────

  function extractPreview() {
    if (!indexJson) return null;
    const sections = (indexJson as { sections?: Record<string, Record<string, unknown>> }).sections || {};

    let heroHeadline = '';
    let heroSub = '';
    const tickerItems: string[] = [];
    const pillarHeadlines: string[] = [];
    let faqQ = '';
    let faqA = '';

    for (const sec of Object.values(sections)) {
      const sType = sec.type as string;
      const blocks = (sec.blocks || {}) as Record<string, { type: string; settings: Record<string, string> }>;

      if (sType === 'banner' && !heroHeadline) {
        for (const b of Object.values(blocks)) {
          if (b.type === 'heading' && b.settings?.content) heroHeadline = b.settings.content;
          if (b.type === 'content' && b.settings?.content) heroSub = b.settings.content.replace(/<[^>]+>/g, '');
        }
      }
      if (sType === 'marquee') {
        for (const b of Object.values(blocks)) {
          if (b.type === 'heading' && b.settings?.content && b.settings.content !== '✦') {
            tickerItems.push(b.settings.content);
          }
        }
      }
      if (sType === 'icon-grid') {
        for (const b of Object.values(blocks)) {
          if (b.type === 'icon' && b.settings?.heading) pillarHeadlines.push(b.settings.heading);
        }
      }
      if (sType === 'accordions' && !faqQ) {
        for (const b of Object.values(blocks)) {
          if (b.type === 'content' && b.settings?.heading && !faqQ) {
            faqQ = b.settings.heading;
            faqA = (b.settings.content || '').replace(/<[^>]+>/g, '');
          }
        }
      }
    }

    return { heroHeadline, heroSub, tickerItems, pillarHeadlines, faqQ, faqA };
  }

  function extractPdpPreview() {
    if (!productJson) return null;
    const sections = (productJson as { sections?: Record<string, Record<string, unknown>> }).sections || {};

    let badgeText = '';
    let badgeEmoji = '';
    const checklistItems: string[] = [];
    let valueTag = '';
    let valueText = '';
    const perksItems: string[] = [];
    let perksLabel = '';

    for (const sec of Object.values(sections)) {
      const blocks = (sec.blocks || {}) as Record<string, { type: string; settings: Record<string, string> }>;

      for (const b of Object.values(blocks)) {
        if (b.type === 'badge') {
          badgeText = b.settings?.badge_text || '';
          badgeEmoji = b.settings?.badge_emoji || '';
        }
        if (b.type === 'checklist') {
          for (let i = 1; i <= 5; i++) {
            const item = b.settings?.[`item_${i}`];
            if (item) checklistItems.push(item);
          }
          valueTag = b.settings?.value_prop_tag || '';
          valueText = b.settings?.value_prop_text || '';
        }
        if (b.type === 'perks') {
          perksLabel = b.settings?.label || '';
          for (let i = 1; i <= 5; i++) {
            const perk = b.settings?.[`perk_${i}`];
            if (perk) perksItems.push(perk);
          }
        }
      }
    }

    return { badgeText, badgeEmoji, checklistItems, valueTag, valueText, perksItems, perksLabel };
  }

  function buildSettingsData() {
    const variant = colorVariants[selectedVariant];
    return {
      current: variant?.theme_settings || {},
    };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: colors.cream }}>
      <header
        style={{
          background: colors.paper,
          borderBottom: `1px solid ${colors.border}`,
          padding: `${spacing[5]}px ${spacing[8]}px`,
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href="/"
            style={{
              fontFamily: font.heading,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.bold,
              letterSpacing: letterSpacing.wide,
              textTransform: 'uppercase',
              color: colors.muted,
              textDecoration: 'none',
              transition: `color ${transition.fast}`,
            }}
          >
            &larr; ATTOMIK FACTORY
          </Link>
          <Steps current={step} />
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: `${spacing[10]}px ${spacing[8]}px` }}>

        {/* ─── STEP 1: SCAN ────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['5xl'], color: colors.ink, textTransform: 'uppercase', letterSpacing: letterSpacing.tight, marginBottom: spacing[1] }}>
              Scan Brand
            </h2>
            <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, marginBottom: spacing[10] }}>
              Paste a brand URL to auto-extract colors, fonts, products, and identity.
            </p>

            <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4] }}>
              <input
                type="text"
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="https://drinkafterdream.com"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => { e.currentTarget.style.borderColor = colors.accent; }}
                onBlur={e => { e.currentTarget.style.borderColor = colors.border; }}
              />
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning || !scanUrl.trim()}
                style={{
                  ...styles.btnPrimary,
                  fontSize: fontSize.xs,
                  padding: `10px ${spacing[6]}px`,
                  opacity: scanning || !scanUrl.trim() ? 0.4 : 1,
                  cursor: scanning || !scanUrl.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {scanning ? 'Scanning...' : 'Scan Brand'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: font.mono,
                fontSize: fontSize.xs,
                color: colors.muted,
                textDecoration: 'underline',
                cursor: 'pointer',
                marginBottom: spacing[10],
              }}
            >
              Enter manually instead
            </button>

            {scanning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], padding: `${spacing[12]}px 0` }}>
                <div className="spinner spinner-sm" />
                <span style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>Scanning brand...</span>
              </div>
            )}

            {error && !scanning && (
              <div style={{
                border: `1px solid ${colors.dangerSoft}`,
                background: 'rgba(185,28,28,0.08)',
                padding: `${spacing[3]}px ${spacing[4]}px`,
                fontFamily: font.mono,
                fontSize: fontSize.xs,
                color: colors.dangerSoft,
                borderRadius: radius.sm,
                marginBottom: spacing[6],
              }}>
                {error}
              </div>
            )}

            {scraped && !scanning && (
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], borderBottom: `1px solid ${colors.border}`, padding: `${spacing[3]}px ${spacing[5]}px` }}>
                  <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.accent }}>Brand detected</span>
                  {scraped.platform && (
                    <span className="badge badge-black" style={{ fontSize: fontSize['2xs'] }}>{scraped.platform}</span>
                  )}
                </div>

                <div style={{ padding: spacing[5] }}>
                  <input
                    type="text"
                    value={brief.brand_name}
                    onChange={e => update('brand_name', e.target.value)}
                    style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: font.heading, fontSize: fontSize['5xl'], fontWeight: fontWeight.heading, color: colors.ink, outline: 'none', textTransform: 'uppercase', marginBottom: spacing[5] }}
                  />

                  <div style={{ marginBottom: spacing[5] }}>
                    <span style={labelStyle}>Colors</span>
                    <div style={{ display: 'flex', gap: spacing[2] }}>
                      {[brief.primary_color, brief.secondary_color, ...(scraped.colors.slice(2, 5))].filter(Boolean).map((color, i) => (
                        <label key={i} style={{ position: 'relative', cursor: 'pointer' }}>
                          <div style={{ width: 40, height: 40, backgroundColor: color, border: `1px solid ${colors.border}`, borderRadius: radius.xs }} />
                          <input
                            type="color"
                            value={color}
                            onChange={e => {
                              if (i === 0) update('primary_color', e.target.value);
                              else if (i === 1) update('secondary_color', e.target.value);
                            }}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                          />
                          <span style={{ display: 'block', marginTop: 4, textAlign: 'center', fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.muted }}>{color}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {scraped.fonts.length > 0 && (
                    <div style={{ marginBottom: spacing[5] }}>
                      <span style={labelStyle}>Fonts</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
                        {scraped.fonts.map(f => (
                          <span key={f} style={{ border: `1px solid ${colors.border}`, padding: `${spacing[1]}px ${spacing[2]}px`, fontFamily: font.mono, fontSize: fontSize.xs, color: colors.grayText, borderRadius: radius.xs }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {scraped.images.length > 0 && (
                    <div style={{ marginBottom: spacing[5] }}>
                      <span style={labelStyle}>Images</span>
                      <div style={{ display: 'flex', gap: spacing[2] }}>
                        {scraped.images.slice(0, 4).map((img, i) => (
                          <div key={i} style={{ width: 80, height: 80, overflow: 'hidden', border: `1px solid ${colors.border}`, borderRadius: radius.sm }}>
                            <img src={img.url} alt={img.tag} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scraped.products.length > 0 && (
                    <div>
                      <span style={labelStyle}>Products ({scraped.products.length})</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                        {scraped.products.slice(0, 6).map(p => (
                          <div key={p.title} style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                            {p.image && <div style={{ width: 32, height: 32, flexShrink: 0, overflow: 'hidden', border: `1px solid ${colors.border}`, borderRadius: radius.xs }}><img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                            <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.grayText }}>{p.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${colors.border}`, padding: `${spacing[4]}px ${spacing[5]}px` }}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{ ...styles.btnPrimary, width: '100%', padding: `${spacing[3]}px 0` }}
                  >
                    Continue to Brief
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: BRIEF ───────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['5xl'], color: colors.ink, textTransform: 'uppercase', letterSpacing: letterSpacing.tight, marginBottom: spacing[1] }}>
              Brand Brief
            </h2>
            <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, marginBottom: spacing[10] }}>
              Fill in the details. The more specific, the better the output.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
              <Field label="Brand Name *" htmlFor="brand_name">
                <TextInput id="brand_name" value={brief.brand_name} onChange={v => update('brand_name', v)} placeholder="Afterdream" />
              </Field>

              <Field label="One-Liner *" htmlFor="one_liner">
                <TextInput id="one_liner" value={brief.one_liner} onChange={v => update('one_liner', v)} placeholder="Describe the brand in one sentence" />
              </Field>

              <Field label="Category *" htmlFor="category">
                <select
                  id="category"
                  value={brief.category}
                  onChange={e => update('category', e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = colors.accent; }}
                  onBlur={e => { e.currentTarget.style.borderColor = colors.border; }}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Target Audience *" htmlFor="audience">
                <TextArea id="audience" value={brief.target_audience} onChange={v => update('target_audience', v)} placeholder="Who buys this and why?" />
              </Field>

              <Field label="Brand Vibe">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
                  {VIBES.map(vibe => {
                    const selected = brief.brand_vibe.includes(vibe);
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => {
                          const vibes = selected
                            ? brief.brand_vibe.filter(v => v !== vibe)
                            : [...brief.brand_vibe, vibe];
                          update('brand_vibe', vibes);
                        }}
                        style={{
                          border: `1px solid ${selected ? colors.accent : colors.border}`,
                          background: selected ? colors.accent : 'transparent',
                          color: selected ? colors.ink : colors.muted,
                          padding: `6px ${spacing[3]}px`,
                          fontFamily: font.mono,
                          fontSize: fontSize.xs,
                          textTransform: 'uppercase',
                          letterSpacing: letterSpacing.wider,
                          cursor: 'pointer',
                          borderRadius: radius.xs,
                          transition: `all ${transition.fast}`,
                          fontWeight: selected ? fontWeight.semibold : fontWeight.normal,
                        }}
                      >
                        {vibe}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Key Differentiators" htmlFor="diff">
                <TextArea id="diff" value={brief.differentiators} onChange={v => update('differentiators', v)} placeholder="What makes this brand different?" />
              </Field>

              <Field label="Competitors" htmlFor="comp">
                <TextInput id="comp" value={brief.competitors} onChange={v => update('competitors', v)} placeholder="2-3 competitor brand names" />
              </Field>

              <Field label="Notes (optional)" htmlFor="notes">
                <TextArea id="notes" value={brief.notes} onChange={v => update('notes', v)} placeholder="Any specific requests or constraints" rows={2} />
              </Field>
            </div>

            {error && (
              <div style={{
                marginTop: spacing[6],
                border: `1px solid ${colors.dangerSoft}`,
                background: 'rgba(185,28,28,0.08)',
                padding: `${spacing[3]}px ${spacing[4]}px`,
                fontFamily: font.mono,
                fontSize: fontSize.xs,
                color: colors.dangerSoft,
                borderRadius: radius.sm,
              }}>
                {error}
              </div>
            )}

            {/* Generate button */}
            {(() => {
              const disabled = generating || !brief.brand_name.trim() || !brief.one_liner.trim() || !brief.category || !brief.target_audience.trim();
              return (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={disabled}
                  style={{
                    ...styles.btnPrimary,
                    width: '100%',
                    marginTop: spacing[8],
                    padding: `${spacing[4]}px 0`,
                    opacity: disabled ? 0.4 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {generating ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
                      <span className="spinner spinner-sm" style={{ borderColor: colors.border, borderTopColor: colors.ink }} />
                      Generating store...
                    </span>
                  ) : 'Generate Store'}
                </button>
              );
            })()}

            {/* Generation steps */}
            {generating && (
              <div style={{ marginTop: spacing[6] }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                  {['Analyzing brand colors...', 'Generating store copy...', 'Building homepage config...'].map((label, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      {genStep > i + 1 ? (
                        <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.accent }}>&#10003;</span>
                      ) : genStep === i + 1 ? (
                        <div className="spinner spinner-sm" />
                      ) : (
                        <span style={{ display: 'inline-block', width: 10, height: 10, border: `1px solid ${colors.border}`, borderRadius: 2 }} />
                      )}
                      <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: genStep > i + 1 ? colors.accent : genStep === i + 1 ? colors.paper : colors.muted }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {genStep === 2 && (
                  <p style={{ marginTop: spacing[3], fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>
                    {['Writing hero headlines...', 'Crafting product descriptions...', 'Building FAQ responses...', 'Generating review copy...', 'Assembling section order...'][loadingMsg % 5]}
                  </p>
                )}

                <div style={{ marginTop: spacing[4], display: 'flex', alignItems: 'baseline', gap: spacing[3] }}>
                  <span style={{ fontFamily: font.mono, fontSize: fontSize.lg, fontVariantNumeric: 'tabular-nums', color: colors.grayText }}>
                    {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                  </span>
                  <span style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>
                    Generation typically takes 30–60 seconds
                  </span>
                </div>

                {elapsed > 90 && (
                  <p style={{ marginTop: spacing[2], fontFamily: font.mono, fontSize: fontSize.xs, color: '#eab308' }}>
                    This is taking longer than usual… still working
                  </p>
                )}
              </div>
            )}

            <div style={{ marginTop: spacing[6], display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ ...styles.btnGhost, border: 'none', fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, background: 'none', cursor: 'pointer' }}
              >
                &larr; Back to scan
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: RESULTS ─────────────────────────────────────────── */}
        {step === 3 && indexJson && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[8] }}>
              <h2 style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['5xl'], color: colors.ink, textTransform: 'uppercase', letterSpacing: letterSpacing.tight }}>
                {brief.brand_name} Store
              </h2>
              <div style={{ display: 'flex', gap: spacing[4] }}>
                <button
                  type="button"
                  onClick={() => { setStep(2); setIndexJson(null); setProductJson(null); setAboutJson(null); setColorVariants([]); setError(null); }}
                  style={{ ...styles.btnGhost, border: 'none', background: 'none', fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, cursor: 'pointer' }}
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(1); setBrief(INITIAL); setScanUrl(''); setIndexJson(null); setProductJson(null); setAboutJson(null); setColorVariants([]); }}
                  style={{ ...styles.btnGhost, border: 'none', background: 'none', fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, cursor: 'pointer' }}
                >
                  Start Over
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[6] }}>

              {/* LEFT: Color Themes */}
              <div style={{ background: colors.cream, border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden' }}>
                <div style={{ borderBottom: `1px solid ${colors.border}`, padding: `${spacing[3]}px ${spacing[5]}px` }}>
                  <span style={labelStyle}>Color Themes</span>
                </div>

                {/* Variant selector row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], borderBottom: `1px solid ${colors.border}`, padding: `${spacing[3]}px ${spacing[5]}px` }}>
                  {colorVariants.map((variant, i) => {
                    const ts = variant.theme_settings;
                    const swatches = [ts.color_background_body, ts.color_background_primary, ts.color_background_secondary, ts.color_background_tertiary];
                    return (
                      <button
                        key={variant.name}
                        type="button"
                        onClick={() => setSelectedVariant(i)}
                        style={{
                          border: `1px solid ${i === selectedVariant ? colors.accent : colors.border}`,
                          background: 'transparent',
                          padding: spacing[2],
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: radius.sm,
                          transition: `border-color ${transition.fast}`,
                        }}
                      >
                        <span style={{ display: 'block', marginBottom: 4, fontFamily: font.mono, fontSize: fontSize['2xs'], textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.muted }}>{variant.name.replace('_', ' ')}</span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {swatches.map((color, j) => (
                            <div key={j} style={{ width: 16, height: 16, backgroundColor: color || colors.ink, border: `1px solid ${colors.border}`, borderRadius: 2 }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const custom: ColorVariant = {
                        name: `custom_${colorVariants.length}`,
                        theme_settings: {
                          color_background_body: '#ffffff',
                          color_foreground_body: '#1a1a1a',
                          color_foreground_body_alt: '#ffffff',
                          color_background_primary: '#000000',
                          color_foreground_primary: '#ffffff',
                          color_background_secondary: '#2c2c2c',
                          color_foreground_secondary: '#ffffff',
                          color_background_tertiary: '#f5f5f5',
                          color_foreground_tertiary: '#1a1a1a',
                          color_bar: '#ffffff',
                          color_background_overlay: 'linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) 100%)',
                        },
                      };
                      setColorVariants(prev => [...prev, custom]);
                      setSelectedVariant(colorVariants.length);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px dashed ${colors.border}`,
                      background: 'transparent',
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      fontFamily: font.mono,
                      fontSize: fontSize['2xs'],
                      color: colors.muted,
                      cursor: 'pointer',
                      borderRadius: radius.sm,
                      transition: `all ${transition.fast}`,
                    }}
                  >
                    + Custom
                  </button>
                </div>

                {/* Color pickers for selected variant */}
                {colorVariants[selectedVariant] && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${spacing[2]}px ${spacing[4]}px`, padding: spacing[5] }}>
                    {COLOR_TOKENS.map(({ key, label }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                        <input
                          type="color"
                          value={colorVariants[selectedVariant].theme_settings[key] || '#000000'}
                          onChange={(e) => {
                            setColorVariants(prev => prev.map((v, i) =>
                              i === selectedVariant
                                ? { ...v, theme_settings: { ...v.theme_settings, [key]: e.target.value } }
                                : v
                            ));
                          }}
                          style={{ width: 24, height: 24, cursor: 'pointer', border: `1px solid ${colors.border}`, background: 'transparent', borderRadius: 2, padding: 0 }}
                        />
                        <span style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.grayText }}>{label}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.muted }}>{colorVariants[selectedVariant].theme_settings[key] || ''}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: Copy Preview */}
              <div style={{ background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
                  {(['homepage', 'pdp'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPreviewTab(tab)}
                      style={{
                        padding: `${spacing[3]}px ${spacing[5]}px`,
                        fontFamily: font.mono,
                        fontSize: fontSize.sm,
                        textTransform: 'uppercase',
                        letterSpacing: letterSpacing.wider,
                        color: previewTab === tab ? colors.ink : colors.muted,
                        borderBottom: previewTab === tab ? `2px solid ${colors.accent}` : '2px solid transparent',
                        background: 'none',
                        border: 'none',
                        borderBottomStyle: 'solid',
                        borderBottomWidth: 2,
                        borderBottomColor: previewTab === tab ? colors.accent : 'transparent',
                        cursor: 'pointer',
                        transition: `all ${transition.fast}`,
                      }}
                    >
                      {tab === 'homepage' ? 'Homepage' : 'Product Page'}
                    </button>
                  ))}
                </div>
                <div style={{ padding: spacing[5] }}>
                  {previewTab === 'homepage' && (() => {
                    const preview = extractPreview();
                    if (!preview) return <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>No preview available</span>;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                        {preview.heroHeadline && (
                          <div>
                            <span style={{ ...labelStyle, color: colors.muted }}>Hero</span>
                            <p style={{ fontFamily: font.heading, fontSize: fontSize['2xl'], fontWeight: fontWeight.heading, color: colors.ink, textTransform: 'uppercase' }}>{preview.heroHeadline}</p>
                            {preview.heroSub && <p style={{ marginTop: 4, fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>{preview.heroSub}</p>}
                          </div>
                        )}
                        {preview.tickerItems.length > 0 && (
                          <div>
                            <span style={{ ...labelStyle, color: colors.muted }}>Ticker</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {preview.tickerItems.map((item, i) => (
                                <span key={i} style={{ border: `1px solid ${colors.border}`, padding: `2px ${spacing[2]}px`, fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.grayText, borderRadius: radius.xs }}>{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {preview.pillarHeadlines.length > 0 && (
                          <div>
                            <span style={{ ...labelStyle, color: colors.muted }}>Pillars</span>
                            <div style={{ display: 'flex', gap: spacing[3] }}>
                              {preview.pillarHeadlines.slice(0, 3).map((h, i) => (
                                <span key={i} style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.grayText }}>{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {preview.faqQ && (
                          <div>
                            <span style={{ ...labelStyle, color: colors.muted }}>FAQ</span>
                            <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.ink }}>{preview.faqQ}</p>
                            <p style={{ marginTop: 4, fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>{preview.faqA}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {previewTab === 'pdp' && (() => {
                    const pdp = extractPdpPreview();
                    if (!pdp) return <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>No PDP preview available</span>;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                        {pdp.badgeText && (
                          <div>
                            <span style={{ ...labelStyle, color: colors.muted }}>Badge</span>
                            <p style={{ fontFamily: font.mono, fontSize: fontSize.body, color: colors.ink }}>
                              {pdp.badgeEmoji && <span style={{ marginRight: 4 }}>{pdp.badgeEmoji}</span>}
                              {pdp.badgeText}
                            </p>
                          </div>
                        )}
                        {pdp.checklistItems.length > 0 && (
                          <div>
                            <span style={{ ...labelStyle, color: colors.muted }}>Checklist</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                              {pdp.checklistItems.map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                                  <span style={{ color: colors.accent }}>&#10003;</span>
                                  <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.grayText }}>{item}</span>
                                </div>
                              ))}
                            </div>
                            {pdp.valueTag && (
                              <div style={{ marginTop: spacing[2], border: `1px solid ${colors.border}`, padding: `${spacing[2]}px ${spacing[3]}px`, borderRadius: radius.sm }}>
                                <span style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], fontWeight: fontWeight.bold, color: colors.accent }}>{pdp.valueTag}</span>
                                {pdp.valueText && <span style={{ marginLeft: spacing[2], fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.muted }}>{pdp.valueText}</span>}
                              </div>
                            )}
                          </div>
                        )}
                        {pdp.perksItems.length > 0 && (
                          <div>
                            <span style={{ ...labelStyle, color: colors.muted }}>{pdp.perksLabel || 'Perks'}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {pdp.perksItems.map((perk, i) => (
                                <span key={i} style={{ border: `1px solid ${colors.border}`, padding: `2px ${spacing[2]}px`, fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.grayText, borderRadius: radius.xs }}>{perk}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Download buttons */}
            <div style={{ marginTop: spacing[6], display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[3] }}>
              <button type="button" onClick={() => download(indexJson, 'index.json')} style={styles.btnPrimary}>
                Download index.json
              </button>
              <button type="button" onClick={() => download(buildSettingsData(), 'settings_data.json')} style={styles.btnDark}>
                Download settings_data.json
              </button>
              <button
                type="button"
                onClick={() => productJson && download(productJson, 'product.json')}
                disabled={!productJson}
                style={{ ...styles.btnDark, opacity: productJson ? 1 : 0.3, cursor: productJson ? 'pointer' : 'not-allowed' }}
              >
                Download product.json
              </button>
              <button
                type="button"
                onClick={() => aboutJson && download(aboutJson, 'page.about.json')}
                disabled={!aboutJson}
                style={{ ...styles.btnDark, opacity: aboutJson ? 1 : 0.3, cursor: aboutJson ? 'pointer' : 'not-allowed' }}
              >
                Download about.json
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
