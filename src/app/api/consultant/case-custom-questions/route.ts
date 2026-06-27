import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

async function verifyAccess(supabase: any, email: string, caseId: string) {
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// POST — crear pregunta custom
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, sectionId, text, novaHint, suggestedRoles } = await req.json()
  if (!caseId || !sectionId || !text?.trim()) {
    return NextResponse.json({ error: 'caseId, sectionId y text son requeridos' }, { status: 400 })
  }

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_custom_questions')
    .insert({
      case_id: caseId,
      section_id: sectionId,
      text: text.trim(),
      nova_hint: novaHint?.trim() ?? null,
      suggested_roles: suggestedRoles ?? [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ question: data })
}

// DELETE — borrar pregunta custom
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, questionId } = await req.json()
  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  await db.from('case_custom_questions').delete().eq('id', questionId).eq('case_id', caseId)
  return NextResponse.json({ ok: true })
}

// PATCH — actualizar pregunta custom (texto, roles, is_active)
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, questionId, text, suggestedRoles, isActive } = await req.json()
  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = supabase as any
  const updates: Record<string, unknown> = {}
  if (text !== undefined) updates.text = text.trim()
  if (suggestedRoles !== undefined) updates.suggested_roles = suggestedRoles
  if (isActive !== undefined) updates.is_active = isActive

  const { data, error } = await db
    .from('case_custom_questions')
    .update(updates)
    .eq('id', questionId)
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ question: data })
}
