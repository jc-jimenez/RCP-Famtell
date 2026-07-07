import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

async function verifyAccess(supabase: any, email: string, caseId: string) {
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// GET /api/consultant/case-table-instruments?caseId=xxx
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_table_instruments')
    .select('id, module_code, name, description, columns, job_position_ids, sort_order')
    .eq('case_id', caseId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instruments: data ?? [] })
}

// POST — crear instrumento de tabla
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, moduleCode, name, description, columns, jobPositionIds, sortOrder } = await req.json()
  if (!caseId || !moduleCode || !name?.trim() || !Array.isArray(columns) || columns.length === 0) {
    return NextResponse.json({ error: 'caseId, moduleCode, name y columns (no vacío) son requeridos' }, { status: 400 })
  }

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_table_instruments')
    .insert({
      case_id: caseId,
      module_code: moduleCode,
      name: name.trim(),
      description: description?.trim() || null,
      columns,
      job_position_ids: jobPositionIds ?? [],
      sort_order: sortOrder ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ instrument: data })
}

// PATCH — editar instrumento (nombre, columnas, puestos)
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, instrumentId, name, description, columns, jobPositionIds } = await req.json()
  if (!caseId || !instrumentId) return NextResponse.json({ error: 'caseId e instrumentId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description?.trim() || null
  if (columns !== undefined) updates.columns = columns
  if (jobPositionIds !== undefined) updates.job_position_ids = jobPositionIds

  const db = supabase as any
  const { data, error } = await db
    .from('case_table_instruments')
    .update(updates)
    .eq('id', instrumentId)
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ instrument: data })
}

// DELETE — borrar instrumento (cascada borra sus filas)
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, instrumentId } = await req.json()
  if (!caseId || !instrumentId) return NextResponse.json({ error: 'caseId e instrumentId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  await db.from('case_table_instruments').delete().eq('id', instrumentId).eq('case_id', caseId)
  return NextResponse.json({ ok: true })
}
