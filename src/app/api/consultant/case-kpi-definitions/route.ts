import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

async function verifyAccess(supabase: any, email: string, caseId: string) {
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// GET /api/consultant/case-kpi-definitions?caseId=xxx
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_kpi_definitions')
    .select('id, metric_key, label, target, unit, sort_order')
    .eq('case_id', caseId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ definitions: data ?? [] })
}

// POST — crear KPI
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, metricKey, label, target, unit, sortOrder } = await req.json()
  if (!caseId || !metricKey?.trim() || !label?.trim()) {
    return NextResponse.json({ error: 'caseId, metricKey y label son requeridos' }, { status: 400 })
  }

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_kpi_definitions')
    .insert({
      case_id: caseId,
      metric_key: metricKey.trim(),
      label: label.trim(),
      target: target ?? 0,
      unit: unit ?? '',
      sort_order: sortOrder ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ definition: data })
}

// PATCH — editar KPI (label, target, unit)
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, definitionId, label, target, unit } = await req.json()
  if (!caseId || !definitionId) return NextResponse.json({ error: 'caseId y definitionId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (label !== undefined) updates.label = label.trim()
  if (target !== undefined) updates.target = target
  if (unit !== undefined) updates.unit = unit

  const db = supabase as any
  const { data, error } = await db
    .from('case_kpi_definitions')
    .update(updates)
    .eq('id', definitionId)
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ definition: data })
}

// DELETE — borrar KPI del catálogo del caso
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, definitionId } = await req.json()
  if (!caseId || !definitionId) return NextResponse.json({ error: 'caseId y definitionId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  await db.from('case_kpi_definitions').delete().eq('id', definitionId).eq('case_id', caseId)
  return NextResponse.json({ ok: true })
}
