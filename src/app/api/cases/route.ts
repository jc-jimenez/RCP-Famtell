import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = supabase as any;

  const { data: account, error: accountError } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 403 });
  }

  const { data, error } = await db
    .from('cases')
    .select('id,company_name,industry,status,created_at')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cases: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const {
    companyName, industry, description, strategicIntent, strategicNotes,
    caseType, productsServices, departmentName, diagnosticObjectives,
  } = await request.json();

  if (!companyName) {
    return NextResponse.json({ error: 'companyName es requerido' }, { status: 400 });
  }

  const db = supabase as any;

  const { data: account, error: accountError } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 403 });
  }

  const { data, error } = await db
    .from('cases')
    .insert({
      account_id: account.id, company_name: companyName, industry, description,
      strategic_intent: strategicIntent ?? 'mixed', strategic_notes: strategicNotes?.trim() || null,
      case_type: caseType ?? null,
      products_services: productsServices?.trim() || null,
      department_name: departmentName?.trim() || null,
      diagnostic_objectives: diagnosticObjectives?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Error al crear el caso' }, { status: 500 });
  }

  return NextResponse.json({ case: data });
}
