import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return isSuperAdminEmail(session.user.email) ? session : null
}

// Mapea una fila real de accounts al formato que espera la UI
function toUI(a: any) {
  return {
    id: a.id,
    email: a.email,
    company_name: a.company_name ?? '',
    credits_balance: (a.credits_total ?? 0) - (a.credits_used ?? 0),
    subscription_plan: a.plan_id ?? 'starter',
    status: a.status ?? 'active',
    created_at: a.created_at,
  }
}

// GET — listar todos los consultores
export async function GET() {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const { data, error } = await (admin as any)
    .from('accounts')
    .select('id,email,company_name,credits_total,credits_used,plan_id,status,created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ consultores: (data ?? []).map(toUI) })
}

// POST — crear consultor manualmente
export async function POST(req: Request) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const { email, companyName, plan = 'starter', credits = 100 } = await req.json()
  if (!email || !companyName) return NextResponse.json({ error: 'email y companyName requeridos' }, { status: 400 })

  // Contraseña temporal que el Super Admin comparte con el consultor
  const tempPassword = `Rcp-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 9000 + 1000)}`

  // Crear (o reutilizar) usuario de auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: tempPassword,
  })
  if (authErr && !/already.*registered|exists/i.test(authErr.message)) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  // Crear registro de cuenta (identificado por email)
  const { data: account, error: accErr } = await (admin as any)
    .from('accounts')
    .insert({
      email,
      company_name: companyName,
      plan_id: plan,
      credits_total: credits,
      credits_used: 0,
      status: 'active',
    })
    .select('id,email,company_name,credits_total,credits_used,plan_id,status,created_at')
    .single()

  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 })
  return NextResponse.json({ account: toUI(account), tempPassword: authErr ? null : tempPassword })
}

// PATCH — actualizar estado o créditos
export async function PATCH(req: Request) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const { accountId, status, credits, plan } = await req.json()
  if (!accountId) return NextResponse.json({ error: 'accountId requerido' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (credits !== undefined) { updates.credits_total = credits; updates.credits_used = 0 }
  if (plan !== undefined) updates.plan_id = plan

  const { data, error } = await (admin as any)
    .from('accounts')
    .update(updates)
    .eq('id', accountId)
    .select('id,email,company_name,credits_total,credits_used,plan_id,status,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: toUI(data) })
}
