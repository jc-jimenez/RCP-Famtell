import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import PremiumModulesClient from './PremiumModulesClient'

export const dynamic = 'force-dynamic'

export default async function AdminPremiumPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin()
  const db = admin as any

  const { data: rawAccounts } = await db
    .from('accounts')
    .select('id,email,company_name,plan_id')
    .eq('status', 'active')

  const accounts = (rawAccounts ?? []).map((a: any) => ({
    id: a.id,
    email: a.email,
    company_name: a.company_name ?? '',
    subscription_plan: a.plan_id ?? 'starter',
  }))

  const { data: premiumModules } = await db
    .from('premium_modules')
    .select('*')

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <PremiumModulesClient accounts={accounts ?? []} premiumModules={premiumModules ?? []} />
    </AppShell>
  )
}
