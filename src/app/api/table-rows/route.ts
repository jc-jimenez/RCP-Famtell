import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

// GET /api/table-rows?instrumentId=xxx — filas de un instrumento
// RLS decide qué puede ver: consultor dueño del caso, o case_user
// cuyo puesto está mapeado a este instrumento (migración 028).
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const instrumentId = searchParams.get('instrumentId')
  if (!instrumentId) return NextResponse.json({ error: 'instrumentId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_table_rows')
    .select('id, row_data, sort_order')
    .eq('instrument_id', instrumentId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

// POST — crear fila
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { instrumentId, rowData, sortOrder } = await req.json()
  if (!instrumentId) return NextResponse.json({ error: 'instrumentId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_table_rows')
    .insert({ instrument_id: instrumentId, row_data: rowData ?? {}, sort_order: sortOrder ?? 0 })
    .select()
    .single()

  // RLS bloquea si el puesto del usuario no está mapeado a este instrumento
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ row: data })
}

// PATCH — editar fila
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rowId, rowData } = await req.json()
  if (!rowId) return NextResponse.json({ error: 'rowId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_table_rows')
    .update({ row_data: rowData ?? {}, updated_at: new Date().toISOString() })
    .eq('id', rowId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ row: data })
}

// DELETE — borrar fila
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rowId } = await req.json()
  if (!rowId) return NextResponse.json({ error: 'rowId requerido' }, { status: 400 })

  const db = supabase as any
  const { error } = await db.from('case_table_rows').delete().eq('id', rowId)
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ ok: true })
}
