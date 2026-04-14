'use client';

import { useEffect, useMemo, useState } from 'react';
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

// ── Config walker types + helpers ───────────────────────────────────────────
// Each editable field carries the full write path so Save can mutate the
// exact nested key in the saved config before PATCHing back to Supabase.

type TopLevelKey = 'index_json' | 'product_json' | 'footer_group_json';

interface Field {
  id: string;
  label: string;
  value: string;
  path: (string | number)[];
  topLevel: TopLevelKey;
  multiline?: boolean;
}

interface ShopifyJsonSection {
  type?: string;
  settings?: Record<string, unknown>;
  blocks?: Record<string, { type?: string; settings?: Record<string, unknown> }>;
  block_order?: string[];
}

type ShopifyJson = { sections?: Record<string, ShopifyJsonSection>; order?: string[] } & Record<string, unknown>;

function getOrderedSectionIds(json: ShopifyJson | null): string[] {
  if (!json) return [];
  const sections = json.sections || {};
  const order = Array.isArray(json.order) ? json.order.filter(id => id in sections) : [];
  return order.length > 0 ? order : Object.keys(sections);
}

function findFirstSectionOfType(
  json: ShopifyJson | null,
  type: string,
): { id: string; section: ShopifyJsonSection } | null {
  if (!json) return null;
  const sections = json.sections || {};
  for (const id of getOrderedSectionIds(json)) {
    const sec = sections[id];
    if (sec?.type === type) return { id, section: sec };
  }
  return null;
}

function getBlockIds(section: ShopifyJsonSection): string[] {
  if (section.block_order && section.block_order.length > 0) {
    return section.block_order.filter(id => section.blocks?.[id]);
  }
  return Object.keys(section.blocks || {});
}

function collectHomepageFields(indexJson: Record<string, unknown> | null): Field[] {
  if (!indexJson) return [];
  const json = indexJson as ShopifyJson;
  const fields: Field[] = [];

  // Hero — first banner in section order
  const hero = findFirstSectionOfType(json, 'banner');
  if (hero) {
    for (const bid of getBlockIds(hero.section)) {
      const b = hero.section.blocks?.[bid];
      if (!b) continue;
      if (b.type === 'heading' && typeof b.settings?.content === 'string') {
        fields.push({
          id: `hero-headline-${bid}`,
          label: 'Hero Headline',
          value: b.settings.content,
          path: ['sections', hero.id, 'blocks', bid, 'settings', 'content'],
          topLevel: 'index_json',
        });
      }
      if (b.type === 'content' && typeof b.settings?.content === 'string') {
        fields.push({
          id: `hero-subhead-${bid}`,
          label: 'Hero Subhead',
          value: b.settings.content,
          path: ['sections', hero.id, 'blocks', bid, 'settings', 'content'],
          topLevel: 'index_json',
          multiline: true,
        });
      }
    }
  }

  // Ticker — first marquee
  const ticker = findFirstSectionOfType(json, 'marquee');
  if (ticker) {
    let index = 1;
    for (const bid of getBlockIds(ticker.section)) {
      const b = ticker.section.blocks?.[bid];
      if (!b || b.type !== 'heading') continue;
      const v = b.settings?.content;
      if (typeof v !== 'string' || v === '✦' || v === '') continue;
      fields.push({
        id: `ticker-${bid}`,
        label: `Ticker ${index++}`,
        value: v,
        path: ['sections', ticker.id, 'blocks', bid, 'settings', 'content'],
        topLevel: 'index_json',
      });
    }
  }

  // Pillars — first icon-grid
  const pillars = findFirstSectionOfType(json, 'icon-grid');
  if (pillars) {
    let index = 1;
    for (const bid of getBlockIds(pillars.section)) {
      const b = pillars.section.blocks?.[bid];
      if (!b || b.type !== 'icon') continue;
      if (typeof b.settings?.heading === 'string') {
        fields.push({
          id: `pillar-h-${bid}`,
          label: `Pillar ${index} Heading`,
          value: b.settings.heading,
          path: ['sections', pillars.id, 'blocks', bid, 'settings', 'heading'],
          topLevel: 'index_json',
        });
      }
      if (typeof b.settings?.content === 'string') {
        fields.push({
          id: `pillar-c-${bid}`,
          label: `Pillar ${index} Description`,
          value: b.settings.content,
          path: ['sections', pillars.id, 'blocks', bid, 'settings', 'content'],
          topLevel: 'index_json',
          multiline: true,
        });
      }
      index++;
    }
  }

  // FAQ — first accordions
  const faq = findFirstSectionOfType(json, 'accordions');
  if (faq) {
    let index = 1;
    for (const bid of getBlockIds(faq.section)) {
      const b = faq.section.blocks?.[bid];
      if (!b || b.type !== 'content') continue;
      if (typeof b.settings?.heading === 'string') {
        fields.push({
          id: `faq-q-${bid}`,
          label: `FAQ ${index} Question`,
          value: b.settings.heading,
          path: ['sections', faq.id, 'blocks', bid, 'settings', 'heading'],
          topLevel: 'index_json',
        });
      }
      if (typeof b.settings?.content === 'string') {
        fields.push({
          id: `faq-a-${bid}`,
          label: `FAQ ${index} Answer`,
          value: b.settings.content,
          path: ['sections', faq.id, 'blocks', bid, 'settings', 'content'],
          topLevel: 'index_json',
          multiline: true,
        });
      }
      index++;
    }
  }

  return fields;
}

function collectPdpFields(productJson: Record<string, unknown> | null): Field[] {
  if (!productJson) return [];
  const json = productJson as ShopifyJson;
  const fields: Field[] = [];
  const sections = json.sections || {};

  for (const [sid, sec] of Object.entries(sections)) {
    for (const bid of getBlockIds(sec)) {
      const b = sec.blocks?.[bid];
      if (!b) continue;

      if (b.type === 'badge') {
        if (typeof b.settings?.badge_text === 'string') {
          fields.push({
            id: `badge-text-${bid}`,
            label: 'Badge Text',
            value: b.settings.badge_text,
            path: ['sections', sid, 'blocks', bid, 'settings', 'badge_text'],
            topLevel: 'product_json',
          });
        }
        if (typeof b.settings?.badge_emoji === 'string') {
          fields.push({
            id: `badge-emoji-${bid}`,
            label: 'Badge Emoji',
            value: b.settings.badge_emoji,
            path: ['sections', sid, 'blocks', bid, 'settings', 'badge_emoji'],
            topLevel: 'product_json',
          });
        }
      }

      if (b.type === 'checklist') {
        for (let i = 1; i <= 5; i++) {
          const key = `item_${i}`;
          const v = b.settings?.[key];
          if (typeof v === 'string' && v.length > 0) {
            fields.push({
              id: `check-${bid}-${i}`,
              label: `Checklist ${i}`,
              value: v,
              path: ['sections', sid, 'blocks', bid, 'settings', key],
              topLevel: 'product_json',
            });
          }
        }
        if (typeof b.settings?.value_prop_text === 'string' && b.settings.value_prop_text.length > 0) {
          fields.push({
            id: `check-value-${bid}`,
            label: 'Value Prop Text',
            value: b.settings.value_prop_text,
            path: ['sections', sid, 'blocks', bid, 'settings', 'value_prop_text'],
            topLevel: 'product_json',
            multiline: true,
          });
        }
      }

      if (b.type === 'perks') {
        if (typeof b.settings?.header_text === 'string' && b.settings.header_text.length > 0) {
          fields.push({
            id: `perks-header-${bid}`,
            label: 'Perks Header',
            value: b.settings.header_text,
            path: ['sections', sid, 'blocks', bid, 'settings', 'header_text'],
            topLevel: 'product_json',
          });
        }
        for (let i = 1; i <= 5; i++) {
          const key = `perk_${i}`;
          const v = b.settings?.[key];
          if (typeof v === 'string' && v.length > 0) {
            fields.push({
              id: `perk-${bid}-${i}`,
              label: `Perk ${i}`,
              value: v,
              path: ['sections', sid, 'blocks', bid, 'settings', key],
              topLevel: 'product_json',
            });
          }
        }
      }
    }
  }

  return fields;
}

function collectFooterFields(footerGroupJson: Record<string, unknown> | null): Field[] {
  if (!footerGroupJson) return [];
  const json = footerGroupJson as ShopifyJson;
  const fields: Field[] = [];
  const sections = json.sections || {};

  // theme_footer content block — tagline + about + cta
  const themeFooter = sections['theme_footer'];
  if (themeFooter) {
    for (const bid of getBlockIds(themeFooter)) {
      const b = themeFooter.blocks?.[bid];
      if (!b || b.type !== 'content') continue;
      if (typeof b.settings?.heading === 'string') {
        fields.push({
          id: `footer-tagline-${bid}`,
          label: 'Footer Tagline',
          value: b.settings.heading,
          path: ['sections', 'theme_footer', 'blocks', bid, 'settings', 'heading'],
          topLevel: 'footer_group_json',
        });
      }
      if (typeof b.settings?.content === 'string') {
        fields.push({
          id: `footer-about-${bid}`,
          label: 'About Content',
          value: b.settings.content,
          path: ['sections', 'theme_footer', 'blocks', bid, 'settings', 'content'],
          topLevel: 'footer_group_json',
          multiline: true,
        });
      }
      if (typeof b.settings?.button_label === 'string') {
        fields.push({
          id: `footer-cta-label-${bid}`,
          label: 'CTA Label',
          value: b.settings.button_label,
          path: ['sections', 'theme_footer', 'blocks', bid, 'settings', 'button_label'],
          topLevel: 'footer_group_json',
        });
      }
      if (typeof b.settings?.button_url === 'string') {
        fields.push({
          id: `footer-cta-url-${bid}`,
          label: 'CTA URL',
          value: b.settings.button_url,
          path: ['sections', 'theme_footer', 'blocks', bid, 'settings', 'button_url'],
          topLevel: 'footer_group_json',
        });
      }
      break; // only first content block
    }
  }

  // Rich Text section — Instagram follow line
  for (const [sid, sec] of Object.entries(sections)) {
    if (sec.type !== 'text') continue;
    const heading = sec.settings?.heading;
    if (typeof heading === 'string') {
      // Derive Instagram handle from "Follow us @handle ..." if present
      const match = heading.match(/@([A-Za-z0-9_.]+)/);
      if (match) {
        fields.push({
          id: `footer-ig-handle-${sid}`,
          label: 'Instagram Handle',
          value: match[1],
          path: ['sections', sid, 'settings', 'heading'],
          topLevel: 'footer_group_json',
        });
      }
      fields.push({
        id: `footer-richtext-heading-${sid}`,
        label: 'Richtext Heading',
        value: heading,
        path: ['sections', sid, 'settings', 'heading'],
        topLevel: 'footer_group_json',
      });
    }
    break; // only first text section
  }

  return fields;
}

// Deep-clone + write a single key at a JSON path, returning the new object.
function writeAtPath<T extends Record<string, unknown>>(
  obj: T,
  path: (string | number)[],
  value: unknown,
): T {
  const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const next = (cursor[key as string] ?? {}) as Record<string, unknown>;
    cursor[key as string] = next;
    cursor = next;
  }
  cursor[path[path.length - 1] as string] = value;
  return clone as T;
}

// For Instagram Handle edits — rewrites just the @HANDLE span inside the
// existing richtext heading string, preserving everything else.
function substituteInstagramHandle(existingHeading: string, newHandle: string): string {
  if (/@[A-Za-z0-9_.]+/.test(existingHeading)) {
    return existingHeading.replace(/@[A-Za-z0-9_.]+/, `@${newHandle}`);
  }
  // Fall back: if no @ in the original, just append.
  return `Follow us @${newHandle}`;
}

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

  // Generated Config section state
  const [configVersion, setConfigVersion] = useState<number | null>(null);
  const [configUpdatedAt, setConfigUpdatedAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'homepage' | 'pdp' | 'footer' | 'colors'>('homepage');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [pushingLabel, setPushingLabel] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ text: string; success: boolean } | null>(null);

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
          setConfigVersion(configData.config.version ?? null);
          setConfigUpdatedAt(configData.config.created_at ?? null);
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

  // ── Generated Config: push + save helpers ──────────────────────────────

  function buildSettingsData() {
    const variant = config?.color_variants?.[config?.selected_variant ?? 0];
    return variant ? { current: variant.theme_settings } : {};
  }

  async function doPush(mode: 'all' | 'homepage' | 'footer') {
    if (!config) return;
    const selectedTheme = themes.find(t => t.id === selectedThemeId);
    if (!selectedTheme || selectedTheme.role === 'main' || !client?.store_url) {
      setPushResult({ text: 'Select a non-main target theme first.', success: false });
      return;
    }
    setPushingLabel(mode);
    setPushResult(null);
    const body: Record<string, unknown> = {
      store_url: client.store_url,
      theme_id: selectedTheme.id,
      theme_name: selectedTheme.name,
    };
    if (mode === 'all' || mode === 'homepage') {
      body.index_json = config.index_json;
      body.settings_data = buildSettingsData();
    }
    if (mode === 'all') {
      if (config.product_json) body.product_json = config.product_json;
      if (config.about_json) body.about_json = config.about_json;
    }
    if (mode === 'all' || mode === 'footer') {
      if (config.footer_group_json) body.footer_group_json = config.footer_group_json;
    }
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');
      setPushResult({
        text: `Pushed ${Array.isArray(data.pushed_files) ? data.pushed_files.join(', ') : 'config'} → ${data.theme_name || selectedTheme.name}`,
        success: true,
      });
    } catch (err) {
      setPushResult({
        text: err instanceof Error ? err.message : 'Deploy failed',
        success: false,
      });
    } finally {
      setPushingLabel(null);
    }
  }

  async function handleFieldSave(field: Field, rawNewValue: string) {
    if (!config) return;
    setSavingFieldId(field.id);
    try {
      // Special case: Instagram handle edits rewrite the existing heading string
      // rather than replacing it wholesale.
      let valueToWrite: string = rawNewValue;
      if (field.id.startsWith('footer-ig-handle-')) {
        const footer = config.footer_group_json as ShopifyJson | null;
        const sid = field.path[1] as string;
        const existing = (footer?.sections?.[sid]?.settings?.heading as string | undefined) || '';
        valueToWrite = substituteInstagramHandle(existing, rawNewValue.trim().replace(/^@/, ''));
      }

      const topValue = config[field.topLevel];
      if (!topValue) throw new Error(`${field.topLevel} is null — nothing to update`);

      const updatedTop = writeAtPath(topValue as Record<string, unknown>, field.path, valueToWrite);
      const updatedConfig = { ...config, [field.topLevel]: updatedTop };

      const res = await fetch('/api/clients/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, config: updatedConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setConfig(updatedConfig);
      setEditingFieldId(null);
      setEditValue('');
    } catch (err) {
      setPushResult({
        text: err instanceof Error ? err.message : 'Save failed',
        success: false,
      });
    } finally {
      setSavingFieldId(null);
    }
  }

  // Memoize walker output so we don't re-walk the config on every render.
  const homepageFields = useMemo(() => collectHomepageFields(config?.index_json ?? null), [config?.index_json]);
  const pdpFields = useMemo(() => collectPdpFields(config?.product_json ?? null), [config?.product_json]);
  const footerFields = useMemo(() => collectFooterFields(config?.footer_group_json ?? null), [config?.footer_group_json]);

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

        {/* Generated Config — tabbed editor for saved Supabase config */}
        {config && (
          <Section title="Generated Config">
            {/* Header — timestamp + push buttons */}
            <div style={{
              background: colors.ink,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.xl,
              padding: spacing[5],
              boxShadow: shadow.card,
              marginBottom: spacing[4],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: spacing[4],
            }}>
              <div>
                <div style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.whiteAlpha55, marginBottom: 4 }}>
                  Last Generated
                </div>
                <div style={{ fontFamily: font.heading, fontSize: fontSize.base, color: colors.paper }}>
                  {configUpdatedAt
                    ? new Date(configUpdatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : '—'}
                  {configVersion !== null && (
                    <span style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.accent, marginLeft: spacing[3] }}>
                      v{configVersion}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => doPush('all')}
                  disabled={pushingLabel !== null || selectedThemeId === null}
                  style={{
                    ...styles.btnPrimary,
                    fontSize: fontSize.xs,
                    padding: '8px 14px',
                    opacity: pushingLabel !== null || selectedThemeId === null ? 0.4 : 1,
                    cursor: pushingLabel !== null ? 'wait' : selectedThemeId === null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {pushingLabel === 'all' ? 'Pushing…' : 'Push All Content'}
                </button>
                <button
                  type="button"
                  onClick={() => doPush('homepage')}
                  disabled={pushingLabel !== null || selectedThemeId === null}
                  style={{
                    ...styles.btnDark,
                    fontSize: fontSize.xs,
                    padding: '8px 14px',
                    background: colors.darkCard,
                    border: `1px solid ${colors.whiteAlpha15}`,
                    opacity: pushingLabel !== null || selectedThemeId === null ? 0.4 : 1,
                    cursor: pushingLabel !== null ? 'wait' : selectedThemeId === null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {pushingLabel === 'homepage' ? 'Pushing…' : 'Push Homepage'}
                </button>
                <button
                  type="button"
                  onClick={() => doPush('footer')}
                  disabled={pushingLabel !== null || selectedThemeId === null || !config.footer_group_json}
                  style={{
                    ...styles.btnDark,
                    fontSize: fontSize.xs,
                    padding: '8px 14px',
                    background: colors.darkCard,
                    border: `1px solid ${colors.whiteAlpha15}`,
                    opacity: pushingLabel !== null || selectedThemeId === null || !config.footer_group_json ? 0.4 : 1,
                    cursor: pushingLabel !== null ? 'wait' : selectedThemeId === null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {pushingLabel === 'footer' ? 'Pushing…' : 'Push Footer'}
                </button>
              </div>
            </div>

            {pushResult && (
              <div style={{
                background: pushResult.success ? colors.accentMid : 'rgba(185,28,28,0.1)',
                border: `1px solid ${pushResult.success ? colors.accent : colors.danger}`,
                borderRadius: radius.md,
                padding: `${spacing[3]}px ${spacing[4]}px`,
                marginBottom: spacing[4],
                fontFamily: font.mono,
                fontSize: fontSize.xs,
                color: pushResult.success ? colors.ink : colors.danger,
              }}>
                {pushResult.text}
              </div>
            )}

            {/* Tab bar */}
            <div style={{
              display: 'flex',
              gap: spacing[1],
              marginBottom: spacing[4],
              borderBottom: `1px solid ${colors.border}`,
            }}>
              {([
                { id: 'homepage', label: 'Homepage', count: homepageFields.length },
                { id: 'pdp', label: 'Product Page', count: pdpFields.length },
                { id: 'footer', label: 'Footer', count: footerFields.length },
                { id: 'colors', label: 'Colors', count: config.color_variants?.length ?? 0 },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: `${spacing[3]}px ${spacing[4]}px`,
                    fontFamily: font.heading,
                    fontWeight: activeTab === tab.id ? fontWeight.extrabold : fontWeight.semibold,
                    fontSize: fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: letterSpacing.wide,
                    color: activeTab === tab.id ? colors.ink : colors.muted,
                    borderBottom: `3px solid ${activeTab === tab.id ? colors.accent : 'transparent'}`,
                    marginBottom: -1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                  }}
                >
                  {tab.label}
                  <span style={{
                    fontFamily: font.mono,
                    fontSize: fontSize['2xs'],
                    color: activeTab === tab.id ? colors.accent : colors.subtle,
                    background: activeTab === tab.id ? colors.ink : colors.cream,
                    padding: '1px 6px',
                    borderRadius: radius.pill,
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab panel */}
            {activeTab !== 'colors' && (() => {
              const fields = activeTab === 'homepage' ? homepageFields : activeTab === 'pdp' ? pdpFields : footerFields;
              if (fields.length === 0) {
                return (
                  <div style={{
                    background: colors.darkCard,
                    border: `1px solid ${colors.whiteAlpha10}`,
                    borderRadius: radius.xl,
                    padding: spacing[8],
                    textAlign: 'center',
                    fontFamily: font.mono,
                    fontSize: fontSize.xs,
                    color: colors.whiteAlpha55,
                  }}>
                    No editable fields found for this tab.
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
                  {fields.map(field => {
                    const isEditing = editingFieldId === field.id;
                    const isSaving = savingFieldId === field.id;
                    return (
                      <div
                        key={field.id}
                        style={{
                          background: colors.darkCard,
                          border: `1px solid ${isEditing ? colors.accent : colors.whiteAlpha10}`,
                          borderRadius: radius.xl,
                          padding: `${spacing[4]}px ${spacing[5]}px`,
                          boxShadow: isEditing ? shadow.accent : 'none',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: spacing[2],
                        }}>
                          <span style={{
                            fontFamily: font.mono,
                            fontSize: fontSize['2xs'],
                            textTransform: 'uppercase',
                            letterSpacing: letterSpacing.wider,
                            color: isEditing ? colors.accent : colors.whiteAlpha55,
                          }}>
                            {field.label}
                          </span>
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFieldId(field.id);
                                setEditValue(field.value);
                              }}
                              title="Edit"
                              style={{
                                background: 'transparent',
                                border: `1px solid ${colors.whiteAlpha15}`,
                                borderRadius: radius.sm,
                                padding: '4px 8px',
                                fontFamily: font.mono,
                                fontSize: fontSize['2xs'],
                                color: colors.whiteAlpha70,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                              EDIT
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                            {field.multiline ? (
                              <textarea
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                rows={4}
                                style={{
                                  width: '100%',
                                  background: colors.ink,
                                  border: `1px solid ${colors.accent}`,
                                  borderRadius: radius.sm,
                                  padding: `${spacing[2]}px ${spacing[3]}px`,
                                  fontFamily: font.mono,
                                  fontSize: fontSize.sm,
                                  color: colors.paper,
                                  outline: 'none',
                                  resize: 'vertical',
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleFieldSave(field, editValue);
                                  if (e.key === 'Escape') { setEditingFieldId(null); setEditValue(''); }
                                }}
                                autoFocus
                                style={{
                                  width: '100%',
                                  background: colors.ink,
                                  border: `1px solid ${colors.accent}`,
                                  borderRadius: radius.sm,
                                  padding: `${spacing[2]}px ${spacing[3]}px`,
                                  fontFamily: font.mono,
                                  fontSize: fontSize.sm,
                                  color: colors.paper,
                                  outline: 'none',
                                }}
                              />
                            )}
                            <div style={{ display: 'flex', gap: spacing[2] }}>
                              <button
                                type="button"
                                onClick={() => handleFieldSave(field, editValue)}
                                disabled={isSaving}
                                style={{
                                  ...styles.btnPrimary,
                                  fontSize: fontSize['2xs'],
                                  padding: '6px 14px',
                                  opacity: isSaving ? 0.5 : 1,
                                  cursor: isSaving ? 'wait' : 'pointer',
                                }}
                              >
                                {isSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingFieldId(null); setEditValue(''); }}
                                disabled={isSaving}
                                style={{
                                  background: 'transparent',
                                  border: `1px solid ${colors.whiteAlpha20}`,
                                  borderRadius: radius.sm,
                                  padding: '6px 14px',
                                  fontFamily: font.heading,
                                  fontSize: fontSize['2xs'],
                                  textTransform: 'uppercase',
                                  letterSpacing: letterSpacing.wide,
                                  color: colors.whiteAlpha70,
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            fontFamily: font.heading,
                            fontSize: fontSize.sm,
                            color: colors.paper,
                            lineHeight: 1.6,
                            wordBreak: 'break-word',
                          }}>
                            {field.value || <span style={{ color: colors.whiteAlpha40, fontStyle: 'italic' }}>(empty)</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {activeTab === 'colors' && (
              <ColorSchemePanel variants={config.color_variants} selected={config.selected_variant || 0} />
            )}
          </Section>
        )}

        {!config && (
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
