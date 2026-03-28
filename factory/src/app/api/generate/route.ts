import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SYSTEM_PROMPT = `You are a brand strategist and Shopify theme configurator for Attomik, a CPG brand accelerator. Given a brand brief, generate a complete brand configuration JSON for a Shopify store.

Return ONLY valid JSON with this exact structure:

{
  "tokens": {
    "color_primary": "#hex",
    "color_primary_light": "#hex",
    "color_primary_dark": "#hex",
    "color_secondary": "#hex",
    "color_secondary_light": "#hex",
    "color_secondary_dark": "#hex",
    "color_accent": "#hex",
    "color_accent_light": "#hex",
    "color_bg": "#hex",
    "color_bg_alt": "#hex",
    "color_bg_dark": "#hex",
    "color_text": "#hex",
    "color_text_secondary": "#hex",
    "color_text_muted": "#hex",
    "color_text_inverse": "#hex",
    "color_text_link": "#hex",
    "font_heading": "shopify_font_handle",
    "font_body": "shopify_font_handle"
  },
  "copy": {
    "hero_eyebrow": "short eyebrow text",
    "hero_headline": "compelling headline",
    "hero_subheadline": "supporting copy",
    "hero_cta_primary": "CTA button text",
    "hero_cta_secondary": "secondary CTA text",
    "ticker_items": ["item1", "item2", "item3", "item4", "item5"],
    "pillars": [
      { "headline": "Pillar 1", "description": "Description" },
      { "headline": "Pillar 2", "description": "Description" },
      { "headline": "Pillar 3", "description": "Description" }
    ],
    "founder_eyebrow": "eyebrow",
    "founder_headline": "headline",
    "founder_body": "<p>HTML body copy</p>",
    "subscription_eyebrow": "eyebrow",
    "subscription_headline": "headline",
    "subscription_cta": "CTA text",
    "subscription_fine_print": "fine print",
    "subscription_benefits": ["benefit1", "benefit2", "benefit3"],
    "reviews_title": "section title",
    "comparison_title": "section title",
    "comparison_brand_label": "brand name",
    "comparison_rows": [
      { "attribute": "Feature", "brand_has_it": true, "competitor_has_it": false },
      { "attribute": "Feature", "brand_has_it": true, "competitor_has_it": false },
      { "attribute": "Feature", "brand_has_it": true, "competitor_has_it": true }
    ],
    "faq_title": "section title",
    "faqs": [
      { "question": "Q1?", "answer": "<p>A1</p>" },
      { "question": "Q2?", "answer": "<p>A2</p>" },
      { "question": "Q3?", "answer": "<p>A3</p>" }
    ],
    "footer_tagline": "brand tagline"
  },
  "section_order": [
    "hero-fullbleed",
    "ingredient-ticker",
    "brand-pillars",
    "product-collection",
    "founder-story",
    "comparison-table",
    "reviews-carousel",
    "subscription-banner",
    "faq-accordion"
  ]
}

Guidelines:
- Colors should form a cohesive palette matching the brand vibe
- If a primary color preference is provided, build the palette around it
- Use valid Shopify font handles (e.g., "inter_n4", "playfair_display_n7", "dm_sans_n4", "syne_n7", "epilogue_n4", "cormorant_garamond_n4")
- Copy should be specific to the brand, not generic placeholder text
- Hero headline should be punchy and memorable (under 8 words ideal)
- FAQ answers should be realistic and specific to the product category
- Ticker items should highlight key differentiators
- Comparison rows should contrast with typical competitors in the category
- All copy should match the specified brand vibe (e.g. Premium = elevated language, Playful = casual, Clinical = precise)
- Return ONLY the JSON object, no markdown fences, no explanation`;

export async function POST(request: NextRequest) {
  try {
    const brief = await request.json();

    const userPrompt = `Generate a complete brand configuration for this CPG brand:

Brand Name: ${brief.brand_name}
One-Liner: ${brief.one_liner}
Category: ${brief.category}
Target Audience: ${brief.target_audience}
Brand Vibe: ${brief.brand_vibe?.join(', ') || 'Not specified'}
Competitors: ${brief.competitors || 'Not specified'}
Key Differentiators: ${brief.differentiators || 'Not specified'}
Primary Color Preference: ${brief.primary_color || 'No preference'}
Additional Notes: ${brief.notes || 'None'}`;

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text response from Claude' }, { status: 500 });
    }

    const config = JSON.parse(textBlock.text);

    // Save to Supabase if configured
    let client = null;
    let brandConfig = null;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = getSupabaseAdmin();

        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .insert({
            brand_name: brief.brand_name,
            store_url: brief.store_url || '',
            api_key: brief.api_key || '',
            status: 'draft',
          })
          .select()
          .single();

        if (!clientError && clientData) {
          client = clientData;

          const { data: configData } = await supabase
            .from('brand_configs')
            .insert({
              client_id: client.id,
              config,
              version: 1,
            })
            .select()
            .single();

          brandConfig = configData;
        }
      } catch {
        // Supabase save failed — continue without persisting
      }
    }

    return NextResponse.json({
      client,
      config: brandConfig,
      generated: config,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
