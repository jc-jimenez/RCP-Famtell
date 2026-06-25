export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import BriefGeneratorClient from './BriefGeneratorClient'

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

  if (!caseData) redirect('/dashboard')

  // Verificar si el usuario tiene acceso (consultor o directivo del caso)
  const { data: account } = await db
    .from('accounts')
    .select('id, credits_total, credits_used')
    .eq('email', session.user.email)
    .maybeSingle()

  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const isConsultant = account && caseData.account_id === account.id
  const isDirector = caseUser?.role === 'director'
  if (!isConsultant && !isDirector) redirect('/login')

  // Brief más reciente
  const { data: brief } = await db
    .from('briefs')
    .select('*')
    .eq('case_id', id)
    .eq('brief_type', 'diagnostic')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Contar módulos completados
  const { data: modules } = await db
    .from('modules')
    .select('status')
    .eq('case_id', id)

  const completedCount = (modules ?? []).filter((m: any) => m.status === 'completed').length

  return (
    <AppShell
      role={isConsultant ? 'consultant' : 'director'}
      email={session.user.email!}
      caseCompanyName={caseData.company_name}
    >
      <BriefGeneratorClient
        caseId={id}
        companyName={caseData.company_name}
        existingBrief={brief ?? null}
        completedModules={completedCount}
        canGenerate={isConsultant}
        creditsRemaining={account ? account.credits_total - account.credits_used : 0}
      />
    </AppShell>
  )
}
