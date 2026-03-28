'use client';

import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = ['Beverage', 'Skincare', 'Food', 'Supplement', 'Other'] as const;
const VIBES = ['Premium', 'Playful', 'Clinical', 'Earthy', 'Bold', 'Minimal', 'Luxe', 'Raw'] as const;

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
  notes: string;
}

const INITIAL_BRIEF: BrandBrief = {
  brand_name: '',
  one_liner: '',
  category: '',
  website: '',
  store_url: '',
  api_key: '',
  target_audience: '',
  brand_vibe: [],
  competitors: '',
  differentiators: '',
  primary_color: '#000000',
  notes: '',
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center font-mono text-xs ${
              step === current
                ? 'border border-accent text-accent'
                : step < current
                  ? 'border border-white/30 text-white/30'
                  : 'border border-surface-border text-muted'
            }`}
          >
            {step}
          </div>
          <span
            className={`font-mono text-xs uppercase tracking-wider ${
              step === current ? 'text-accent' : 'text-muted'
            }`}
          >
            {step === 1 ? 'Basics' : step === 2 ? 'Brief' : 'Generate'}
          </span>
          {step < 3 && <div className="mx-2 h-px w-8 bg-surface-border" />}
        </div>
      ))}
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted">
      {children}
    </label>
  );
}

function Input({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-surface-border bg-surface-raised px-3 py-2 font-mono text-sm text-white placeholder:text-muted/50 focus:border-accent focus:outline-none"
    />
  );
}

function Textarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none border border-surface-border bg-surface-raised px-3 py-2 font-mono text-sm text-white placeholder:text-muted/50 focus:border-accent focus:outline-none"
    />
  );
}

export default function NewClientPage() {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState<BrandBrief>(INITIAL_BRIEF);
  const [generating, setGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setClientId] = useState<string | null>(null);

  const update = (field: keyof BrandBrief, value: string | string[]) => {
    setBrief((prev) => ({ ...prev, [field]: value }));
  };

  const toggleVibe = (vibe: string) => {
    setBrief((prev) => ({
      ...prev,
      brand_vibe: prev.brand_vibe.includes(vibe)
        ? prev.brand_vibe.filter((v) => v !== vibe)
        : [...prev.brand_vibe, vibe],
    }));
  };

  const canAdvance = (): boolean => {
    if (step === 1) return !!(brief.brand_name.trim() && brief.one_liner.trim() && brief.category);
    if (step === 2) return !!brief.target_audience.trim();
    return true;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedConfig(data.generated);
      setClientId(data.client?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-surface-border px-8 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-heading text-sm font-bold tracking-tight text-muted transition-colors hover:text-white">
            &larr; ATTOMIK FACTORY
          </Link>
          <StepIndicator current={step} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-8 py-10">
        {/* Step 1: Brand Basics */}
        {step === 1 && (
          <div>
            <h2 className="mb-1 font-heading text-2xl font-bold text-white">Brand Basics</h2>
            <p className="mb-8 font-mono text-xs text-muted">Core identity and store connection.</p>

            <div className="flex flex-col gap-5">
              <div>
                <Label htmlFor="brand_name">Brand Name *</Label>
                <Input id="brand_name" value={brief.brand_name} onChange={(v) => update('brand_name', v)} placeholder="e.g. Nouri" />
              </div>

              <div>
                <Label htmlFor="one_liner">One-Liner *</Label>
                <Input id="one_liner" value={brief.one_liner} onChange={(v) => update('one_liner', v)} placeholder="e.g. Non-alcoholic sparkling wine from Italy" />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={brief.category}
                  onChange={(e) => update('category', e.target.value)}
                  className="w-full border border-surface-border bg-surface-raised px-3 py-2 font-mono text-sm text-white focus:border-accent focus:outline-none"
                >
                  <option value="" className="text-muted">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="website">Website (optional)</Label>
                <Input id="website" value={brief.website} onChange={(v) => update('website', v)} placeholder="https://brand.com" />
              </div>

            </div>
          </div>
        )}

        {/* Step 2: Brand Brief */}
        {step === 2 && (
          <div>
            <h2 className="mb-1 font-heading text-2xl font-bold text-white">Brand Brief</h2>
            <p className="mb-8 font-mono text-xs text-muted">Tell Claude about the brand. More detail = better config.</p>

            <div className="flex flex-col gap-5">
              <div>
                <Label htmlFor="target_audience">Target Audience *</Label>
                <Textarea
                  id="target_audience"
                  value={brief.target_audience}
                  onChange={(v) => update('target_audience', v)}
                  placeholder="e.g. Health-conscious millennials who want premium wellness products without the clinical feel"
                />
              </div>

              <div>
                <Label>Brand Vibe</Label>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((vibe) => (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => toggleVibe(vibe)}
                      className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                        brief.brand_vibe.includes(vibe)
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-surface-border text-muted hover:border-white/30 hover:text-white/60'
                      }`}
                    >
                      {vibe}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="competitors">Competitor Brands (2-3)</Label>
                <Input id="competitors" value={brief.competitors} onChange={(v) => update('competitors', v)} placeholder="e.g. Haus, Ghia, Surely" />
              </div>

              <div>
                <Label htmlFor="differentiators">Key Ingredients / Differentiators</Label>
                <Textarea
                  id="differentiators"
                  value={brief.differentiators}
                  onChange={(v) => update('differentiators', v)}
                  placeholder="e.g. Made with real Italian grapes, zero sugar, adaptogens for calm focus"
                />
              </div>

              <div>
                <Label htmlFor="primary_color">Primary Color Preference</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brief.primary_color}
                    onChange={(e) => update('primary_color', e.target.value)}
                    className="h-9 w-12 cursor-pointer border border-surface-border bg-transparent"
                  />
                  <Input id="primary_color" value={brief.primary_color} onChange={(v) => update('primary_color', v)} placeholder="#000000" />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={brief.notes}
                  onChange={(v) => update('notes', v)}
                  placeholder="Any specific requests, tone guidance, or constraints"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Generate */}
        {step === 3 && (
          <div>
            <h2 className="mb-1 font-heading text-2xl font-bold text-white">Review & Generate</h2>
            <p className="mb-8 font-mono text-xs text-muted">Confirm the brief, then let Claude generate your brand config.</p>

            {!generatedConfig && (
              <div className="mb-8 border border-surface-border">
                <div className="border-b border-surface-border px-5 py-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted">Brief Summary</span>
                </div>
                <div className="flex flex-col gap-3 px-5 py-4">
                  <SummaryRow label="Brand" value={brief.brand_name} />
                  <SummaryRow label="One-Liner" value={brief.one_liner} />
                  <SummaryRow label="Category" value={brief.category} />
                  <SummaryRow label="Audience" value={brief.target_audience} />
                  <SummaryRow label="Vibe" value={brief.brand_vibe.join(', ') || 'Not set'} />
                  <SummaryRow label="Competitors" value={brief.competitors || 'Not set'} />
                  <SummaryRow label="Differentiators" value={brief.differentiators || 'Not set'} />
                  <SummaryRow label="Color" value={brief.primary_color} color={brief.primary_color} />
                  {brief.notes && <SummaryRow label="Notes" value={brief.notes} />}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 border border-red-500/50 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-400">
                {error}
              </div>
            )}

            {!generatedConfig && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className={`w-full border px-6 py-3 font-mono text-sm uppercase tracking-wider transition-colors ${
                  generating
                    ? 'cursor-wait border-surface-border text-muted'
                    : 'border-accent text-accent hover:bg-accent hover:text-black'
                }`}
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-3 w-3 animate-pulse border border-muted" />
                    Generating brand config...
                  </span>
                ) : (
                  'Generate Brand Config'
                )}
              </button>
            )}

            {generatedConfig && (
              <div>
                <div className="mb-6 border border-accent/30 bg-accent/5 px-4 py-3 font-mono text-xs text-accent">
                  Config generated successfully for {brief.brand_name}.
                </div>

                <div className="mb-6 border border-surface-border">
                  <div className="flex items-center justify-between border-b border-surface-border px-5 py-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted">Generated Config</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2))}
                      className="font-mono text-xs text-muted transition-colors hover:text-accent"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="max-h-[500px] overflow-auto p-5 font-mono text-xs leading-relaxed text-white/80">
                    {JSON.stringify(generatedConfig, null, 2)}
                  </pre>
                </div>

                <div className="mb-6 border border-surface-border">
                  <div className="border-b border-surface-border px-5 py-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted">Shopify Connection</span>
                  </div>
                  <div className="flex flex-col gap-4 px-5 py-4">
                    <div>
                      <Label htmlFor="store_url">Store URL *</Label>
                      <Input id="store_url" value={brief.store_url} onChange={(v) => update('store_url', v)} placeholder="brand-name.myshopify.com" />
                    </div>
                    <div>
                      <Label htmlFor="api_key">Shopify Admin API Key *</Label>
                      <Input id="api_key" value={brief.api_key} onChange={(v) => update('api_key', v)} placeholder="shpat_..." />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedConfig(null);
                      setError(null);
                    }}
                    className="border border-surface-border px-6 py-3 font-mono text-sm uppercase tracking-wider text-muted transition-colors hover:border-white/30 hover:text-white"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    disabled={!brief.store_url.trim() || !brief.api_key.trim()}
                    className={`flex-1 border px-6 py-3 font-mono text-sm uppercase tracking-wider transition-colors ${
                      brief.store_url.trim() && brief.api_key.trim()
                        ? 'border-accent bg-accent text-black hover:bg-accent-dim'
                        : 'cursor-not-allowed border-surface-border text-muted'
                    }`}
                  >
                    Deploy to Store
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {!(step === 3 && generatedConfig) && (
          <div className="mt-10 flex items-center justify-between border-t border-surface-border pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-white"
              >
                &larr; Back
              </button>
            ) : (
              <Link href="/" className="font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-white">
                Cancel
              </Link>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className={`border px-6 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
                  canAdvance()
                    ? 'border-accent text-accent hover:bg-accent hover:text-black'
                    : 'cursor-not-allowed border-surface-border text-muted'
                }`}
              >
                Next &rarr;
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-28 shrink-0 font-mono text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="flex items-center gap-2 font-mono text-sm text-white">
        {color && <span className="inline-block h-3 w-3 border border-surface-border" style={{ backgroundColor: color }} />}
        {value}
      </span>
    </div>
  );
}
