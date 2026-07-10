export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { colaboradorOnboardingSteps } from '@/components/onboarding/colaboradorSteps'
import { hasCapability } from '@/lib/permissions'
import { getModulesForPosition } from '@/lib/moduleCompletion'

const MODULE_LABELS: Record<string, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
  M7: 'Síntesis y Plan RCP',
}

const ALL_MODULE_CODES = Object.keys(MODULE_LABELS)

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
  // Se recalcula en cada carga a partir del mapeo vigente en Plan de
  // Diagnóstico — no se usa un snapshot guardado al invitar, porque el
  // consultor puede remapear preguntas a puestos después de la invitación.
  const derivedModules = caseUser.job_position_id
    ? await getModulesForPosition(db, caseUser.case_id, caseUser.job_position_id)
    : []
  // Puesto sin preguntas mapeadas todavía: se le dan todos los módulos
  // mientras tanto (mismo criterio que al invitar). Sin puesto asignado:
  // no hay nada que mostrar.
  const assignedInstruments: string[] = !caseUser.job_position_id
    ? []
    : derivedModules.length > 0 ? derivedModules : ALL_MODULE_CODES

  const { data: sessions } = await db
    .from('sessions')
    .select('module_code, completed, last_message_at')
    .eq('case_id', caseUser.case_id)
    .eq('user_id', session.user.id)

  const sessionMap: Record<string, { completed: boolean; last_message_at: string | null }> = {}
  ;(sessions ?? []).forEach((s: any) => {
    sessionMap[s.module_code] = { completed: s.completed, last_message_at: s.last_message_at }
  })

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
          <div className="space-y-3">
            {assignedInstruments.map((code) => {
              const sess = sessionMap[code]
              const completed = sess?.completed ?? false
              const hasProgress = !!sess?.last_message_at && !completed

              return (
                <Link
                  key={code}
                  href={`/mis-modulos/${caseUser.case_id}/${code}` as any}
                  className={`block rounded-xl border transition-all p-4 group ${
                    completed
                      ? 'bg-emerald-50/50 border-emerald-100'
                      : hasProgress
                      ? 'bg-accent-soft border-accent/20 hover:border-accent/40'
                      : 'bg-surface border-subtle hover:border-accent/30 hover:bg-accent-soft'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      completed ? 'bg-emerald-100 text-emerald-700' :
                      hasProgress ? 'bg-accent/10 text-accent' :
                      'bg-surface-2 text-muted'
                    }`}>
                      {completed ? '✓' : code}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-ink text-sm group-hover:text-accent transition-colors">
                        {MODULE_LABELS[code] ?? code}
                      </p>
                      <p className="text-xs text-faint mt-0.5">
                        {completed ? 'Completado' : hasProgress ? 'En progreso' : 'Pendiente de respuesta'}
                      </p>
                    </div>
                    {!completed && (
                      <span className="text-xs font-medium text-muted group-hover:text-accent transition-colors">
                        {hasProgress ? 'Continuar →' : 'Iniciar →'}
                      </span>
                    )}
                  </div>
                </Link>
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
