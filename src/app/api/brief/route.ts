import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const { data } = await db
    .from('brief_documents')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle()

  return NextResponse.json({ brief: data })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { caseId, ...fields } = body

  const db = supabase as any

  // Upsert — un brief por caso
  const { data: existing } = await db
    .from('brief_documents')
    .select('id')
    .eq('case_id', caseId)
    .maybeSingle()

  // Antes se ignoraba el error de PostgREST y se devolvía 200 con brief: null
  // — el consultor "guardaba", no veía error, y al recargar perdía los datos
  // (así pasó con jtbd_comercial cuando faltaba la columna, migración 027).
  if (existing) {
    const { data, error } = await db
      .from('brief_documents')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ brief: data })
  } else {
    const { data, error } = await db
      .from('brief_documents')
      .insert({ case_id: caseId, created_by: session.user.id, ...fields })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ brief: data })
  }
}
