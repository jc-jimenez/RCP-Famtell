import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

// GET /api/contacts?caseId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const { data, error } = await db
    .from('contacts')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}

// POST /api/contacts — crear contacto
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { caseId, name, company, role, email, phone, relationship_type, notes } = body

  if (!caseId || !name) {
    return NextResponse.json({ error: 'caseId y name son requeridos' }, { status: 400 })
  }

  const db = supabase as any
  const { data, error } = await db
    .from('contacts')
    .insert({ case_id: caseId, name, company, role, email, phone, relationship_type: relationship_type ?? 'other', notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}

// PATCH /api/contacts — actualizar contacto (pipeline stage, etc.)
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}
