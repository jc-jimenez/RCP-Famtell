import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isSuperAdminEmail } from '@/lib/permissions';

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

// DELETE — borrar un caso completo (incluye tipo "departamento", que es solo
// un case_type dentro de la misma tabla). Solo el consultor dueño o el
// super-admin. Todas las tablas hijas (sessions, briefs, KPIs, puestos,
// participantes, etc.) tienen ON DELETE CASCADE desde cases, así que el
// DELETE del caso arrastra todo — por eso, si ya hay entrevistas contestadas,
// se advierte antes (confirm: true para proceder) en vez de bloquear.
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { caseId, confirm } = await request.json();
  if (!caseId) {
    return NextResponse.json({ error: 'caseId es requerido' }, { status: 400 });
  }

  const db = supabase as any;
  const isSuperAdmin = isSuperAdminEmail(session.user.email);

  if (!isSuperAdmin) {
    const { data: account } = await db.from('accounts').select('id').eq('email', session.user.email).maybeSingle();
    if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle();
    if (!caseRow) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const writeDb = (admin ?? db) as any;

  if (!confirm) {
    const { data: sessionRows } = await writeDb.from('sessions').select('messages').eq('case_id', caseId);
    const answered = (sessionRows ?? []).filter((s: any) => (s.messages?.length ?? 0) > 0).length;
    if (answered > 0) {
      return NextResponse.json({
        needsConfirmation: true,
        message: `Este caso tiene ${answered} entrevista${answered !== 1 ? 's' : ''} con respuestas ya contestadas, además de su Brief, KPIs y demás información generada. Al eliminarlo se pierde todo de forma permanente. ¿Confirmas que quieres eliminarlo?`,
      }, { status: 409 });
    }
  }

  const { error } = await writeDb.from('cases').delete().eq('id', caseId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
