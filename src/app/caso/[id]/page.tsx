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
import { countQuestionsForPosition } from '@/lib/moduleQuestions'
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

  // Módulos del caso — solo se usa para el conteo CASE-WIDE (Brief, accesos
  // rápidos), no para decidir qué módulo puedo abrir yo. El desbloqueo de
  // navegación es POR PARTICIPANTE (ver sesiones abajo): antes dependía de
  // que TODOS los puestos del caso completaran el módulo, así que alguien
  // que ya había terminado su propia entrevista se quedaba viendo "Bloqueado"
  // en el Módulo 2 esperando a compañeros que ni siquiera habían empezado.
  const { data: modules } = await db
    .from('modules')
    .select('module_code, status')
    .eq('case_id', id)
  const caseCompletedCount = (modules ?? []).filter((m: any) => m.status === 'completed').length

  // Mis propias sesiones — de aquí sale qué módulos YA completé y cuál sigue.
  const { data: sessions } = await db
    .from('sessions')
    .select('module_code, last_message_at, answered_questions, completed')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .order('last_message_at', { ascending: false })

  const lastSessionMap: Record<string, string> = {}
  const answeredMap: Record<string, number> = {}
  const myCompletedModules = new Set<string>()
  const myCompletedAtMap: Record<string, string> = {}
  ;(sessions ?? []).forEach((s: any) => {
    if (!lastSessionMap[s.module_code]) {
      lastSessionMap[s.module_code] = s.last_message_at
      answeredMap[s.module_code] = s.answered_questions ?? 0
    }
    if (s.completed) {
      myCompletedModules.add(s.module_code)
      if (!myCompletedAtMap[s.module_code]) myCompletedAtMap[s.module_code] = s.last_message_at
    }
  })

  const myCompletedCount = myCompletedModules.size
  const shellRole = role === 'consultant' ? 'consultant' : 'director'

  // Próximo módulo activo — el primero que YO no haya completado, sin
  // importar el avance de otros participantes del caso.
  const nextModule = moduleOrder.find(code => !myCompletedModules.has(code))

  // Avance real por puesto (rojo/ámbar/verde) — información del caso
  // completo, no bloquea mi navegación, solo da contexto de cuántos
  // compañeros más faltan por contestar este módulo.
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
      modulesCompleted={myCompletedCount}
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
            <p className="text-2xl font-bold text-ink">{myCompletedCount}<span className="text-base font-normal text-muted">/{moduleOrder.length}</span></p>
            <p className="text-xs text-muted">módulos</p>
          </div>
        </div>

        {/* Mapa de Customer Journey */}
        <CustomerJourneyMap journey={journey} continueHref={journeyContinueHref} showFindings={false} />

        {/* Barra de progreso */}
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            {moduleOrder.map((code, i) => {
              const done = myCompletedModules.has(code)
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
              style={{ width: `${moduleOrder.length > 0 ? (myCompletedCount / moduleOrder.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {myCompletedCount === 0
              ? 'Comienza con el Módulo 1 para activar tu diagnóstico'
              : myCompletedCount === moduleOrder.length
              ? '¡Terminaste tu parte! Revisa tu Brief en la pestaña Brief'
              : `${moduleOrder.length - myCompletedCount} módulos restantes`}
          </p>
        </div>

        {/* Módulos de diagnóstico */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Tu recorrido de diagnóstico</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {moduleOrder.map((code, i) => {
              const info = moduleInfo[code]
              const isCompleted = myCompletedModules.has(code)
              const isCurrent = code === nextModule
              const isLocked = !isCompleted && !isCurrent
              const lastActivity = lastSessionMap[code]
              const hasSession = !!lastActivity
              const percent = isCompleted ? 100 : isCurrent ? currentModulePercent : 0

              const subtext = isCompleted && myCompletedAtMap[code]
                ? `Completado ${formatDate(myCompletedAtMap[code])}`
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
        {isDirector && myCompletedCount > 0 && (
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
              <p className="text-xs text-muted mt-0.5">{caseCompletedCount === moduleOrder.length ? 'Ver diagnóstico' : 'Disponible al completar'}</p>
            </Link>
          </div>
        )}

      </div>
    </AppShell>
  )
}
