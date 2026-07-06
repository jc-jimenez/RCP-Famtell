export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import CasoTabs from '@/components/consultor/CasoTabs'
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
    .select('week, values, recorded_at')
    .eq('case_id', id)
    .order('week', { ascending: true })

  const { data: definitions } = await db
    .from('case_kpi_definitions')
    .select('id, metric_key, label, target, unit, sort_order')
    .eq('case_id', id)
    .order('sort_order', { ascending: true })

  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const role = caseUser?.role === 'director' ? 'director' : 'consultant'

  const tabBar = role === 'director'
    ? <DirectorTabs caseId={id} />
    : <CasoTabs caseId={id} activeTab="kpis" />

  return (
    <AppShell role={role} email={session.user.email!} caseCompanyName={caseData?.company_name} tabBar={tabBar}>
      <KPIBoardClient
        caseId={id}
        role={role}
        initialKPIs={kpis ?? []}
        initialDefinitions={definitions ?? []}
      />
    </AppShell>
  )
}
