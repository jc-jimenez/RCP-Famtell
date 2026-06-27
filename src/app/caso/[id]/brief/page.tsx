export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import BriefConsultorClient from './BriefConsultorClient'
import BriefDirectorClient from './BriefDirectorClient'

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, account_id')
    .eq('id', id)
    .single()

  if (!caseData) redirect('/login')

  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const isConsultant = !!(account && caseData.account_id === account.id)
  const isDirector = caseUser?.role === 'director'
  if (!isConsultant && !isDirector) redirect('/login')

  // Cargar brief de la nueva tabla
  const { data: brief } = await db
    .from('brief_documents')
    .select('*')
    .eq('case_id', id)
    .maybeSingle()

  // Señales IER
  const { data: signals } = await db
    .from('agenda_signals')
    .select('module_code, signal_type, signal_text')
    .eq('case_id', id)

  const ierCounts = { blue: 0, yellow: 0, red: 0 }
  ;(signals ?? []).forEach((s: any) => ierCounts[s.signal_type as keyof typeof ierCounts]++)

  // Módulos completados (tienen al menos una sesión)
  const { data: completedSessions } = await db
    .from('sessions')
    .select('module_code')
    .eq('case_id', id)

  const uniqueModules = new Set((completedSessions ?? []).map((s: any) => s.module_code))
  const modulesCompleted = uniqueModules.size

  if (isConsultant) {
    return (
      <BriefConsultorClient
        caseId={id}
        companyName={caseData.company_name}
        industry={caseData.industry ?? '3PL / Logística'}
        email={session.user.email!}
        initialBrief={brief ?? null}
        ierCounts={ierCounts}
        modulesCompleted={modulesCompleted}
      />
    )
  }

  // Director — solo puede ver el brief si está publicado
  if (!brief || brief.status !== 'published') {
    return (
      <BriefDirectorClient
        caseId={id}
        companyName={caseData.company_name}
        email={session.user.email!}
        brief={null}
        role="director"
      />
    )
  }

  return (
    <BriefDirectorClient
      caseId={id}
      companyName={caseData.company_name}
      email={session.user.email!}
      brief={brief}
      role="director"
    />
  )
}
