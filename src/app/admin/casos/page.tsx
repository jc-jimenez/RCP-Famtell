import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import { isSuperAdminEmail } from '@/lib/permissions'
import CasosAdminClient from './CasosAdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminCasosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || !isSuperAdminEmail(session.user.email)) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin()
  const db = admin as any

  const { data: cases } = await db
    .from('cases')
    .select('id,company_name,industry,status,strategic_intent,created_at,account_id')
    .order('created_at', { ascending: false })

  const { data: accounts } = await db
    .from('accounts')
    .select('id,company_name,email')
    .order('company_name', { ascending: true })

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <CasosAdminClient initialCases={cases ?? []} accounts={accounts ?? []} />
    </AppShell>
  )
}
