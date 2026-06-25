import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import type { Database } from '@/types/database';

export async function GET() {
  const supabase = createRouteHandlerSupabaseClient<any>({ headers, cookies });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session || !session.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const accountResult: any = await supabase
    .from('accounts')
    .select('id')
    .eq('email', userEmail)
    .single();

  const account = accountResult.data as { id: string } | null;
  const accountError = accountResult.error;

  if (accountError || !account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('cases')
    .select('id,company_name,industry,status,created_at')
    .eq('account_id', accountResult.data.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cases: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerSupabaseClient<any>({ headers, cookies });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session || !session.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { companyName, industry, description } = await request.json();

  if (!companyName) {
    return NextResponse.json({ error: 'companyName es requerido' }, { status: 400 });
  }

  if (!session.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const accountResult: any = await supabase
    .from('accounts')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (accountResult.error || !accountResult.data) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 403 });
  }

  const { data, error } = await supabase.from('cases').insert({
    account_id: accountResult.data.id,
    company_name: companyName,
    industry,
    description
  }).select().single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Error al crear el caso' }, { status: 500 });
  }

  return NextResponse.json({ case: data });
}
