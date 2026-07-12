import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isSuperAdminEmail } from '@/lib/permissions';

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

// DELETE — borrar un participante. Solo el consultor dueño del caso o el
// super-admin. Si el participante ya contestó alguna entrevista, se requiere
// confirmación explícita (confirm: true) — advertencia, no bloqueo: el caso
// típico es limpiar un usuario duplicado y no debe quedar atrapado.
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { caseUserId, confirm } = await request.json();
  if (!caseUserId) {
    return NextResponse.json({ error: 'caseUserId es requerido' }, { status: 400 });
  }

  const db = supabase as any;

  const { data: caseUser } = await db
    .from('case_users')
    .select('id, case_id, user_id')
    .eq('id', caseUserId)
    .maybeSingle();

  if (!caseUser) {
    return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 });
  }

  const isSuperAdmin = isSuperAdminEmail(session.user.email);
  if (!isSuperAdmin) {
    const { data: account } = await db.from('accounts').select('id').eq('email', session.user.email).maybeSingle();
    if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    const { data: caseRow } = await db.from('cases').select('id').eq('id', caseUser.case_id).eq('account_id', account.id).maybeSingle();
    if (!caseRow) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const writeDb = (admin ?? db) as any;

  // Sesiones (entrevistas) de este participante en este caso, con o sin
  // respuestas — solo si ya activó su cuenta (user_id no nulo).
  let sessions: { id: string; messages: unknown[] }[] = [];
  if (caseUser.user_id) {
    const { data } = await writeDb
      .from('sessions')
      .select('id, messages')
      .eq('case_id', caseUser.case_id)
      .eq('user_id', caseUser.user_id);
    sessions = data ?? [];
  }

  const answeredSessions = sessions.filter(s => (s.messages?.length ?? 0) > 0);

  if (answeredSessions.length > 0 && !confirm) {
    return NextResponse.json({
      needsConfirmation: true,
      message: `Este participante ya contestó ${answeredSessions.length} entrevista${answeredSessions.length !== 1 ? 's' : ''} (con respuestas guardadas). Si lo eliminas, esa información se borra también. ¿Confirmas que quieres eliminarlo?`,
    }, { status: 409 });
  }

  const sessionIds = sessions.map(s => s.id);
  if (sessionIds.length > 0) {
    await writeDb.from('modules').update({ session_id: null }).in('session_id', sessionIds);
    await writeDb.from('sessions').delete().in('id', sessionIds);
  }
  // Limpieza defensiva de FKs sin ON DELETE hacia case_users (hoy sin uso
  // real en producción, pero evita un error de violación de FK si algún día
  // se llegan a poblar).
  await writeDb.from('case_question_overrides').update({ assigned_to: null }).eq('assigned_to', caseUserId);
  await writeDb.from('question_responses').update({ case_user_id: null }).eq('case_user_id', caseUserId);

  const { error: deleteError } = await writeDb.from('case_users').delete().eq('id', caseUserId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
