export type ClientStatus = 'draft' | 'deployed' | 'pitched' | 'signed';

export interface Client {
  id: string;
  brand_name: string;
  store_url: string;
  api_key: string;
  status: ClientStatus;
  created_at: string;
  alias?: string;
}

export interface ColorVariant {
  name: string;
  theme_settings: Record<string, string>;
}

export interface GeneratedConfig {
  color_variants: ColorVariant[];
  selected_variant: number;
  index_json: Record<string, unknown>;
  product_json: Record<string, unknown> | null;
  about_json: Record<string, unknown> | null;
  footer_group_json: Record<string, unknown> | null;
  brief: {
    brand_name: string;
    one_liner: string;
    category: string;
    target_audience: string;
    brand_vibe: string[];
    primary_color: string;
    secondary_color: string;
  };
}

export interface BrandConfig {
  id: string;
  client_id: string;
  config: GeneratedConfig;
  version: number;
  created_at: string;
}

export interface Deployment {
  id: string;
  client_id: string;
  config_id: string;
  deployed_at: string;
  preview_url: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  section_order: string[];
  config: Record<string, unknown>;
}
