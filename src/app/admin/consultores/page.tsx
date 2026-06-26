import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import ConsultoresClient from './ConsultoresClient'
import { ACCOUNT_COLUMNS, accountToUI } from '@/lib/accounts'

export const dynamic = 'force-dynamic'

export default async function ConsultoresPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin()
  const { data: consultores } = await (admin as any)
    .from('accounts')
    .select(ACCOUNT_COLUMNS)
    .order('created_at', { ascending: false })

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <ConsultoresClient consultores={(consultores ?? []).map(accountToUI)} />
    </AppShell>
  )
}
