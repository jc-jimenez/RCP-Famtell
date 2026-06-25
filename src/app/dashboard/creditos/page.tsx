import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import CreditosClient from './CreditosClient'

export const dynamic = 'force-dynamic'

export default async function CreditosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user.email) redirect('/login')

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select('id,company_name,credits_balance,subscription_plan,status')
    .eq('email', session.user.email)
    .single()

  if (!account) redirect('/login')

  return (
    <AppShell role="consultant" email={session.user.email}>
      <CreditosClient account={account} />
    </AppShell>
  )
}
