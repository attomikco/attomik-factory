export type ClientStatus = 'draft' | 'deployed' | 'pitched' | 'signed';

export interface Client {
  id: string;
  brand_name: string;
  store_url: string;
  api_key: string;
  status: ClientStatus;
  created_at: string;
}

export interface BrandConfig {
  id: string;
  client_id: string;
  config: Record<string, unknown>;
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
