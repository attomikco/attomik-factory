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

const SYSTEM_PROMPT = `You are a brand strategist and Shopify theme configurator for Attomik, a CPG brand accelerator. Given a brand brief, generate a complete brand configuration JSON that maps directly to the theme's real Shopify section schemas and setting IDs.

Return ONLY valid JSON with this exact structure:

{
  "theme_settings": {
    "color_background_body": "#hex — main page background",
    "color_foreground_body": "#hex — main body text",
    "color_foreground_body_alt": "#hex — inverse text (on dark bg)",
    "color_background_primary": "#hex — primary brand color (buttons, accents)",
    "color_foreground_primary": "#hex — text on primary bg",
    "color_background_secondary": "#hex — secondary brand color",
    "color_foreground_secondary": "#hex — text on secondary bg",
    "color_background_tertiary": "#hex — tertiary accent color",
    "color_foreground_tertiary": "#hex — text on tertiary bg",
    "color_bar": "#hex — announcement bar / accent bar color",
    "type_font_heading": "shopify_font_handle — heading font",
    "type_font_body": "shopify_font_handle — body font",
    "type_font_nav": "shopify_font_handle — navigation font",
    "type_heading_capitilization": "uppercase | capitalize | none",
    "border_element_radius": 0-48,
    "border_button_radius": 0-48,
    "border_input_radius": 0-48
  },
  "sections": {
    "banner_hero": {
      "type": "banner",
      "settings": {
        "layout_y_spacing": "banner--h-xl",
        "color_scheme": "color__bg-overlay-1 color__text",
        "color_text": "color__light",
        "enable_gradient": true,
        "layout_y_alignment": "items-end",
        "layout_x_alignment": "justify-center text-center",
        "enable_margin": true,
        "enable_max_width": true
      },
      "blocks": {
        "heading_1": {
          "type": "heading",
          "settings": {
            "content": "Hero headline — punchy, under 8 words",
            "font_size_mobile": 34,
            "font_size_desktop": 50
          }
        },
        "content_1": {
          "type": "content",
          "settings": {
            "content": "<p>Supporting subheadline copy — 1-2 sentences</p>"
          }
        },
        "buttons_1": {
          "type": "buttons",
          "settings": {
            "button_label": "Primary CTA text",
            "button_url": "",
            "color_button": "btn",
            "secondary_button_label": "Secondary CTA text",
            "secondary_button_url": "",
            "secondary_color_button": "btn btn--plain"
          }
        }
      },
      "block_order": ["heading_1", "content_1", "buttons_1"]
    },

    "marquee_ticker": {
      "type": "marquee",
      "settings": {
        "spacing_top": 0,
        "spacing_bottom": 0,
        "color_scheme": "color__bg-primary",
        "color_text": "color__light",
        "enable_fade": false,
        "style_border": "",
        "enable_margin": false,
        "animation_speed": 150
      },
      "blocks": {
        "item_1": { "type": "heading", "settings": { "content": "differentiator 1" } },
        "divider_1": { "type": "heading", "settings": { "content": "✦" } },
        "item_2": { "type": "heading", "settings": { "content": "differentiator 2" } },
        "divider_2": { "type": "heading", "settings": { "content": "✦" } },
        "item_3": { "type": "heading", "settings": { "content": "differentiator 3" } },
        "divider_3": { "type": "heading", "settings": { "content": "✦" } },
        "item_4": { "type": "heading", "settings": { "content": "differentiator 4" } },
        "divider_4": { "type": "heading", "settings": { "content": "✦" } }
      },
      "block_order": ["item_1", "divider_1", "item_2", "divider_2", "item_3", "divider_3", "item_4", "divider_4"]
    },

    "text_intro": {
      "type": "text",
      "settings": {
        "heading": "Section heading",
        "content": "<p>Brand story introduction — 2-3 sentences about the brand's mission and what makes it different</p>",
        "spacing_top": 100,
        "spacing_bottom": 0,
        "color_scheme": "color__bg-body",
        "style_text_alignment": "text-center",
        "layout_x_alignment": "justify-center",
        "layout_column_width": 80,
        "enable_margin": true
      }
    },

    "icon_grid_pillars": {
      "type": "icon-grid",
      "settings": {
        "heading": "",
        "spacing_top": 60,
        "spacing_bottom": 60,
        "color_scheme": "color__bg-body",
        "layout_row_desktop": 3,
        "layout_row_mobile": 1,
        "enable_margin": true
      },
      "blocks": {
        "pillar_1": {
          "type": "icon",
          "settings": {
            "heading": "Pillar 1 headline",
            "content": "<p>Description of brand pillar</p>",
            "enable_padding": true,
            "color_scheme": "color__bg-body color__text",
            "x_alignment": "text-center justify-center",
            "layout_col_span": "col-span-1 md:col-span-1"
          }
        },
        "pillar_2": {
          "type": "icon",
          "settings": {
            "heading": "Pillar 2 headline",
            "content": "<p>Description of brand pillar</p>",
            "enable_padding": true,
            "color_scheme": "color__bg-body color__text",
            "x_alignment": "text-center justify-center",
            "layout_col_span": "col-span-1 md:col-span-1"
          }
        },
        "pillar_3": {
          "type": "icon",
          "settings": {
            "heading": "Pillar 3 headline",
            "content": "<p>Description of brand pillar</p>",
            "enable_padding": true,
            "color_scheme": "color__bg-body color__text",
            "x_alignment": "text-center justify-center",
            "layout_col_span": "col-span-1 md:col-span-1"
          }
        }
      },
      "block_order": ["pillar_1", "pillar_2", "pillar_3"]
    },

    "product_grid_featured": {
      "type": "product-grid",
      "settings": {
        "products_count": 4,
        "heading": "Featured collection heading",
        "content": "<p>Short description of the collection</p>",
        "button_label": "Shop All",
        "spacing_top": 100,
        "spacing_bottom": 100,
        "color_scheme": "color__bg-body",
        "layout_row_desktop": 4,
        "layout_row_mobile": 1,
        "layout_x_alignment": "text-center justify-center flex-col items-center",
        "enable_margin": true
      }
    },

    "image_text_story": {
      "type": "image-text",
      "settings": {
        "spacing_top": 100,
        "spacing_bottom": 100,
        "color_scheme": "color__bg-body",
        "layout_column_width": 50,
        "enable_margin": true,
        "enable_swapped_columns": false
      },
      "blocks": {
        "story_content": {
          "type": "content",
          "settings": {
            "heading": "Brand story headline",
            "content": "<p>2-3 paragraphs about the brand origin, mission, and values. Be specific and authentic.</p>",
            "button_label": "Learn More",
            "url": "",
            "enable_padding": true,
            "color_scheme": "color__bg-body color__text",
            "color_button": "btn--small btn--outline",
            "text_position": "below",
            "layout_y_alignment": "justify-center",
            "layout_x_alignment": "left"
          }
        }
      },
      "block_order": ["story_content"]
    },

    "table_comparison": {
      "type": "table",
      "settings": {
        "table_headings": "Brand Name, Everyone Else",
        "heading": "Comparison heading",
        "content": "<p>Why this brand is different — 1 sentence</p>",
        "spacing_top": 50,
        "spacing_bottom": 100,
        "color_scheme": "color__bg-body",
        "style_column_border": "1",
        "layout_x_alignment": "text-center justify-center flex-col items-center",
        "enable_margin": true
      },
      "blocks": {
        "row_1": { "type": "content", "settings": { "label": "Feature 1", "column_1_content": "Brand advantage", "column_2_content": "Competitor weakness", "color_scheme": "color__bg-transparent" } },
        "row_2": { "type": "content", "settings": { "label": "Feature 2", "column_1_content": "Brand advantage", "column_2_content": "Competitor weakness", "color_scheme": "color__bg-transparent" } },
        "row_3": { "type": "content", "settings": { "label": "Feature 3", "column_1_content": "Brand advantage", "column_2_content": "Competitor weakness", "color_scheme": "color__bg-transparent" } },
        "row_4": { "type": "content", "settings": { "label": "Feature 4", "column_1_content": "Brand advantage", "column_2_content": "Competitor weakness", "color_scheme": "color__bg-transparent" } }
      },
      "block_order": ["row_1", "row_2", "row_3", "row_4"]
    },

    "testimonial_slider_reviews": {
      "type": "testimonial-slider",
      "settings": {
        "announcement_delay": 4,
        "spacing_top": 100,
        "spacing_bottom": 0,
        "color_scheme": "color__bg-body",
        "layout_x_alignment": "justify-center",
        "layout_column_width": 80,
        "enable_margin": true
      },
      "blocks": {
        "review_1": { "type": "testimonial", "settings": { "content": "Customer testimonial quote 1", "name": "<p>Customer Name</p>", "layout_x_alignment": "text-center justify-center items-center" } },
        "review_2": { "type": "testimonial", "settings": { "content": "Customer testimonial quote 2", "name": "<p>Customer Name</p>", "layout_x_alignment": "text-center justify-center items-center" } },
        "review_3": { "type": "testimonial", "settings": { "content": "Customer testimonial quote 3", "name": "<p>Customer Name</p>", "layout_x_alignment": "text-center justify-center items-center" } }
      },
      "block_order": ["review_1", "review_2", "review_3"]
    },

    "testimonial_grid_reviews": {
      "type": "testimonial-grid",
      "settings": {
        "heading": "What people are saying",
        "spacing_top": 100,
        "spacing_bottom": 100,
        "color_scheme": "color__bg-body",
        "layout_row_desktop": 3,
        "layout_row_mobile": 1,
        "layout_x_alignment": "text-center justify-center flex-col items-center",
        "enable_margin": true
      },
      "blocks": {
        "testimonial_1": { "type": "testimonial", "settings": { "content": "<p>Detailed customer review 1</p>", "title": "<p>Customer Name</p>" } },
        "testimonial_2": { "type": "testimonial", "settings": { "content": "<p>Detailed customer review 2</p>", "title": "<p>Customer Name</p>" } },
        "testimonial_3": { "type": "testimonial", "settings": { "content": "<p>Detailed customer review 3</p>", "title": "<p>Customer Name</p>" } },
        "testimonial_4": { "type": "testimonial", "settings": { "content": "<p>Detailed customer review 4</p>", "title": "<p>Customer Name</p>" } },
        "testimonial_5": { "type": "testimonial", "settings": { "content": "<p>Detailed customer review 5</p>", "title": "<p>Customer Name</p>" } },
        "testimonial_6": { "type": "testimonial", "settings": { "content": "<p>Detailed customer review 6</p>", "title": "<p>Customer Name</p>" } }
      },
      "block_order": ["testimonial_1", "testimonial_2", "testimonial_3", "testimonial_4", "testimonial_5", "testimonial_6"]
    },

    "newsletter_capture": {
      "type": "newsletter",
      "settings": {
        "spacing_top": 100,
        "spacing_bottom": 100,
        "color_scheme": "color__bg-primary",
        "color_text": "color__light",
        "color_button": "btn btn--neutral",
        "layout_y_alignment": "items-center",
        "layout_x_alignment": "justify-center",
        "enable_margin": false
      },
      "blocks": {
        "newsletter_1": {
          "type": "newsletter",
          "settings": {
            "heading": "Newsletter heading",
            "content": "<p>Subscribe CTA copy</p>",
            "button_label": "Subscribe",
            "disclaimer": "<p>Privacy disclaimer text</p>",
            "success": "<p>Success confirmation message</p>",
            "layout_x_alignment": "text-center justify-center items-center"
          }
        }
      },
      "block_order": ["newsletter_1"]
    },

    "accordions_faq": {
      "type": "accordions",
      "settings": {
        "heading": "Frequently Asked Questions",
        "spacing_top": 100,
        "spacing_bottom": 100,
        "color_scheme": "color__bg-body",
        "enable_margin": true,
        "enable_split": true,
        "enable_split_heading": true
      },
      "blocks": {
        "faq_1": { "type": "content", "settings": { "heading": "Question 1?", "content": "<p>Answer 1</p>" } },
        "faq_2": { "type": "content", "settings": { "heading": "Question 2?", "content": "<p>Answer 2</p>" } },
        "faq_3": { "type": "content", "settings": { "heading": "Question 3?", "content": "<p>Answer 3</p>" } },
        "faq_4": { "type": "content", "settings": { "heading": "Question 4?", "content": "<p>Answer 4</p>" } },
        "faq_5": { "type": "content", "settings": { "heading": "Question 5?", "content": "<p>Answer 5</p>" } }
      },
      "block_order": ["faq_1", "faq_2", "faq_3", "faq_4", "faq_5"]
    }
  },
  "section_order": [
    "banner_hero",
    "marquee_ticker",
    "text_intro",
    "icon_grid_pillars",
    "product_grid_featured",
    "image_text_story",
    "table_comparison",
    "testimonial_slider_reviews",
    "testimonial_grid_reviews",
    "newsletter_capture",
    "accordions_faq"
  ]
}

CRITICAL RULES:
1. Replace ALL placeholder text with brand-specific copy. Every headline, description, testimonial, FAQ must be written for this specific brand.
2. The "type" field in each section MUST match a real section filename (without .liquid): "banner", "marquee", "icon-grid", "text", "product-grid", "image-text", "table", "testimonial-slider", "testimonial-grid", "newsletter", "accordions"
3. Block "type" values MUST match the schema: "heading", "content", "buttons", "icon", "testimonial", "newsletter", "logo"
4. Setting IDs must be exact — these map directly to Shopify theme settings
5. color_scheme values use the theme's CSS classes: "color__bg-body", "color__bg-primary", "color__bg-overlay-1 color__text", "color__bg-shade-1 color__text", "color__bg-transparent"
6. color_text values: "color__light" (white text), "color__text" (dark text), "" (inherit)
7. color_button values: "btn" (primary filled), "btn btn--secondary" (secondary), "btn btn--plain" (plain), "btn btn--outline" (outline), "btn btn--neutral" (neutral), "btn--small btn--outline" (small outline)
8. For theme_settings colors, build a cohesive palette around the brand's primary color preference
9. Valid Shopify font handles: "inter_n4", "inter_n7", "playfair_display_n7", "dm_sans_n4", "dm_sans_n7", "syne_n7", "epilogue_n4", "epilogue_n9", "cormorant_garamond_n4", "work_sans_n4", "work_sans_n7", "lato_n4", "lato_n7", "poppins_n4", "poppins_n7", "montserrat_n4", "montserrat_n7", "raleway_n4", "roboto_n4", "open_sans_n4", "source_sans_pro_n4", "crimson_text_n4", "libre_baskerville_n4", "merriweather_n4", "pt_serif_n4", "josefin_sans_n4", "archivo_n4"
10. Hero headline should be punchy and memorable (under 8 words)
11. Testimonials should sound like real customers — specific, emotional, mention the product
12. FAQ answers must be realistic and specific to the product category
13. Comparison table: first column heading is the brand name, second is "Everyone Else" — rows should highlight genuine competitive advantages
14. All copy must match the brand vibe (Premium = elevated language, Playful = casual/fun, Clinical = precise/scientific, Earthy = natural/warm, Bold = confident/direct, Minimal = clean/sparse, Luxe = indulgent, Raw = honest/unfiltered)
15. Return ONLY the JSON object — no markdown fences, no backticks, no explanation before or after`;

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
Additional Notes: ${brief.notes || 'None'}

Generate the full JSON config now. Remember: every piece of text must be specific to this brand — no placeholders, no generic copy. The table_headings in the comparison section should be "${brief.brand_name}, Everyone Else".`;

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
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

    // Strip markdown fences if Claude wraps the JSON
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const config = JSON.parse(jsonText);

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
