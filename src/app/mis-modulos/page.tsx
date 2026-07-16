export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { colaboradorOnboardingSteps } from '@/components/onboarding/colaboradorSteps'
import { hasCapability } from '@/lib/permissions'
import { getModulesForPosition } from '@/lib/moduleCompletion'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import { countQuestionsForPosition } from '@/lib/moduleQuestions'
import ModuleJourneyCard, { JOURNEY_ACCENTS } from '@/components/shared/ModuleJourneyCard'

const MODULE_EMOJI: Record<string, string> = {
  M1: '💼', M2: '⚙️', M3: '🤝', M4: '💰', M5: '🎯', M6: '🧑‍🤝‍🧑', M7: '📋',
}

export default async function MisModulosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseUser } = await db
    .from('case_users')
    .select('case_id, role, job_title, job_position_id, onboarding_dismissed_at, cases(company_name, industry)')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!caseUser) redirect('/login')
  if (!hasCapability(caseUser.role, 'access_collaborator_workspace')) redirect('/login')

  const caseData = caseUser.cases as any

  if (!caseUser.onboarding_dismissed_at) {
    return (
      <AppShell role="collaborator" email={session.user.email!}>
        <OnboardingWizard
          steps={colaboradorOnboardingSteps}
          dismissEndpoint="/api/onboarding/participante"
          dismissBody={{ caseId: caseUser.case_id }}
        />
      </AppShell>
    )
  }
  // Catálogo real del caso (propio si existe, si no el global M1-M7)
  const catalogScope = await resolveCatalogScope(db, caseUser.case_id)
  const templatesQuery = db.from('module_templates').select('code, name').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, caseUser.case_id).order('sort_order', { ascending: true })
  const moduleLabels: Record<string, string> = {}
  ;(templates ?? []).forEach((t: any) => { moduleLabels[t.code] = t.name })
  const allModuleCodes = (templates ?? []).map((t: any) => t.code)

  // Se recalcula en cada carga a partir del mapeo vigente en Módulos — no
  // se usa un snapshot guardado al invitar, porque el consultor puede
  // remapear preguntas a puestos después de la invitación.
  const derivedModules = caseUser.job_position_id
    ? await getModulesForPosition(db, caseUser.case_id, caseUser.job_position_id)
    : []
  // Puesto sin preguntas mapeadas todavía: se le dan todos los módulos
  // mientras tanto (mismo criterio que al invitar). Sin puesto asignado:
  // no hay nada que mostrar.
  const assignedInstruments: string[] = !caseUser.job_position_id
    ? []
    : derivedModules.length > 0 ? derivedModules : allModuleCodes

  const { data: sessions } = await db
    .from('sessions')
    .select('module_code, completed, last_message_at, answered_questions')
    .eq('case_id', caseUser.case_id)
    .eq('user_id', session.user.id)

  const sessionMap: Record<string, { completed: boolean; last_message_at: string | null; answered: number }> = {}
  ;(sessions ?? []).forEach((s: any) => {
    sessionMap[s.module_code] = { completed: s.completed, last_message_at: s.last_message_at, answered: s.answered_questions ?? 0 }
  })

  // Desbloqueo secuencial estricto, igual que el directivo (caso/[id]/page.tsx)
  // — antes cualquier colaborador podía entrar a CUALQUIER módulo asignado
  // desde el día uno (isLocked hardcoded en false), lo que en la práctica
  // llevaba a que curiosearan varios módulos a la vez sin terminar ninguno.
  // Importante: el "siguiente módulo" se calcula sobre SUS instrumentos
  // asignados (assignedInstruments), no sobre el catálogo completo M1-M7 —
  // un colaborador sin M4 mapeado a su puesto no debe quedar atorado
  // esperando completar un módulo que nunca le tocó.
  const myCompletedModules = new Set(
    Object.entries(sessionMap).filter(([, s]) => s.completed).map(([code]) => code)
  )
  const nextInstrument = assignedInstruments.find(code => !myCompletedModules.has(code))

  // % de avance de mi entrevista por instrumento en progreso — antes solo
  // había un estado categórico (completado/en progreso/pendiente), sin
  // ningún número real de cuánto falta.
  const percentMap: Record<string, number> = {}
  if (caseUser.job_position_id) {
    for (const code of assignedInstruments) {
      const sess = sessionMap[code]
      if (!sess || sess.completed || !sess.last_message_at) continue
      const total = await countQuestionsForPosition(db, caseUser.case_id, code, caseUser.job_position_id)
      percentMap[code] = total > 0 ? Math.min(100, Math.round((sess.answered / total) * 100)) : 0
    }
  }

  return (
    <AppShell role="collaborator" email={session.user.email!}>
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-xl font-bold text-ink">Mis instrumentos</h1>
          {caseData && (
            <p className="text-muted text-sm mt-1">
              Caso: <span className="text-ink font-medium">{caseData.company_name}</span>
              {caseData.industry && <span className="text-faint"> · {caseData.industry}</span>}
            </p>
          )}
          {caseUser.job_title && (
            <p className="text-xs text-faint mt-0.5">{caseUser.job_title}</p>
          )}
        </div>

        {assignedInstruments.length === 0 ? (
          <div className="card p-10 text-center border-dashed">
            <p className="text-muted font-medium mb-1">Aún no tienes instrumentos asignados</p>
            <p className="text-faint text-sm">Tu consultor te asignará instrumentos próximamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {assignedInstruments.map((code, i) => {
              const sess = sessionMap[code]
              const completed = sess?.completed ?? false
              const hasProgress = !!sess?.last_message_at && !completed
              const percent = completed ? 100 : hasProgress ? (percentMap[code] ?? 0) : 0
              const isLocked = !completed && code !== nextInstrument

              return (
                <ModuleJourneyCard
                  key={code}
                  index={i + 1}
                  label={moduleLabels[code] ?? code}
                  emoji={MODULE_EMOJI[code] ?? '📄'}
                  percent={percent}
                  isCompleted={completed}
                  isLocked={isLocked}
                  subtext={isLocked ? 'Bloqueado' : completed ? 'Completado' : hasProgress ? 'En progreso' : 'Pendiente de respuesta'}
                  href={isLocked ? undefined : `/mis-modulos/${caseUser.case_id}/${code}`}
                  ctaLabel={completed ? 'Ver sesión' : hasProgress ? 'Continuar →' : 'Iniciar →'}
                  accent={JOURNEY_ACCENTS[i % JOURNEY_ACCENTS.length]}
                />
              )
            })}
          </div>
        )}

        <p className="text-xs text-faint text-center">
          {assignedInstruments.length} instrumento{assignedInstruments.length !== 1 ? 's' : ''} asignado{assignedInstruments.length !== 1 ? 's' : ''}
        </p>

        {caseUser.case_id && (
          <Link
            href={`/caso/${caseUser.case_id}/checkin` as any}
            className="block rounded-xl border border-subtle bg-surface hover:border-accent/30 hover:bg-accent-soft transition-colors p-4"
          >
            <p className="text-sm font-medium text-ink">📋 Check-in semanal del caso</p>
            <p className="text-xs text-faint mt-0.5">Ver el avance semanal reportado por el directivo</p>
          </Link>
        )}
      </div>
    </AppShell>
  )
}
