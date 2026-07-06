import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

async function verifyAccess(supabase: any, email: string, caseId: string) {
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// GET /api/consultant/case-job-positions?caseId=xxx — listar puestos del caso
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_job_positions')
    .select('id, name, job_description, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ positions: data ?? [] })
}

// POST — crear puesto (descriptivo obligatorio)
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, name, jobDescription } = await req.json()
  if (!caseId || !name?.trim() || !jobDescription?.trim()) {
    return NextResponse.json({ error: 'caseId, name y jobDescription son requeridos' }, { status: 400 })
  }

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_job_positions')
    .insert({ case_id: caseId, name: name.trim(), job_description: jobDescription.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ position: data })
}

// PATCH — editar nombre/descriptivo de un puesto
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, positionId, name, jobDescription } = await req.json()
  if (!caseId || !positionId) return NextResponse.json({ error: 'caseId y positionId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (jobDescription !== undefined) updates.job_description = jobDescription.trim()

  const db = supabase as any
  const { data, error } = await db
    .from('case_job_positions')
    .update(updates)
    .eq('id', positionId)
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ position: data })
}

// DELETE — borrar puesto del catálogo del caso
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, positionId } = await req.json()
  if (!caseId || !positionId) return NextResponse.json({ error: 'caseId y positionId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  await db.from('case_job_positions').delete().eq('id', positionId).eq('case_id', caseId)
  return NextResponse.json({ ok: true })
}
