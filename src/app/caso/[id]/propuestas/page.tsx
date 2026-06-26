export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import ProposalClient from './ProposalClient'

export default async function PropuestasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: caseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select('id, credits_total, credits_used')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/dashboard')

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseData) redirect('/dashboard')

  const hasBrief = await (async () => {
    const { data } = await db
      .from('briefs')
      .select('id')
      .eq('case_id', caseId)
      .limit(1)
      .maybeSingle()
    return !!data
  })()

  return (
    <ProposalClient
      caseId={caseId}
      companyName={caseData.company_name}
      industry={caseData.industry}
      creditsRemaining={account.credits_total - account.credits_used}
      hasBrief={hasBrief}
    />
  )
}
