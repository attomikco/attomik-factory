import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { join } from 'path';

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ---------------------------------------------------------------------------
// File loaders
// ---------------------------------------------------------------------------

async function loadFile(relativePath: string): Promise<string> {
  return readFile(join(process.cwd(), relativePath), 'utf-8');
}

async function loadJSON<T>(relativePath: string): Promise<T> {
  const raw = await loadFile(relativePath);
  return JSON.parse(raw) as T;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VariableEntry {
  key: string;
  type: string;
  section: string;
  instructions: string;
}

interface ColorVariant {
  name: string;
  theme_settings: Record<string, string>;
}

interface ScrapedProduct {
  title: string;
  description: string;
  image?: string | null;
}

interface ScrapedBrand {
  name?: string;
  colors?: string[];
  fonts?: string[];
  logo?: string | null;
  images?: { url: string; tag: string }[];
  products?: ScrapedProduct[];
  platform?: string | null;
  url?: string;
}

interface ImageMapEntry {
  section_id: string;
  section_type: string;
  block_id: string | null;
  block_type: string | null;
  setting_id: string;
  role: 'hero_background' | 'founder_portrait' | 'lifestyle' | 'product' | 'ugc';
  instructions: string;
}

interface ImageAssignment extends ImageMapEntry {
  url: string | null;
  source_tag: string | null;
}

interface BrandBrief {
  brand_name: string;
  one_liner: string;
  category: string;
  target_audience: string;
  brand_vibe?: string[];
  competitors?: string;
  differentiators?: string;
  primary_color?: string;
  secondary_color?: string;
  notes?: string;
  scraped_brand?: ScrapedBrand;
  store_url?: string;
  api_key?: string;
}

// ---------------------------------------------------------------------------
// Step 0 — Image Assignment
// ---------------------------------------------------------------------------

// Which scraped tags satisfy each image-map role, in priority order.
// First-match wins; later options are fallbacks when the preferred tag runs out.
const ROLE_TAG_PRIORITY: Record<ImageMapEntry['role'], string[]> = {
  hero_background:  ['hero', 'lifestyle', 'collection', 'product', 'other'],
  founder_portrait: ['lifestyle', 'other', 'hero'],
  lifestyle:        ['lifestyle', 'hero', 'collection', 'other', 'product'],
  product:          ['product', 'collection', 'hero', 'lifestyle', 'other'],
  ugc:              ['lifestyle', 'other', 'hero'],
};

async function assignImages(
  scrapedImages: { url: string; tag: string }[],
): Promise<ImageAssignment[]> {
  console.log('[Step 0] Assigning scraped images to template slots');

  const imageMap = await loadJSON<ImageMapEntry[]>('templates/image-map.json');

  // Bucket scraped images by tag for round-robin consumption.
  const pools: Record<string, string[]> = {};
  for (const img of scrapedImages) {
    (pools[img.tag] ||= []).push(img.url);
  }
  // Track which URLs are already used so we don't assign the same photo twice
  // unless we exhaust the pool.
  const used = new Set<string>();

  function takeForRole(role: ImageMapEntry['role']): { url: string; tag: string } | null {
    const priority = ROLE_TAG_PRIORITY[role];
    // First pass: unused images in priority order.
    for (const tag of priority) {
      const bucket = pools[tag];
      if (!bucket) continue;
      const pick = bucket.find(u => !used.has(u));
      if (pick) {
        used.add(pick);
        return { url: pick, tag };
      }
    }
    // Second pass: allow reuse from the preferred tag, then any tag.
    for (const tag of priority) {
      const bucket = pools[tag];
      if (bucket && bucket.length > 0) {
        return { url: bucket[0], tag };
      }
    }
    // Last resort: any scraped image.
    if (scrapedImages.length > 0) {
      return { url: scrapedImages[0].url, tag: scrapedImages[0].tag };
    }
    return null;
  }

  const assignments: ImageAssignment[] = imageMap.map(entry => {
    const pick = takeForRole(entry.role);
    return {
      ...entry,
      url: pick?.url ?? null,
      source_tag: pick?.tag ?? null,
    };
  });

  const filled = assignments.filter(a => a.url).length;
  console.log(`[Step 0] Assigned ${filled}/${assignments.length} image slots`);
  return assignments;
}

function injectImageAssignments(
  indexJson: Record<string, unknown>,
  assignments: ImageAssignment[],
): Record<string, unknown> {
  const sections = (indexJson.sections || {}) as Record<string, {
    settings?: Record<string, unknown>;
    blocks?: Record<string, { settings?: Record<string, unknown> }>;
  }>;

  let injected = 0;
  for (const a of assignments) {
    if (!a.url) continue;
    const section = sections[a.section_id];
    if (!section) continue;

    if (a.block_id === null) {
      section.settings = section.settings || {};
      section.settings[a.setting_id] = a.url;
      injected++;
    } else {
      const block = section.blocks?.[a.block_id];
      if (!block) continue;
      block.settings = block.settings || {};
      block.settings[a.setting_id] = a.url;
      injected++;
    }
  }

  console.log(`[Step 0] Injected ${injected} image URLs into index.json`);
  return indexJson;
}

// ---------------------------------------------------------------------------
// Step 1 — Color System Generation
// ---------------------------------------------------------------------------

const NEUTRAL_LIGHT: Record<string, string> = {
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
};

async function generateColorVariants(
  primaryColor: string,
  secondaryColor: string,
  anthropic: Anthropic,
): Promise<ColorVariant[]> {
  console.log('[Step 1] Generating color system from:', primaryColor, secondaryColor);

  let colorPrompt: string;
  try {
    colorPrompt = await loadFile('prompts/color-system-prompt.md');
  } catch {
    console.log('[Step 1] color-system-prompt.md not found — using inline color generation');

    // Inline color generation without the prompt file
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a color system generator for ecommerce themes. Given a primary brand color and secondary color, generate 4 theme variants. Return ONLY valid JSON — no markdown, no explanation.

Return this exact structure:
{
  "light": {
    "body": "#ffffff",
    "text": "#1a1a1a",
    "alternativeText": "#ffffff",
    "primaryBackground": "<primary color>",
    "primaryForeground": "<contrast text for primary>",
    "secondaryBackground": "<secondary color>",
    "secondaryForeground": "<contrast text for secondary>",
    "tertiaryBackground": "<very light tint of primary>",
    "tertiaryForeground": "#1a1a1a"
  },
  "dark": {
    "body": "#0a0a0a",
    "text": "#f5f5f5",
    "alternativeText": "#0a0a0a",
    "primaryBackground": "<primary color>",
    "primaryForeground": "<contrast text for primary>",
    "secondaryBackground": "<secondary color>",
    "secondaryForeground": "<contrast text for secondary>",
    "tertiaryBackground": "#1a1a1a",
    "tertiaryForeground": "#f5f5f5"
  },
  "alt_light": {
    "body": "<warm off-white derived from primary>",
    "text": "#1a1a1a",
    "alternativeText": "#ffffff",
    "primaryBackground": "<darker shade of primary>",
    "primaryForeground": "#ffffff",
    "secondaryBackground": "<muted secondary>",
    "secondaryForeground": "#ffffff",
    "tertiaryBackground": "<light warm neutral>",
    "tertiaryForeground": "#1a1a1a"
  },
  "alt_dark": {
    "body": "<very dark shade of primary>",
    "text": "#f0f0f0",
    "alternativeText": "#0a0a0a",
    "primaryBackground": "<bright/saturated primary>",
    "primaryForeground": "#0a0a0a",
    "secondaryBackground": "<light secondary>",
    "secondaryForeground": "#0a0a0a",
    "tertiaryBackground": "<dark mid-tone>",
    "tertiaryForeground": "#f0f0f0"
  }
}

Rules:
- All values must be valid hex colors
- Primary and secondary backgrounds must maintain the brand's identity
- Foreground colors must pass WCAG AA contrast against their backgrounds
- Light variants have white/off-white body, dark variants have near-black body
- Tertiary is always a subtle, muted tone — never the brand color at full saturation`,
      messages: [{
        role: 'user',
        content: `Generate 4 theme color variants for these brand colors:\nPrimary: ${primaryColor}\nSecondary: ${secondaryColor}`,
      }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No response from color generation');
    }

    let json = textBlock.text.trim();
    if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const variants = JSON.parse(json);

    return mapColorVariants(variants);
  }

  // If prompt file exists, use it
  colorPrompt = colorPrompt
    .replace(/\[INSERT_HEX\]/g, primaryColor)
    .replace(/\[INSERT_SECONDARY_HEX\]/g, secondaryColor);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: colorPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No response from color generation');
  }

  let json = textBlock.text.trim();
  if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const variants = JSON.parse(json);

  return mapColorVariants(variants);
}

function mapColorVariants(variants: Record<string, Record<string, string>>): ColorVariant[] {
  const variantNames = ['light', 'dark', 'alt_light', 'alt_dark'];

  return variantNames.map((name) => {
    const v = variants[name];
    if (!v) {
      return { name, theme_settings: { ...NEUTRAL_LIGHT } };
    }
    return {
      name,
      theme_settings: {
        color_background_body: v.body || '#ffffff',
        color_foreground_body: v.text || '#1a1a1a',
        color_foreground_body_alt: v.alternativeText || '#ffffff',
        color_background_primary: v.primaryBackground || '#000000',
        color_foreground_primary: v.primaryForeground || '#ffffff',
        color_background_secondary: v.secondaryBackground || '#2c2c2c',
        color_foreground_secondary: v.secondaryForeground || '#ffffff',
        color_background_tertiary: v.tertiaryBackground || '#f5f5f5',
        color_foreground_tertiary: v.tertiaryForeground || '#1a1a1a',
        color_bar: v.mobileBar || v.body || '#ffffff',
        color_background_overlay: v.overlayBackground || 'linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) 100%)',
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Step 2 — Variable Generation
// ---------------------------------------------------------------------------

const GENERATABLE_TYPES = new Set(['text', 'richtext', 'color', 'collection']);

async function generateVariableValues(
  brief: BrandBrief,
  anthropic: Anthropic,
): Promise<Record<string, string>> {
  console.log('[Step 2] Generating variable values for:', brief.brand_name);

  const designRules = await loadFile('prompts/design-rules.md');
  const variableMap = await loadJSON<VariableEntry[]>('templates/variable-map.json');

  // Build variable instructions grouped by section — include all generatable types
  const generatableVars = variableMap.filter(v => GENERATABLE_TYPES.has(v.type));

  let variableBlock = '';
  let currentSection = '';
  for (const v of generatableVars) {
    if (v.section !== currentSection) {
      currentSection = v.section;
      variableBlock += `\n### ${v.section}\n`;
    }
    variableBlock += `- "${v.key}" (${v.type}): ${v.instructions}\n`;
  }

  // Build product list from scraped data
  const scraped = brief.scraped_brand;
  let productList = 'No products detected';
  if (scraped?.products && scraped.products.length > 0) {
    productList = scraped.products
      .map(p => `${p.title}: ${p.description || 'No description'}`)
      .join('\n');
  }

  // Infer variant option name from product data
  let variantOptionHint = 'Not detected — default to "Size"';
  if (scraped?.products && scraped.products.length > 0) {
    const titles = scraped.products.map(p => p.title.toLowerCase()).join(' ');
    if (/\d+\s*(oz|ml|g|kg|lb|pack|ct|count)/i.test(titles)) {
      variantOptionHint = 'Likely "Size" (weight/volume variants detected)';
    } else if (/pack|bundle|set/i.test(titles)) {
      variantOptionHint = 'Likely "Pack" (bundle variants detected)';
    } else if (scraped.products.length > 2) {
      const uniqueWords = new Set(scraped.products.map(p => p.title.split(/\s+/)[0]));
      if (uniqueWords.size < scraped.products.length) {
        variantOptionHint = 'Likely "Flavor" (flavor variants detected)';
      }
    }
  }

  const systemPrompt = `${designRules}

---

BRAND BRIEF:
- Brand name: ${brief.brand_name}
- Category: ${brief.category}
- One-liner: ${brief.one_liner}
- Target audience: ${brief.target_audience}
- Brand vibe: ${brief.brand_vibe?.join(', ') || 'Not specified'}
- Key differentiators: ${brief.differentiators || 'Not specified'}
- Competitors: ${brief.competitors || 'Not specified'}
- Products: ${productList}
- Variant option hint: ${variantOptionHint}
- Primary color: ${brief.primary_color || 'Not specified'}
- Secondary color: ${brief.secondary_color || 'Not specified'}
- Fonts detected: ${scraped?.fonts?.join(', ') || 'Not specified'}

---

ADDITIONAL GENERATION RULES:

NAVIGATION:
- Nav links should follow CPG brand conventions: Shop, Our Story, Subscribe, Find Us (or Locator), FAQ
- URLs should use standard Shopify paths: /collections/all, /pages/about, /pages/faq, /pages/store-locator
- Keep labels to 1–2 words maximum

ANNOUNCEMENT BAR:
- Always lead with a shipping offer or discount: "Free Shipping On Orders Over $X" or "Subscribe & Save X%"
- Keep it under 60 characters total
- Wrap in <p> tags since it is a richtext field

FOOTER:
- footer_tagline: brand one-liner — distilled version of the hero subhead, under 10 words. Wires into the footer content block's heading.
- footer_about_heading: short content-block section heading (e.g. "About Us", "Our Story"). 2-3 words.
- footer_about_content: richtext in <p> tags — 2-3 sentence brand description that wires into the footer content block's body.
- footer_cta_label: 1-3 word button label for the footer content block (e.g. "Shop All", "Our Story"). Return "" if no CTA is warranted.
- footer_cta_url: Shopify internal URL (shopify://collections/... or shopify://pages/...) for the footer content-block button. Return "" when footer_cta_label is empty.
- Footer navigation columns (Shop / Company / Support link groups) are Shopify admin linklists — DO NOT generate values for them. They're configured per store in Shopify Admin → Online Store → Navigation.
- Social URLs (footer_instagram_url, footer_tiktok_url, footer_facebook_url): always return "" — client fills these in
- footer_legal_text: generate an appropriate legal disclaimer based on product category:
  - Beverage with alcohol/THC: include age verification and regulatory disclaimer
  - Supplement: include FDA "not intended to diagnose, treat, cure, or prevent any disease" disclaimer
  - Food: include allergen processing facility note
  - General CPG: standard copyright notice with brand name and year
- footer_newsletter_heading: action-oriented, includes specific benefit
- footer_newsletter_content: richtext in <p> tags, mentions exact subscriber perks

PDP BADGE BLOCK:
- pdp_badge_text: short, specific, origin or certification claim — never generic like "Premium Quality"
- pdp_badge_emoji: single emoji that reinforces the claim (🇲🇽 for origin, 🌿 for natural, 🔬 for clinical)
- pdp_badge_bg_color: use the brand primary color
- pdp_badge_font_color: must contrast against bg_color — use #ffffff on dark, #1a1a1a on light

PDP CHECKLIST BLOCK:
- Generate exactly 5 items — each a specific product benefit, not a generic marketing claim
- Start each with a differentiator: ingredient name, certification, or measurable claim
- Item 5 should be quantity/value proof (e.g. "50 servings per bag", "100 glasses per kit")
- pdp_checklist_value_tag: "★ Best Value" or similar with star prefix
- pdp_checklist_value_text: include specific math — quantity, unit count, and per-unit cost
- pdp_checklist_check_color: brand primary color hex

PDP PERKS MARQUEE:
- Subscription-focused benefits only
- Item 1: save percentage (e.g. "Save 15% on every order")
- Item 2: free shipping (e.g. "Free shipping every delivery")
- Item 3: flexibility (e.g. "Cancel or pause anytime")
- Items 4–5: convenience or priority perks
- pdp_perks_header_bg: brand primary or accent color
- pdp_perks_header_text: contrasting text color
- pdp_perks_marquee_bg: "#ffffff" or very light tint
- pdp_perks_marquee_text: "#1a1a1a" or brand body text color

PDP VARIANT CARDS:
- pdp_variant_option_name: infer from scraped product data (use variant option hint above) — "Size", "Pack", or "Flavor"
- pdp_free_shipping_threshold: set to "50" unless product prices suggest a different threshold
- pdp_popular_badge_bg: secondary or accent brand color
- pdp_best_badge_bg: primary brand color

COLOR VARIABLES:
- All color type variables must be valid 7-character hex codes (e.g. "#D4266A")
- Foreground/text colors must pass WCAG AA contrast (4.5:1) against their paired background
- Badge and perks colors should derive from the brand's primary and secondary palette

---

TASK:
Generate values for every variable below. Return ONLY a valid JSON object where each key is the variable name and each value is the generated content. No markdown, no explanation, no preamble.

For image variables: return null
For url variables: return ""
For collection variables: infer the most likely Shopify collection handle from the brand category (e.g. "all-products", "shop", "coffee", "skincare")
For color variables: return a valid hex color string (e.g. "#D4266A")
For richtext variables: return valid HTML (e.g. "<p>Free Shipping On Orders Over $50</p>")

VARIABLES:
${variableBlock}`;

  const userMessage = `Generate the complete JSON object now with all ${generatableVars.length} variables filled in. Use "${brief.brand_name}" as the brand name in all copy. For table_headings use "${brief.brand_name}, Everyone Else". All social URL variables must be empty strings.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No response from variable generation');
  }

  // Log if output was truncated (stop_reason !== 'end_turn')
  if (message.stop_reason !== 'end_turn') {
    console.warn('[Step 2] WARNING: Output truncated! stop_reason:', message.stop_reason);
  }

  let json = textBlock.text.trim();
  if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  // Attempt to repair truncated JSON — if it doesn't end with }, try closing it
  if (!json.endsWith('}')) {
    console.warn('[Step 2] JSON appears truncated, attempting repair...');
    // Find the last complete key-value pair and close the object
    const lastQuote = json.lastIndexOf('"');
    const lastComma = json.lastIndexOf(',');
    const cutPoint = Math.max(lastQuote, lastComma);
    if (cutPoint > 0) {
      // Trim back to last complete value (after a comma or closing quote)
      let repaired = json.substring(0, lastComma > 0 ? lastComma : cutPoint);
      // Ensure we end cleanly
      if (!repaired.endsWith('}') && !repaired.endsWith('"')) {
        repaired = repaired.substring(0, repaired.lastIndexOf('"') + 1);
      }
      repaired += '}';
      json = repaired;
    }
  }

  const values = JSON.parse(json) as Record<string, string>;
  console.log('[Step 2] Generated', Object.keys(values).length, 'of', generatableVars.length, 'variable values');

  // Diagnostic: check about page variable coverage
  const aboutKeys = ['about_hero_heading', 'about_founder_name', 'about_mission_heading'];
  for (const key of aboutKeys) {
    console.log(`[Step 2] ${key}:`, values[key] ? `"${String(values[key]).substring(0, 60)}..."` : 'MISSING');
  }

  // Warn if significant number of variables are missing
  const missingVars = generatableVars.filter(v => !(v.key in values));
  if (missingVars.length > 0) {
    console.warn(`[Step 2] Missing ${missingVars.length} variables:`, missingVars.map(v => v.key).join(', '));
  }

  return values;
}

// ---------------------------------------------------------------------------
// Step 3 — Template Merge
// ---------------------------------------------------------------------------

function applyValuesToTemplate(
  templateStr: string,
  values: Record<string, string>,
): string {
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    if (!templateStr.includes(placeholder)) continue;

    if (value === '__NULL__' || value === null) {
      // Replace "{{var}}" (with quotes) with null (no quotes) for image fields
      templateStr = templateStr.split(`"${placeholder}"`).join('null');
    } else {
      // Escape the value for JSON string embedding
      const escaped = String(value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      templateStr = templateStr.split(placeholder).join(escaped);
    }
  }

  // Check for any remaining unreplaced variables
  const remaining = templateStr.match(/\{\{[^}]+\}\}/g);
  if (remaining) {
    console.warn('[Step 3] Unreplaced variables:', remaining.length, remaining.slice(0, 5));
    for (const match of remaining) {
      const withQuotes = `"${match}"`;
      if (templateStr.includes(withQuotes)) {
        templateStr = templateStr.split(withQuotes).join('""');
      }
      templateStr = templateStr.split(match).join('');
    }
  }

  return templateStr;
}

interface MergedTemplates {
  index: Record<string, unknown>;
  product: Record<string, unknown>;
  about: Record<string, unknown>;
  footerGroup: Record<string, unknown>;
}

async function mergeTemplates(
  values: Record<string, string>,
): Promise<MergedTemplates> {
  console.log('[Step 3] Merging values into base templates');

  const variableMap = await loadJSON<VariableEntry[]>('templates/variable-map.json');

  // Set image vars to null, url vars to empty string (overrides any Claude output)
  const imageVars = variableMap.filter(v => v.type === 'image');
  const urlVars = variableMap.filter(v => v.type === 'url');
  for (const v of imageVars) values[v.key] = '__NULL__';
  for (const v of urlVars) {
    if (!values[v.key]) values[v.key] = '';
  }

  // Merge homepage template (index.json)
  const baseTemplate = await loadJSON<Record<string, unknown>>('templates/base-template.json');
  const indexStr = applyValuesToTemplate(JSON.stringify(baseTemplate), values);
  const indexResult = JSON.parse(indexStr);

  // Merge PDP template (product.json)
  const basePdp = await loadJSON<Record<string, unknown>>('templates/base-pdp.json');
  const pdpStr = applyValuesToTemplate(JSON.stringify(basePdp), values);
  const pdpResult = JSON.parse(pdpStr);

  // Merge About template (page.about.json)
  const baseAbout = await loadJSON<Record<string, unknown>>('templates/base-about.json');
  const aboutStr = applyValuesToTemplate(JSON.stringify(baseAbout), values);
  const aboutResult = JSON.parse(aboutStr);

  // Merge Footer group template (sections/footer-group.json)
  const baseFooterGroup = await loadJSON<Record<string, unknown>>('templates/base-footer-group.json');
  const footerGroupStr = applyValuesToTemplate(JSON.stringify(baseFooterGroup), values);
  const footerGroupResult = JSON.parse(footerGroupStr);

  console.log('[Step 3] Template merge complete (index + product + about + footer-group)');
  return {
    index: indexResult,
    product: pdpResult,
    about: aboutResult,
    footerGroup: footerGroupResult,
  };
}

// ---------------------------------------------------------------------------
// POST handler — 4-step pipeline
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const brief = request.json ? await request.json() as BrandBrief : {} as BrandBrief;
    const anthropic = getAnthropicClient();

    const scraped = brief.scraped_brand;
    const primaryColor = scraped?.colors?.[0] || brief.primary_color || '#000000';
    const secondaryColor = scraped?.colors?.[1] || brief.secondary_color || '#2c2c2c';

    // Ensure colors are on the brief for downstream use
    brief.primary_color = primaryColor;
    brief.secondary_color = secondaryColor;

    // -----------------------------------------------------------------------
    // Step 0 — Image Assignment
    // -----------------------------------------------------------------------
    const imageAssignments = await assignImages(scraped?.images || []);

    // -----------------------------------------------------------------------
    // Step 1 — Color System
    // -----------------------------------------------------------------------
    let colorVariants: ColorVariant[];
    try {
      colorVariants = await generateColorVariants(primaryColor, secondaryColor, anthropic);
      console.log('[Step 1] Color system generated:', colorVariants.length, 'variants');
    } catch (err) {
      console.error('[Step 1] Color generation failed, using neutral fallback:', err);
      colorVariants = [
        { name: 'light', theme_settings: { ...NEUTRAL_LIGHT } },
        { name: 'dark', theme_settings: {
          color_background_body: '#0a0a0a', color_foreground_body: '#f5f5f5',
          color_foreground_body_alt: '#0a0a0a',
          color_background_primary: primaryColor, color_foreground_primary: '#ffffff',
          color_background_secondary: secondaryColor, color_foreground_secondary: '#ffffff',
          color_background_tertiary: '#1a1a1a', color_foreground_tertiary: '#f5f5f5',
        }},
        { name: 'alt_light', theme_settings: { ...NEUTRAL_LIGHT, color_background_primary: primaryColor } },
        { name: 'alt_dark', theme_settings: {
          color_background_body: '#111111', color_foreground_body: '#f0f0f0',
          color_foreground_body_alt: '#111111',
          color_background_primary: primaryColor, color_foreground_primary: '#ffffff',
          color_background_secondary: secondaryColor, color_foreground_secondary: '#ffffff',
          color_background_tertiary: '#1e1e1e', color_foreground_tertiary: '#f0f0f0',
        }},
      ];
    }

    // -----------------------------------------------------------------------
    // Step 2 — Variable Generation
    // -----------------------------------------------------------------------
    const generatedValues = await generateVariableValues(brief, anthropic);

    // -----------------------------------------------------------------------
    // Step 3 — Template Merge (index + product)
    // -----------------------------------------------------------------------
    const {
      index: indexJsonRaw,
      product: productJson,
      about: aboutJson,
      footerGroup: footerGroupJson,
    } = await mergeTemplates(generatedValues);

    // Inject assigned image URLs into merged index.json settings.
    const indexJson = injectImageAssignments(indexJsonRaw, imageAssignments);

    // -----------------------------------------------------------------------
    // Step 4 — Assemble: merge base-settings + color variants
    // -----------------------------------------------------------------------
    const baseSettings = await loadJSON<Record<string, unknown>>('templates/base-settings.json');
    // Remove the _comment field — not a Shopify setting
    delete baseSettings._comment;

    // Each color variant gets base-settings as foundation, then color tokens on top
    const mergedVariants = colorVariants.map(variant => ({
      name: variant.name,
      theme_settings: {
        ...baseSettings,
        ...variant.theme_settings,
      } as Record<string, string>,
    }));

    console.log('[Step 4] Assembly complete for:', brief.brand_name);

    return NextResponse.json({
      color_variants: mergedVariants,
      index_json: indexJson,
      product_json: productJson,
      about_json: aboutJson,
      footer_group_json: footerGroupJson,
      image_assignments: imageAssignments,
      brand_data: scraped || {
        name: brief.brand_name,
        colors: [primaryColor, secondaryColor],
        fonts: [],
        products: [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    console.error('[Pipeline Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
