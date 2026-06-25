export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import KPIBoardClient from './KPIBoardClient'

export default async function KPIsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseData } = await db
    .from('cases')
    .select('company_name')
    .eq('id', id)
    .single()

  const { data: kpis } = await db
    .from('kpi_records')
    .select('*')
    .eq('case_id', id)
    .order('week', { ascending: true })

  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const role = caseUser?.role === 'director' ? 'director' : 'consultant'

  return (
    <AppShell role={role} email={session.user.email!} caseCompanyName={caseData?.company_name}>
      <KPIBoardClient caseId={id} initialKPIs={kpis ?? []} canEdit={role === 'director'} />
    </AppShell>
  )
}
