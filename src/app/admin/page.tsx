import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import AdminMetricsClient from './AdminMetricsClient'
import { ACCOUNT_COLUMNS, accountToUI } from '@/lib/accounts'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin()
  const db = admin as any

  const [
    { count: totalConsultants },
    { count: totalCases },
    { data: accounts },
    { data: recentCases },
  ] = await Promise.all([
    db.from('accounts').select('*', { count: 'exact', head: true }),
    db.from('cases').select('*', { count: 'exact', head: true }),
    db.from('accounts').select(ACCOUNT_COLUMNS).order('created_at', { ascending: false }).limit(5),
    db.from('cases').select('id,company_name,status,created_at').order('created_at', { ascending: false }).limit(8),
  ])

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <AdminMetricsClient
        totalConsultants={totalConsultants ?? 0}
        totalCases={totalCases ?? 0}
        recentAccounts={(accounts ?? []).map(accountToUI)}
        recentCases={recentCases ?? []}
      />
    </AppShell>
  )
}
