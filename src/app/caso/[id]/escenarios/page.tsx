export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import EscenariosClient from './EscenariosClient'

export default async function EscenariosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', id)
    .single()

  if (!caseData || !caseUser) redirect('/login')

  return (
    <EscenariosClient
      caseId={id}
      companyName={caseData.company_name}
      role={caseUser.role}
      email={session.user.email!}
    />
  )
}
