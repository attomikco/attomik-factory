import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — list all clients
export async function GET() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data });
}

// POST — create or update a client
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { brand_name, store_url, api_key, status, alias } = body;

  if (!brand_name) {
    return NextResponse.json({ error: 'brand_name required' }, { status: 400 });
  }

  // Check if client exists by store_url
  if (store_url) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('store_url', store_url)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('clients')
        .update({ brand_name, api_key, status, alias })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ client: data, updated: true });
    }
  }

  // Create new
  const { data, error } = await supabase
    .from('clients')
    .insert({ brand_name, store_url, api_key, status: status || 'draft', alias })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data, created: true });
}
