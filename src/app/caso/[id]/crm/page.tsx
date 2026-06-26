export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import CRMClient from './CRMClient'

export default async function CRMPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: caseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Verificar acceso al caso
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/dashboard')

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseData) redirect('/dashboard')

  const { data: contacts } = await db
    .from('contacts')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  return (
    <CRMClient
      caseId={caseId}
      companyName={caseData.company_name}
      initialContacts={contacts ?? []}
    />
  )
}
