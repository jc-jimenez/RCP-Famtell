import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_CLIMATE_QUESTIONS } from '@/lib/climateQuestions'

async function verifyAccess(supabase: any, email: string, caseId: string) {
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// GET /api/consultant/climate-surveys?caseId=xxx
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_climate_surveys')
    .select('id, token, title, questions, status, created_at, job_position_id, case_job_positions (name)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const surveys = (data ?? []).map((s: any) => ({
    ...s,
    job_position_name: s.case_job_positions?.name ?? null,
    case_job_positions: undefined,
  }))
  return NextResponse.json({ surveys })
}

// POST — crear encuesta (se siembra con las preguntas del Kit por default)
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, title, jobPositionId } = await req.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any

  // Encuesta segmentada por puesto (sección 16, Obs 10): el link es distinto
  // por puesto, pero la respuesta sigue siendo anónima dentro de ese puesto.
  if (jobPositionId) {
    const { data: position } = await db
      .from('case_job_positions')
      .select('id')
      .eq('id', jobPositionId)
      .eq('case_id', caseId)
      .maybeSingle()
    if (!position) return NextResponse.json({ error: 'Puesto inválido para este caso' }, { status: 400 })
  }

  // El banco de preguntas lo administra el super-admin desde el Catálogo
  // (climate_question_bank, sección 15 del PRD). Si está vacío (nunca debería
  // pasar tras la migración 034), cae al set fijo original como respaldo.
  const { data: bank } = await db
    .from('climate_question_bank')
    .select('key, label, type, options, min_label, max_label')
    .order('sort_order', { ascending: true })

  const questions = (bank ?? []).length > 0
    ? bank.map((q: any) => ({
        key: q.key, label: q.label, type: q.type,
        options: q.options ?? undefined, minLabel: q.min_label ?? undefined, maxLabel: q.max_label ?? undefined,
      }))
    : DEFAULT_CLIMATE_QUESTIONS

  const { data, error } = await db
    .from('case_climate_surveys')
    .insert({
      case_id: caseId,
      title: title?.trim() || 'Cuestionario de Clima y Diagnóstico Interno',
      questions,
      status: 'draft',
      created_by: session.user.id,
      job_position_id: jobPositionId || null,
    })
    .select('id, token, title, questions, status, created_at, job_position_id, case_job_positions (name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const survey = { ...data, job_position_name: data?.case_job_positions?.name ?? null, case_job_positions: undefined }
  return NextResponse.json({ survey })
}

// PATCH — cambiar estado (draft/open/closed) o título
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, surveyId, status, title } = await req.json()
  if (!caseId || !surveyId) return NextResponse.json({ error: 'caseId y surveyId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (title !== undefined) updates.title = title.trim()

  const db = supabase as any
  const { data, error } = await db
    .from('case_climate_surveys')
    .update(updates)
    .eq('id', surveyId)
    .eq('case_id', caseId)
    .select('id, token, title, questions, status, created_at, job_position_id, case_job_positions (name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const survey = { ...data, job_position_name: data?.case_job_positions?.name ?? null, case_job_positions: undefined }
  return NextResponse.json({ survey })
}

// DELETE — borrar encuesta (cascada borra sus respuestas)
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, surveyId } = await req.json()
  if (!caseId || !surveyId) return NextResponse.json({ error: 'caseId y surveyId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  await db.from('case_climate_surveys').delete().eq('id', surveyId).eq('case_id', caseId)
  return NextResponse.json({ ok: true })
}
