import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import CreditosClient from './CreditosClient'
import { ACCOUNT_COLUMNS, accountToUI } from '@/lib/accounts'

export const dynamic = 'force-dynamic'

export default async function CreditosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user.email) redirect('/login')

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('email', session.user.email)
    .single()

  if (!account) redirect('/login')

  return (
    <AppShell role="consultant" email={session.user.email}>
      <CreditosClient account={accountToUI(account)} />
    </AppShell>
  )
}
