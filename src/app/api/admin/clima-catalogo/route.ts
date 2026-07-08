import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) return null
  return session
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `pregunta_${Date.now()}`
}

// GET — listar el banco de preguntas de Clima Laboral
export async function GET() {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data, error } = await db
    .from('climate_question_bank')
    .select('id, key, label, type, options, min_label, max_label, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data ?? [] })
}

// POST — agregar una pregunta al banco
export async function POST(req: NextRequest) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const label = (body.label ?? '').trim()
  if (!label) return NextResponse.json({ error: 'El texto de la pregunta es obligatorio' }, { status: 400 })
  if (!['open', 'number', 'scale_1_5', 'choice', 'choice_text'].includes(body.type)) {
    return NextResponse.json({ error: 'Tipo de pregunta inválido' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data: maxRow } = await db
    .from('climate_question_bank')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await db
    .from('climate_question_bank')
    .insert({
      key: slugify(label),
      label,
      type: body.type,
      options: body.options ?? null,
      min_label: body.minLabel ?? null,
      max_label: body.maxLabel ?? null,
      sort_order: nextSort,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}

// PATCH — editar una pregunta o su orden
export async function PATCH(req: NextRequest) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body.label === 'string') {
    if (!body.label.trim()) return NextResponse.json({ error: 'El texto de la pregunta es obligatorio' }, { status: 400 })
    updates.label = body.label.trim()
  }
  if (typeof body.type === 'string') updates.type = body.type
  if (body.options !== undefined) updates.options = body.options
  if (body.minLabel !== undefined) updates.min_label = body.minLabel
  if (body.maxLabel !== undefined) updates.max_label = body.maxLabel
  if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data, error } = await db
    .from('climate_question_bank')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}

// DELETE — quitar una pregunta del banco
export async function DELETE(req: NextRequest) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { error } = await db.from('climate_question_bank').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
