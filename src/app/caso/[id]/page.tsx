export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { directorOnboardingSteps } from '@/components/onboarding/directorSteps'
import { colaboradorOnboardingSteps } from '@/components/onboarding/colaboradorSteps'
import { computeAllModulesCompletion } from '@/lib/moduleCompletion'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import { countQuestionsForPosition, countAnsweredMessages } from '@/lib/moduleQuestions'
import ModuleJourneyCard, { JOURNEY_ACCENTS } from '@/components/shared/ModuleJourneyCard'
import CustomerJourneyMap from '@/components/shared/CustomerJourneyMap'
import { computeCustomerJourney } from '@/lib/customerJourney'

const MODULE_EMOJI: Record<string, string> = {
  M1: '💼', M2: '⚙️', M3: '🤝', M4: '💰', M5: '🎯', M6: '🧑‍🤝‍🧑', M7: '📋',
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export default async function MiCasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseUser } = await db
    .from('case_users')
    .select('role, job_title, job_position_id, onboarding_dismissed_at')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, status')
    .eq('id', id)
    .single()

  if (!caseData || !caseUser) redirect('/login')

  const role = caseUser.role as 'director' | 'collaborator' | 'consultant'
  const isDirector = role === 'director'

  if (!caseUser.onboarding_dismissed_at && (role === 'director' || role === 'collaborator')) {
    return (
      <AppShell role={role === 'director' ? 'director' : 'collaborator'} email={session.user.email!} caseCompanyName={caseData.company_name}>
        <OnboardingWizard
          steps={role === 'director' ? directorOnboardingSteps : colaboradorOnboardingSteps}
          dismissEndpoint="/api/onboarding/participante"
          dismissBody={{ caseId: id }}
        />
      </AppShell>
    )
  }

  // Catálogo real del caso (propio si existe, si no el global M1-M7)
  const catalogScope = await resolveCatalogScope(db, id)
  const templatesQuery = db.from('module_templates').select('code, name, description').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, id).order('sort_order', { ascending: true })
  const moduleOrder: string[] = (templates ?? []).map((t: any) => t.code)
  const moduleInfo: Record<string, { label: string; desc: string }> = {}
  ;(templates ?? []).forEach((t: any) => { moduleInfo[t.code] = { label: t.name, desc: t.description ?? '' } })

  // Módulos del caso
  const { data: modules } = await db
    .from('modules')
    .select('module_code, status, completed_at, updated_at')
    .eq('case_id', id)

  const moduleMap: Record<string, { status: string; completed_at: string | null; updated_at: string | null }> = {}
  ;(modules ?? []).forEach((m: any) => {
    moduleMap[m.module_code] = { status: m.status, completed_at: m.completed_at, updated_at: m.updated_at }
  })

  // Última sesión por módulo (para mostrar "Última actividad" y el % de avance)
  const { data: sessions } = await db
    .from('sessions')
    .select('module_code, last_message_at, messages')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .order('last_message_at', { ascending: false })

  const lastSessionMap: Record<string, string> = {}
  const answeredMap: Record<string, number> = {}
  ;(sessions ?? []).forEach((s: any) => {
    if (!lastSessionMap[s.module_code]) {
      lastSessionMap[s.module_code] = s.last_message_at
      answeredMap[s.module_code] = countAnsweredMessages(s.messages)
    }
  })

  const completedCount = Object.values(moduleMap).filter(m => m.status === 'completed').length
  const shellRole = role === 'consultant' ? 'consultant' : 'director'

  // Próximo módulo activo
  const nextModule = moduleOrder.find(code => {
    const mod = moduleMap[code]
    return !mod || mod.status !== 'completed'
  })

  // Avance real por puesto (rojo/ámbar/verde) — solo se necesita para el módulo activo
  const completionMap: Record<string, { colorStatus: 'red' | 'amber' | 'green'; pending: { jobPositionName: string; hasOccupant: boolean }[] }> = {}
  if (nextModule) {
    const all = await computeAllModulesCompletion(db, id)
    all.forEach(c => { completionMap[c.moduleCode] = c })
  }

  // % de avance de MI entrevista en el módulo actual — antes no existía
  // ningún numero, solo el semáforo rojo/ámbar/verde de arriba (que mide
  // puestos completados, no mi propio avance dentro de la entrevista).
  let currentModulePercent = 0
  if (nextModule && caseUser.job_position_id) {
    const total = await countQuestionsForPosition(db, id, nextModule, caseUser.job_position_id)
    const answered = answeredMap[nextModule] ?? 0
    currentModulePercent = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0
  }

  const journey = await computeCustomerJourney(id)
  const journeyContinueHref = nextModule ? `/caso/${id}/modulo/${nextModule}` : `/caso/${id}/checkin`

  return (
    <AppShell
      role={shellRole}
      email={session.user.email!}
      caseCompanyName={caseData.company_name}
      modulesCompleted={completedCount}
      modulesTotal={moduleOrder.length}
      tabBar={isDirector ? <DirectorTabs caseId={id} /> : undefined}
    >
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">{caseData.company_name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {caseData.industry && <span className="text-sm text-muted">{caseData.industry}</span>}
              {caseUser.job_title && (
                <>
                  <span className="text-faint">·</span>
                  <span className="text-xs text-faint">{caseUser.job_title}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-ink">{completedCount}<span className="text-base font-normal text-muted">/{moduleOrder.length}</span></p>
            <p className="text-xs text-muted">módulos</p>
          </div>
        </div>

        {/* Mapa de Customer Journey */}
        <CustomerJourneyMap journey={journey} continueHref={journeyContinueHref} showFindings={false} />

        {/* Barra de progreso */}
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            {moduleOrder.map((code, i) => {
              const mod = moduleMap[code]
              const status = mod?.status ?? (i === 0 ? 'active' : 'locked')
              const done = status === 'completed'
              const active = !done && (code === nextModule)
              const colorStatus = active ? completionMap[code]?.colorStatus : undefined
              return (
                <div key={code} className="flex items-center gap-1.5 flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                    done ? 'bg-emerald-500 border-emerald-500 text-white' :
                    active && colorStatus === 'amber' ? 'bg-amber-50 border-amber-400 text-amber-600' :
                    active ? 'bg-rose-50 border-rose-400 text-rose-600' :
                    'bg-surface-2 border-subtle text-faint'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  {i < moduleOrder.length - 1 && (
                    <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-400' : 'bg-subtle'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="w-full bg-surface-2 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${moduleOrder.length > 0 ? (completedCount / moduleOrder.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {completedCount === 0
              ? 'Comienza con el Módulo 1 para activar tu diagnóstico'
              : completedCount === moduleOrder.length
              ? '¡Diagnóstico completo! Revisa tu Brief en la pestaña Brief'
              : `${moduleOrder.length - completedCount} módulos restantes`}
          </p>
        </div>

        {/* Módulos de diagnóstico */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Tu recorrido de diagnóstico</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {moduleOrder.map((code, i) => {
              const info = moduleInfo[code]
              const mod = moduleMap[code]
              const status = mod?.status ?? (i === 0 ? 'active' : 'locked')
              const isCompleted = status === 'completed'
              const isCurrent = code === nextModule
              const isLocked = !isCompleted && !isCurrent
              const lastActivity = lastSessionMap[code]
              const hasSession = !!lastActivity
              const percent = isCompleted ? 100 : isCurrent ? currentModulePercent : 0

              const subtext = isCompleted && mod?.completed_at
                ? `Completado ${formatDate(mod.completed_at)}`
                : isCurrent && hasSession
                  ? `Última sesión ${formatDate(lastActivity)}`
                  : undefined

              return (
                <ModuleJourneyCard
                  key={code}
                  index={i + 1}
                  label={info.label}
                  emoji={MODULE_EMOJI[code] ?? '📄'}
                  percent={percent}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  subtext={subtext}
                  href={!isLocked ? `/caso/${id}/modulo/${code}` : undefined}
                  ctaLabel={isCompleted ? 'Ver sesión' : hasSession ? 'Continuar →' : 'Iniciar →'}
                  accent={JOURNEY_ACCENTS[i % JOURNEY_ACCENTS.length]}
                />
              )
            })}
          </div>
          {nextModule && completionMap[nextModule] && completionMap[nextModule]!.pending.length > 0 && (
            <p className={`text-xs mt-4 ${completionMap[nextModule]!.colorStatus === 'amber' ? 'text-amber-700' : 'text-rose-700'}`}>
              Falta por contestar en {moduleInfo[nextModule]?.label}: {completionMap[nextModule]!.pending.map(p => p.jobPositionName).join(', ')}
            </p>
          )}
        </div>

        {/* Accesos rápidos (solo directivo con módulos en progreso) */}
        {isDirector && completedCount > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Link href={`/caso/${id}/kpis` as any} className="card p-4 hover:shadow-sm transition-shadow text-center">
              <p className="text-lg mb-1">📊</p>
              <p className="text-xs font-medium text-ink">Mis KPIs</p>
              <p className="text-xs text-muted mt-0.5">Seguimiento semanal</p>
            </Link>
            <Link href={`/caso/${id}/checkin` as any} className="card p-4 hover:shadow-sm transition-shadow text-center">
              <p className="text-lg mb-1">✅</p>
              <p className="text-xs font-medium text-ink">Check-in</p>
              <p className="text-xs text-muted mt-0.5">Avance de la semana</p>
            </Link>
            <Link href={`/caso/${id}/brief` as any} className="card p-4 hover:shadow-sm transition-shadow text-center">
              <p className="text-lg mb-1">📋</p>
              <p className="text-xs font-medium text-ink">Brief</p>
              <p className="text-xs text-muted mt-0.5">{completedCount === moduleOrder.length ? 'Ver diagnóstico' : 'Disponible al completar'}</p>
            </Link>
          </div>
        )}

      </div>
    </AppShell>
  )
}
