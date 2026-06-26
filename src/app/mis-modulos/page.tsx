export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'

const MODULE_LABELS: Record<string, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
  M7: 'Síntesis y Plan RCP',
}

export default async function MisModulosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseUser } = await db
    .from('case_users')
    .select('case_id, role, job_title, permissions_json, cases(company_name, industry)')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!caseUser) redirect('/login')
  if (caseUser.role !== 'collaborator') redirect('/login')

  const permissions = caseUser.permissions_json as { modules?: string[] } | null
  const caseData = caseUser.cases as any
  const assignedInstruments: string[] = permissions?.modules ?? []

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
      </div>
    </AppShell>
  )
}
