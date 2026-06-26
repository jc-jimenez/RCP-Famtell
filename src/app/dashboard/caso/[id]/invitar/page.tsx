export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import InvitarClient from './InvitarClient'

export default async function InvitarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Verificar que el caso pertenece al consultor
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/dashboard')

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, account_id')
    .eq('id', id)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseData) redirect('/dashboard')

  // Participantes actuales
  const { data: participants } = await db
    .from('case_users')
    .select('id, role, job_title, invitation_email, invitation_token, permissions_json, activated_at, last_seen_at')
    .eq('case_id', id)
    .order('role', { ascending: true })

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <InvitarClient
        caseId={id}
        companyName={caseData.company_name}
        initialParticipants={participants ?? []}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
      />
    </AppShell>
  )
}
