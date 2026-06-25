import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const isSA = session.user.email === process.env.SUPER_ADMIN_EMAIL
  return isSA ? session : null
}

export async function GET() {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const db = admin as any

  const [
    { count: totalConsultants },
    { count: totalCases },
    { data: accounts },
    { data: recentCases },
  ] = await Promise.all([
    db.from('accounts').select('*', { count: 'exact', head: true }),
    db.from('cases').select('*', { count: 'exact', head: true }),
    db.from('accounts').select('id,email,company_name,credits_balance,subscription_plan,status,created_at').order('created_at', { ascending: false }),
    db.from('cases').select('id,company_name,status,created_at,account_id').order('created_at', { ascending: false }).limit(10),
  ])

  // Sum credits consumed (rough MRR proxy)
  const totalCreditsConsumed = (accounts ?? []).reduce((acc: number, a: any) => {
    const initial = a.subscription_plan === 'pro' ? 500 : 100
    return acc + Math.max(0, initial - (a.credits_balance ?? 0))
  }, 0)

  return NextResponse.json({
    totalConsultants: totalConsultants ?? 0,
    totalCases: totalCases ?? 0,
    totalCreditsConsumed,
    accounts: accounts ?? [],
    recentCases: recentCases ?? [],
  })
}
