import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — get latest config for a client
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('client_id');

  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('brand_configs')
    .select('*')
    .eq('client_id', clientId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ config: null });
  }

  return NextResponse.json({ config: data });
}

// POST — save a config for a client
export async function POST(request: NextRequest) {
  const { client_id, config } = await request.json();

  if (!client_id || !config) {
    return NextResponse.json({ error: 'client_id and config required' }, { status: 400 });
  }

  // Get latest version
  const { data: latest } = await supabase
    .from('brand_configs')
    .select('version')
    .eq('client_id', client_id)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version || 0) + 1;

  const { data, error } = await supabase
    .from('brand_configs')
    .insert({
      client_id,
      config,
      version: nextVersion,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data });
}

// PATCH — update latest config for a client in place (no new version)
export async function PATCH(request: NextRequest) {
  const { client_id, config } = await request.json();

  if (!client_id || !config) {
    return NextResponse.json({ error: 'client_id and config required' }, { status: 400 });
  }

  const { data: latest, error: latestError } = await supabase
    .from('brand_configs')
    .select('id')
    .eq('client_id', client_id)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (latestError || !latest) {
    return NextResponse.json(
      { error: 'No existing config to update — POST a new one first' },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from('brand_configs')
    .update({ config })
    .eq('id', latest.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data });
}
