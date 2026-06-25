import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request: Request) {
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

  const { data: caseList, error: caseError } = await db
    .from('cases')
    .select('id')
    .eq('account_id', account.id);

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 });
  }

  const caseIds = (caseList ?? []).map((c: any) => c.id);

  if (caseIds.length === 0) {
    return NextResponse.json({ assignments: [] });
  }

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');

  const query = db
    .from('case_users')
    .select('id,case_id,user_id,role,job_title,job_description_text,activated_at,last_seen_at');

  const { data: assignments, error: assignmentError } = await (
    caseId ? query.eq('case_id', caseId) : query.in('case_id', caseIds)
  );

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: assignments ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { caseId, userId, role, jobTitle, jobDescriptionText, permissionsJson } = await request.json();

  if (!caseId || !userId || !role) {
    return NextResponse.json({ error: 'caseId, userId y role son requeridos' }, { status: 400 });
  }

  const db = supabase as any;

  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (!account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 403 });
  }

  const { data: caseRow, error: caseError } = await db
    .from('cases')
    .select('id,account_id')
    .eq('id', caseId)
    .single();

  if (caseError || !caseRow || caseRow.account_id !== account.id) {
    return NextResponse.json({ error: 'Caso no encontrado o no pertenece a la cuenta' }, { status: 403 });
  }

  const { data, error } = await db
    .from('case_users')
    .insert({ case_id: caseId, user_id: userId, role, job_title: jobTitle, job_description_text: jobDescriptionText, permissions_json: permissionsJson })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Error al crear case user' }, { status: 500 });
  }

  return NextResponse.json({ caseUser: data });
}
