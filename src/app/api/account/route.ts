import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isSuperAdminEmail } from '@/lib/permissions'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('accounts')
    .select('id,email,company_name,credits_total,credits_used,plan_id,status,created_at')
    .eq('email', session.user.email)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // El super-admin no tiene fila en accounts (no consume créditos ni tiene
  // empresa) — el email siempre viene de la sesión, no depende de esa fila.
  return NextResponse.json({
    account: data,
    email: session.user.email,
    isSuperAdmin: isSuperAdminEmail(session.user.email),
  })
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const allowed = ['company_name']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  const { error } = await (supabase as any)
    .from('accounts')
    .update(updates)
    .eq('email', session.user.email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
