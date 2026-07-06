import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { hasCapability } from '@/lib/permissions'

// GET — listar links del caso
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('client_share_links')
    .select('id, token, label, expires_at, active, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

// POST — crear nuevo link
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, label } = await request.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any

  // Verificar que es consultor del caso
  const { data: cu } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!hasCapability(cu?.role, 'create_share_links')) {
    return NextResponse.json({ error: 'Solo el consultor puede generar links' }, { status: 403 })
  }

  const { data, error } = await db
    .from('client_share_links')
    .insert({ case_id: caseId, created_by: session.user.id, label: label ?? null })
    .select('id, token, label, expires_at, active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}

// DELETE — desactivar link
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const db = supabase as any
  const { error } = await db
    .from('client_share_links')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
