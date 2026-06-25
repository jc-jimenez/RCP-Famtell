import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return session.user.email === process.env.SUPER_ADMIN_EMAIL ? session : null
}

// GET — listar todos los consultores
export async function GET() {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const { data, error } = await (admin as any)
    .from('accounts')
    .select('id,email,company_name,credits_balance,subscription_plan,status,created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ consultores: data ?? [] })
}

// POST — crear consultor manualmente
export async function POST(req: Request) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const { email, companyName, plan = 'starter', credits = 100 } = await req.json()
  if (!email || !companyName) return NextResponse.json({ error: 'email y companyName requeridos' }, { status: 400 })

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: Math.random().toString(36).slice(2) + 'Aa1!',
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  // Create account record
  const { data: account, error: accErr } = await (admin as any)
    .from('accounts')
    .insert({
      user_id: authData.user.id,
      email,
      company_name: companyName,
      subscription_plan: plan,
      credits_balance: credits,
      status: 'active',
    })
    .select()
    .single()

  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 })
  return NextResponse.json({ account })
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
  if (credits !== undefined) updates.credits_balance = credits
  if (plan !== undefined) updates.subscription_plan = plan

  const { data, error } = await (admin as any)
    .from('accounts')
    .update(updates)
    .eq('id', accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
