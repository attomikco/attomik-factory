'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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

// ── Utility components ──────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const labels = ['Scan', 'Brief', 'Results'];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center font-mono text-xs ${
              n === current ? 'border border-accent text-accent'
              : n < current ? 'border border-white/30 text-white/30'
              : 'border border-surface-border text-muted'
            }`}>{n}</div>
            <span className={`font-mono text-xs uppercase tracking-wider ${
              n === current ? 'text-accent' : 'text-muted'
            }`}>{label}</span>
            {n < 3 && <div className="mx-2 h-px w-8 bg-surface-border" />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-surface-border bg-surface-raised px-3 py-2 font-mono text-sm text-white placeholder:text-muted/40 focus:border-accent focus:outline-none" />
  );
}

function TextArea({ id, value, onChange, placeholder, rows = 3 }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full resize-none border border-surface-border bg-surface-raised px-3 py-2 font-mono text-sm text-white placeholder:text-muted/40 focus:border-accent focus:outline-none" />
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
  const [genStep, setGenStep] = useState(0); // 0=idle, 1=colors, 2=copy, 3=config
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

  // Elapsed timer — ticks every second while generating
  useEffect(() => {
    if (!generating) return;
    genStartRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - genStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [generating]);

  // Loading message cycling — rotates every 8s while on step 2
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
      // Step 1 → 2 after ~5s (color API is fast)
      const step1Timer = setTimeout(() => setGenStep(2), 5000);
      // Step 2 → 3 after ~30s (main Claude call)
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

  // ── Extract preview data from index_json ─────────────────────────────────

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

  // ── Extract PDP preview data from product_json ──────────────────────────

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

  // ── Build settings_data.json ─────────────────────────────────────────────

  function buildSettingsData() {
    const variant = colorVariants[selectedVariant];
    // theme_settings already contains base-settings + color tokens merged by the API
    return {
      current: variant?.theme_settings || {},
    };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-border px-8 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-heading text-sm font-bold tracking-tight text-muted transition-colors hover:text-white">
            &larr; ATTOMIK FACTORY
          </Link>
          <Steps current={step} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-10">

        {/* ─── STEP 1: SCAN ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-1 font-heading text-2xl font-bold text-white">Scan Brand</h2>
            <p className="mb-10 font-mono text-xs text-muted">Paste a brand URL to auto-extract colors, fonts, products, and identity.</p>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="https://drinkafterdream.com"
                className="flex-1 border border-surface-border bg-surface-raised px-4 py-3 font-mono text-sm text-white placeholder:text-muted/40 focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning || !scanUrl.trim()}
                className={`border px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                  scanning ? 'cursor-wait border-surface-border text-muted'
                  : 'border-accent bg-accent text-black hover:bg-accent-dim'
                }`}
              >
                {scanning ? 'Scanning...' : 'Scan Brand'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="mb-10 font-mono text-xs text-muted underline transition-colors hover:text-white"
            >
              Enter manually instead
            </button>

            {scanning && (
              <div className="flex items-center gap-3 py-12">
                <div className="h-3 w-3 animate-pulse border border-accent" />
                <span className="font-mono text-sm text-muted">Scanning brand...</span>
              </div>
            )}

            {error && !scanning && (
              <div className="mb-6 border border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">{error}</div>
            )}

            {scraped && !scanning && (
              <div className="border border-surface-border">
                <div className="flex items-center gap-3 border-b border-surface-border px-5 py-3">
                  <span className="font-mono text-xs text-accent">Brand detected</span>
                  {scraped.platform && (
                    <span className="border border-accent/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">{scraped.platform}</span>
                  )}
                </div>

                <div className="p-5">
                  {/* Brand name — editable */}
                  <input
                    type="text"
                    value={brief.brand_name}
                    onChange={e => update('brand_name', e.target.value)}
                    className="mb-5 w-full border-0 bg-transparent font-heading text-2xl font-bold text-white focus:outline-none"
                  />

                  {/* Colors */}
                  <div className="mb-5">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted">Colors</span>
                    <div className="flex gap-2">
                      {[brief.primary_color, brief.secondary_color, ...(scraped.colors.slice(2, 5))].filter(Boolean).map((color, i) => (
                        <label key={i} className="group relative cursor-pointer">
                          <div className="h-10 w-10 border border-surface-border transition-all group-hover:border-white/40" style={{ backgroundColor: color }} />
                          <input
                            type="color"
                            value={color}
                            onChange={e => {
                              if (i === 0) update('primary_color', e.target.value);
                              else if (i === 1) update('secondary_color', e.target.value);
                            }}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                          <span className="mt-1 block text-center font-mono text-[9px] text-muted">{color}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Fonts */}
                  {scraped.fonts.length > 0 && (
                    <div className="mb-5">
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted">Fonts</span>
                      <div className="flex flex-wrap gap-1">
                        {scraped.fonts.map(f => (
                          <span key={f} className="border border-surface-border px-2 py-1 font-mono text-xs text-white/70">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product images */}
                  {scraped.images.length > 0 && (
                    <div className="mb-5">
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted">Images</span>
                      <div className="flex gap-2">
                        {scraped.images.slice(0, 4).map((img, i) => (
                          <div key={i} className="h-20 w-20 overflow-hidden border border-surface-border">
                            <img src={img.url} alt={img.tag} className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {scraped.products.length > 0 && (
                    <div>
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted">Products ({scraped.products.length})</span>
                      <div className="flex flex-col gap-1">
                        {scraped.products.slice(0, 6).map(p => (
                          <div key={p.title} className="flex items-center gap-3">
                            {p.image && <div className="h-8 w-8 shrink-0 overflow-hidden border border-surface-border"><img src={p.image} alt="" className="h-full w-full object-cover" /></div>}
                            <span className="font-mono text-xs text-white/80">{p.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Continue button */}
                <div className="border-t border-surface-border px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full border border-accent bg-accent py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-accent-dim"
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
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-1 font-heading text-2xl font-bold text-white">Brand Brief</h2>
            <p className="mb-10 font-mono text-xs text-muted">Fill in the details. The more specific, the better the output.</p>

            <div className="flex flex-col gap-6">
              <Field label="Brand Name *" htmlFor="brand_name">
                <TextInput id="brand_name" value={brief.brand_name} onChange={v => update('brand_name', v)} placeholder="Afterdream" />
              </Field>

              <Field label="One-Liner *" htmlFor="one_liner">
                <TextInput id="one_liner" value={brief.one_liner} onChange={v => update('one_liner', v)} placeholder="Describe the brand in one sentence" />
              </Field>

              <Field label="Category *" htmlFor="category">
                <select id="category" value={brief.category} onChange={e => update('category', e.target.value)}
                  className="w-full border border-surface-border bg-surface-raised px-3 py-2 font-mono text-sm text-white focus:border-accent focus:outline-none">
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Target Audience *" htmlFor="audience">
                <TextArea id="audience" value={brief.target_audience} onChange={v => update('target_audience', v)} placeholder="Who buys this and why?" />
              </Field>

              <Field label="Brand Vibe">
                <div className="flex flex-wrap gap-2">
                  {VIBES.map(vibe => (
                    <button key={vibe} type="button"
                      onClick={() => {
                        const vibes = brief.brand_vibe.includes(vibe)
                          ? brief.brand_vibe.filter(v => v !== vibe)
                          : [...brief.brand_vibe, vibe];
                        update('brand_vibe', vibes);
                      }}
                      className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                        brief.brand_vibe.includes(vibe)
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-surface-border text-muted hover:border-white/30 hover:text-white/60'
                      }`}
                    >{vibe}</button>
                  ))}
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
              <div className="mt-6 border border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">{error}</div>
            )}

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !brief.brand_name.trim() || !brief.one_liner.trim() || !brief.category || !brief.target_audience.trim()}
              className={`mt-8 w-full border py-4 font-mono text-sm font-bold uppercase tracking-wider transition-colors ${
                generating ? 'cursor-wait border-surface-border text-muted'
                : !brief.brand_name.trim() || !brief.one_liner.trim() || !brief.category || !brief.target_audience.trim()
                  ? 'cursor-not-allowed border-surface-border text-muted'
                  : 'border-accent bg-accent text-black hover:bg-accent-dim'
              }`}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="inline-block h-3 w-3 animate-pulse border border-muted" />
                  Generating store...
                </span>
              ) : 'Generate Store'}
            </button>

            {/* Generation steps */}
            {generating && (
              <div className="mt-6">
                <div className="flex flex-col gap-2">
                  {['Analyzing brand colors...', 'Generating store copy...', 'Building homepage config...'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {genStep > i + 1 ? (
                        <span className="font-mono text-xs text-accent">&#10003;</span>
                      ) : genStep === i + 1 ? (
                        <span className="inline-block h-3 w-3 animate-[spin_1s_linear_infinite] rounded-full border-2 border-accent border-t-transparent" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 border border-surface-border" />
                      )}
                      <span className={`font-mono text-xs ${genStep > i + 1 ? 'text-accent' : genStep === i + 1 ? 'text-white' : 'text-muted'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Loading messages — cycle while step 2 is active */}
                {genStep === 2 && (
                  <p className="mt-3 font-mono text-[11px] text-muted/60">
                    {['Writing hero headlines...', 'Crafting product descriptions...', 'Building FAQ responses...', 'Generating review copy...', 'Assembling section order...'][loadingMsg % 5]}
                  </p>
                )}

                {/* Elapsed timer */}
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-mono text-lg tabular-nums text-white/70">
                    {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    Generation typically takes 30–60 seconds
                  </span>
                </div>

                {/* Timeout warning */}
                {elapsed > 90 && (
                  <p className="mt-2 font-mono text-xs text-yellow-400/80">
                    This is taking longer than usual… still working
                  </p>
                )}
              </div>
            )}

            {/* Back */}
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="font-mono text-xs text-muted transition-colors hover:text-white">
                &larr; Back to scan
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: RESULTS ─────────────────────────────────────────── */}
        {step === 3 && indexJson && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold text-white">{brief.brand_name} Store</h2>
              <div className="flex gap-4">
                <button type="button" onClick={() => { setStep(2); setIndexJson(null); setProductJson(null); setAboutJson(null); setColorVariants([]); setError(null); }}
                  className="font-mono text-xs text-muted transition-colors hover:text-accent">Regenerate</button>
                <button type="button" onClick={() => { setStep(1); setBrief(INITIAL); setScanUrl(''); setIndexJson(null); setProductJson(null); setAboutJson(null); setColorVariants([]); }}
                  className="font-mono text-xs text-muted transition-colors hover:text-white">Start Over</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* LEFT: Color Themes */}
              <div className="border border-surface-border">
                <div className="border-b border-surface-border px-5 py-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Color Themes</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-5">
                  {colorVariants.map((variant, i) => {
                    const ts = variant.theme_settings;
                    const swatches = [ts.color_background_body, ts.color_background_primary, ts.color_background_secondary, ts.color_background_tertiary, ts.color_foreground_body];
                    return (
                      <button
                        key={variant.name}
                        type="button"
                        onClick={() => setSelectedVariant(i)}
                        className={`border p-3 text-left transition-colors ${
                          i === selectedVariant ? 'border-accent' : 'border-surface-border hover:border-white/20'
                        }`}
                      >
                        <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted">{variant.name.replace('_', ' ')}</span>
                        <div className="flex gap-1">
                          {swatches.map((color, j) => (
                            <div key={j} className="h-6 w-6 border border-white/10" style={{ backgroundColor: color || '#000' }} />
                          ))}
                        </div>
                        {i === selectedVariant && (
                          <span className="mt-2 block font-mono text-[9px] text-accent">Selected</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Copy Preview */}
              <div className="border border-surface-border">
                <div className="flex items-center border-b border-surface-border">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('homepage')}
                    className={`px-5 py-3 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                      previewTab === 'homepage' ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-white/60'
                    }`}
                  >Homepage</button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('pdp')}
                    className={`px-5 py-3 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                      previewTab === 'pdp' ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-white/60'
                    }`}
                  >Product Page</button>
                </div>
                <div className="p-5">
                  {previewTab === 'homepage' && (() => {
                    const preview = extractPreview();
                    if (!preview) return <span className="font-mono text-xs text-muted">No preview available</span>;
                    return (
                      <div className="flex flex-col gap-4">
                        {preview.heroHeadline && (
                          <div>
                            <span className="mb-1 block font-mono text-[9px] uppercase text-muted">Hero</span>
                            <p className="font-heading text-xl font-bold text-white">{preview.heroHeadline}</p>
                            {preview.heroSub && <p className="mt-1 font-mono text-xs text-muted">{preview.heroSub}</p>}
                          </div>
                        )}
                        {preview.tickerItems.length > 0 && (
                          <div>
                            <span className="mb-1 block font-mono text-[9px] uppercase text-muted">Ticker</span>
                            <div className="flex flex-wrap gap-1">
                              {preview.tickerItems.map((item, i) => (
                                <span key={i} className="border border-surface-border px-2 py-0.5 font-mono text-[10px] text-white/70">{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {preview.pillarHeadlines.length > 0 && (
                          <div>
                            <span className="mb-1 block font-mono text-[9px] uppercase text-muted">Pillars</span>
                            <div className="flex gap-3">
                              {preview.pillarHeadlines.slice(0, 3).map((h, i) => (
                                <span key={i} className="font-mono text-xs text-white/80">{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {preview.faqQ && (
                          <div>
                            <span className="mb-1 block font-mono text-[9px] uppercase text-muted">FAQ</span>
                            <p className="font-mono text-xs font-bold text-white">{preview.faqQ}</p>
                            <p className="mt-1 font-mono text-[11px] text-muted">{preview.faqA}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {previewTab === 'pdp' && (() => {
                    const pdp = extractPdpPreview();
                    if (!pdp) return <span className="font-mono text-xs text-muted">No PDP preview available</span>;
                    return (
                      <div className="flex flex-col gap-4">
                        {pdp.badgeText && (
                          <div>
                            <span className="mb-1 block font-mono text-[9px] uppercase text-muted">Badge</span>
                            <p className="font-mono text-sm text-white">
                              {pdp.badgeEmoji && <span className="mr-1">{pdp.badgeEmoji}</span>}
                              {pdp.badgeText}
                            </p>
                          </div>
                        )}
                        {pdp.checklistItems.length > 0 && (
                          <div>
                            <span className="mb-1 block font-mono text-[9px] uppercase text-muted">Checklist</span>
                            <div className="flex flex-col gap-1">
                              {pdp.checklistItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-accent">&#10003;</span>
                                  <span className="font-mono text-xs text-white/80">{item}</span>
                                </div>
                              ))}
                            </div>
                            {pdp.valueTag && (
                              <div className="mt-2 border border-surface-border px-3 py-2">
                                <span className="font-mono text-[10px] font-bold text-accent">{pdp.valueTag}</span>
                                {pdp.valueText && <span className="ml-2 font-mono text-[10px] text-muted">{pdp.valueText}</span>}
                              </div>
                            )}
                          </div>
                        )}
                        {pdp.perksItems.length > 0 && (
                          <div>
                            <span className="mb-1 block font-mono text-[9px] uppercase text-muted">{pdp.perksLabel || 'Perks'}</span>
                            <div className="flex flex-wrap gap-1">
                              {pdp.perksItems.map((perk, i) => (
                                <span key={i} className="border border-surface-border px-2 py-0.5 font-mono text-[10px] text-white/70">{perk}</span>
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
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <button type="button" onClick={() => download(indexJson, 'index.json')}
                className="border border-accent bg-accent py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-accent-dim">
                Download index.json
              </button>
              <button type="button" onClick={() => download(buildSettingsData(), 'settings_data.json')}
                className="border border-surface-border py-3 font-mono text-sm uppercase tracking-wider text-muted transition-colors hover:border-white/30 hover:text-white">
                Download settings_data.json
              </button>
              <button type="button" onClick={() => productJson && download(productJson, 'product.json')}
                disabled={!productJson}
                className={`border py-3 font-mono text-sm uppercase tracking-wider transition-colors ${
                  productJson
                    ? 'border-surface-border text-muted hover:border-white/30 hover:text-white'
                    : 'cursor-not-allowed border-surface-border/50 text-muted/30'
                }`}>
                Download product.json
              </button>
              <button type="button" onClick={() => aboutJson && download(aboutJson, 'page.about.json')}
                disabled={!aboutJson}
                className={`border py-3 font-mono text-sm uppercase tracking-wider transition-colors ${
                  aboutJson
                    ? 'border-surface-border text-muted hover:border-white/30 hover:text-white'
                    : 'cursor-not-allowed border-surface-border/50 text-muted/30'
                }`}>
                Download about.json
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
