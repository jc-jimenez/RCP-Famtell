export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import CreditsBadge from '@/components/shared/CreditsBadge'
import CaseListWithDelete from '@/components/dashboard/CaseListWithDelete'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { consultorOnboardingSteps } from '@/components/onboarding/consultorSteps'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const db = supabase as any

  // Datos del consultor
  const { data: account } = await db
    .from('accounts')
    .select('id, credits_total, credits_used, plan_id, status, onboarding_dismissed_at')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/login')

  if (!account.onboarding_dismissed_at) {
    return (
      <AppShell role="consultant" email={session.user.email!}>
        <OnboardingWizard steps={consultorOnboardingSteps} dismissEndpoint="/api/onboarding/consultor" />
      </AppShell>
    )
  }

  // Casos del consultor
  const { data: cases } = await db
    .from('cases')
    .select('id, company_name, industry, status, created_at, credits_used')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })

  const activeCases = cases?.filter((c: any) => c.status === 'active') ?? []
  const allCases = cases ?? []

  // Salud rápida por caso (módulos completados/total) — una sola query para
  // todos los casos, no N+1. El semáforo real por puesto vive en el detalle
  // de cada caso (tab Diagnóstico); aquí solo es un vistazo rápido al
  // navegar la lista.
  const caseIds = allCases.map((c: any) => c.id)
  const { data: allModules } = caseIds.length > 0
    ? await db.from('modules').select('case_id, status').in('case_id', caseIds)
    : { data: [] }

  const healthByCase: Record<string, { completed: number; total: number }> = {}
  ;(allModules ?? []).forEach((m: any) => {
    if (!healthByCase[m.case_id]) healthByCase[m.case_id] = { completed: 0, total: 0 }
    healthByCase[m.case_id].total++
    if (m.status === 'completed') healthByCase[m.case_id].completed++
  })

  const casesWithHealth = allCases.map((c: any) => ({
    ...c,
    modulesCompleted: healthByCase[c.id]?.completed ?? 0,
    modulesTotal: healthByCase[c.id]?.total ?? 0,
  }))

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">Mis casos activos</h1>
            <p className="text-muted text-sm mt-1">
              {activeCases.length} activo{activeCases.length !== 1 ? 's' : ''} · {allCases.length} en total
            </p>
          </div>
          <Link href="/dashboard/nuevo-caso" className="btn-primary text-sm">
            + Nuevo caso
          </Link>
        </div>

        {/* Créditos */}
        <CreditsBadge
          total={account.credits_total}
          used={account.credits_used}
        />

        {/* Lista de casos */}
        <CaseListWithDelete initialCases={casesWithHealth} />
      </div>
    </AppShell>
  )
}
