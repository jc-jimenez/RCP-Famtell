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
    .select('id, token, title, questions, status, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ surveys: data ?? [] })
}

// POST — crear encuesta (se siembra con las preguntas del Kit por default)
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, title } = await req.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_climate_surveys')
    .insert({
      case_id: caseId,
      title: title?.trim() || 'Cuestionario de Clima y Diagnóstico Interno',
      questions: DEFAULT_CLIMATE_QUESTIONS,
      status: 'draft',
      created_by: session.user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ survey: data })
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
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ survey: data })
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
