import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

// GET /api/consultant/case-overrides?caseId=xxx
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any
  const { data } = await db
    .from('case_question_overrides')
    .select('question_id, is_active, custom_text, roles_override, job_position_ids')
    .eq('case_id', caseId)

  return NextResponse.json(data ?? [])
}

// POST — upsert override
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, questionId, isActive, customText, rolesOverride, jobPositionIds } = await req.json()
  const db = supabase as any

  // Verificar que el caso pertenece al consultor
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { data: caseRow } = await db
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  const upsertPayload: Record<string, unknown> = {
    case_id: caseId,
    question_id: questionId,
    is_active: isActive ?? true,
    custom_text: customText ?? null,
  }
  if (rolesOverride !== undefined) upsertPayload.roles_override = rolesOverride
  if (jobPositionIds !== undefined) upsertPayload.job_position_ids = jobPositionIds

  const { data, error } = await db
    .from('case_question_overrides')
    .upsert(upsertPayload, { onConflict: 'case_id,question_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE — quitar override (restaura al default del catálogo)
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, questionId } = await req.json()
  const db = supabase as any
  await db.from('case_question_overrides').delete().eq('case_id', caseId).eq('question_id', questionId)
  return NextResponse.json({ ok: true })
}
