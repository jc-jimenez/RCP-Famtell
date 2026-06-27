import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import ConsultoresClient from './ConsultoresClient'

export const dynamic = 'force-dynamic'

export default async function ConsultoresPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin() as any

  // Cuentas con créditos
  const { data: accounts } = await admin
    .from('accounts')
    .select('id, email, company_name, credits_total, credits_used, plan_id, status, created_at')
    .order('created_at', { ascending: false })

  // Último login de cada usuario (auth.users vía admin)
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const lastLoginMap: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) {
    if (u.email) lastLoginMap[u.email] = u.last_sign_in_at ?? ''
  }

  // Casos activos por cuenta
  const { data: caseRows } = await admin
    .from('cases')
    .select('account_id, status')
  const casesMap: Record<string, number> = {}
  for (const c of caseRows ?? []) {
    if (c.status !== 'archived') {
      casesMap[c.account_id] = (casesMap[c.account_id] ?? 0) + 1
    }
  }

  const consultores = (accounts ?? []).map((a: any) => ({
    id: a.id,
    email: a.email,
    company_name: a.company_name ?? '',
    credits_balance: (a.credits_total ?? 0) - (a.credits_used ?? 0),
    credits_total: a.credits_total ?? 0,
    subscription_plan: a.plan_id ?? 'starter',
    status: a.status ?? 'active',
    created_at: a.created_at,
    last_login: lastLoginMap[a.email] ?? null,
    active_cases: casesMap[a.id] ?? 0,
  }))

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <ConsultoresClient consultores={consultores} />
    </AppShell>
  )
}
