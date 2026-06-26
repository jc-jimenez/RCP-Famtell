export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'

export default async function MisModulosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Obtener instrumentos asignados al colaborador
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

  // Cargar sesiones existentes del colaborador en este caso
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

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Mis instrumentos</h1>
          {caseData && (
            <p className="text-slate-400 text-sm mt-1">
              Caso: <span className="text-slate-200 font-medium">{caseData.company_name}</span>
              {caseData.industry && <span className="text-slate-500"> · {caseData.industry}</span>}
            </p>
          )}
          {caseUser.job_title && (
            <p className="text-xs text-slate-500 mt-0.5">{caseUser.job_title}</p>
          )}
        </div>

        {assignedInstruments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
            <p className="text-slate-400 font-medium mb-1">Aún no tienes instrumentos asignados</p>
            <p className="text-slate-600 text-sm">Tu consultor te asignará instrumentos próximamente</p>
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
                  className={`block rounded-2xl border transition-all p-5 group ${
                    completed
                      ? 'border-emerald-900/50 bg-emerald-950/20'
                      : hasProgress
                      ? 'border-blue-800/50 bg-blue-950/20 hover:border-blue-700'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      completed ? 'bg-emerald-800 text-emerald-300' :
                      hasProgress ? 'bg-blue-800 text-blue-300' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {completed ? '✓' : code}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                        Instrumento {code}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {completed ? 'Completado' : hasProgress ? 'En progreso' : 'Pendiente de respuesta'}
                      </p>
                    </div>
                    {!completed && (
                      <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
                        {hasProgress ? 'Continuar →' : 'Iniciar →'}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <p className="text-xs text-slate-600 text-center">
          {assignedInstruments.length} instrumento{assignedInstruments.length !== 1 ? 's' : ''} asignado{assignedInstruments.length !== 1 ? 's' : ''}
        </p>
      </div>
    </AppShell>
  )
}
