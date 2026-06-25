import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import type { Database } from '@/types/database';

export async function GET(request: Request) {
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

  const caseListResult: any = await supabase
    .from('cases')
    .select('id')
    .eq('account_id', account.id);

  const caseList = caseListResult.data as Array<{ id: string }> | null;
  const caseError = caseListResult.error;

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 });
  }

  const caseIds = caseList?.map((caseItem) => caseItem.id) ?? [];

  if (caseIds.length === 0) {
    return NextResponse.json({ assignments: [] });
  }

  const query = supabase.from('case_users').select(
    'id,case_id,user_id,role,job_title,job_description_text,activated_at,last_seen_at'
  );

  const { caseId } = Object.fromEntries(new URL(request.url).searchParams.entries()) as {
    caseId?: string;
  };

  const requestQuery = caseId ? query.eq('case_id', caseId) : query.in('case_id', caseIds);
  const { data: assignments, error: assignmentError } = await requestQuery;

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: assignments ?? [] });
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerSupabaseClient<any>({ headers, cookies });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session || !session.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { caseId, userId, role, jobTitle, jobDescriptionText, permissionsJson } = await request.json();

  if (!caseId || !userId || !role) {
    return NextResponse.json({ error: 'caseId, userId y role son requeridos' }, { status: 400 });
  }

  const userEmail = session.user.email;
  const accountResult: any = await supabase
    .from('accounts')
    .select('id')
    .eq('email', userEmail)
    .single();

  const account = accountResult.data as { id: string } | null;

  if (!account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 403 });
  }

  const caseRowResult: any = await supabase
    .from('cases')
    .select('id, account_id')
    .eq('id', caseId)
    .single();

  const caseRow = caseRowResult.data as { id: string; account_id: string } | null;
  const caseError = caseRowResult.error;

  if (caseError || !caseRow || caseRow.account_id !== account.id) {
    return NextResponse.json({ error: 'Caso no encontrado o no pertenece a la cuenta' }, { status: 403 });
  }

  const insertResult: any = await (supabase.from('case_users') as any)
    .insert({
      case_id: caseId,
      user_id: userId,
      role,
      job_title: jobTitle,
      job_description_text: jobDescriptionText,
      permissions_json: permissionsJson
    })
    .select()
    .single();

  const data = insertResult.data;
  const error = insertResult.error;

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Error al crear case user' }, { status: 500 });
  }

  return NextResponse.json({ caseUser: data });
}
