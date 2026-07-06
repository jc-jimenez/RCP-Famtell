import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

async function getOwnAccountId(supabase: any, email: string): Promise<string | null> {
  const { data } = await supabase.from('accounts').select('id').eq('email', email).maybeSingle()
  return data?.id ?? null
}

// GET /api/consultant/communication-templates — plantillas de la cuenta del consultor
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const accountId = await getOwnAccountId(db, session.user.email!)
  if (!accountId) return NextResponse.json({ templates: [] })

  const { data, error } = await db
    .from('communication_templates')
    .select('id, category, label, channel, subject, body, is_active, sort_order')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

// POST — crear plantilla
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const accountId = await getOwnAccountId(db, session.user.email!)
  if (!accountId) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { category, label, channel, subject, body: templateBody, sortOrder } = await req.json()
  if (!category?.trim() || !label?.trim() || !channel || !templateBody?.trim()) {
    return NextResponse.json({ error: 'category, label, channel y body son requeridos' }, { status: 400 })
  }

  const { data, error } = await db
    .from('communication_templates')
    .insert({
      account_id: accountId,
      category: category.trim(),
      label: label.trim(),
      channel,
      subject: subject?.trim() || null,
      body: templateBody,
      sort_order: sortOrder ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ template: data })
}

// PATCH — editar o activar/desactivar plantilla
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const accountId = await getOwnAccountId(db, session.user.email!)
  if (!accountId) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { templateId, category, label, channel, subject, body: templateBody, isActive } = await req.json()
  if (!templateId) return NextResponse.json({ error: 'templateId requerido' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (category !== undefined) updates.category = category.trim()
  if (label !== undefined) updates.label = label.trim()
  if (channel !== undefined) updates.channel = channel
  if (subject !== undefined) updates.subject = subject?.trim() || null
  if (templateBody !== undefined) updates.body = templateBody
  if (isActive !== undefined) updates.is_active = isActive

  const { data, error } = await db
    .from('communication_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ template: data })
}

// DELETE — borrar plantilla
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const accountId = await getOwnAccountId(db, session.user.email!)
  if (!accountId) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { templateId } = await req.json()
  if (!templateId) return NextResponse.json({ error: 'templateId requerido' }, { status: 400 })

  await db.from('communication_templates').delete().eq('id', templateId).eq('account_id', accountId)
  return NextResponse.json({ ok: true })
}
