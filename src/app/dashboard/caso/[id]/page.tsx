export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import AgendaPanel from '@/components/consultor/AgendaPanel'
import type { ModuleCode } from '@/types'

const MODULE_LABELS: Record<ModuleCode, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
  M7: 'Síntesis y Plan RCP',
}

const MODULE_ORDER: ModuleCode[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

export default async function CasoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Verificar que el caso pertenece al consultor
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/dashboard')

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, status, created_at, credits_used')
    .eq('id', id)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseData) redirect('/dashboard')

  // Módulos
  const { data: modules } = await db
    .from('modules')
    .select('module_code, status, completed_at, credits_used')
    .eq('case_id', id)

  const moduleMap: Record<string, any> = {}
  ;(modules ?? []).forEach((m: any) => { moduleMap[m.module_code] = m })

  const completedCount = Object.values(moduleMap).filter((m: any) => m.status === 'completed').length

  // Participantes
  const { data: participants } = await db
    .from('case_users')
    .select('id, role, job_title, invitation_email, activated_at, last_seen_at')
    .eq('case_id', id)

  // Señales de agenda
  const { data: signals } = await db
    .from('agenda_signals')
    .select('signal_type, signal_text, module_code, detected_at')
    .eq('case_id', id)
    .order('detected_at', { ascending: true })

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300 mb-2 inline-block">
              ← Mis casos
            </Link>
            <h1 className="text-2xl font-bold text-white">{caseData.company_name}</h1>
            {caseData.industry && <p className="text-slate-400 text-sm mt-0.5">{caseData.industry}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Progreso</p>
            <p className="text-2xl font-bold text-white">{completedCount}<span className="text-slate-600 text-lg">/7</span></p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">

            {/* Módulos */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Módulos de diagnóstico</h2>
              <div className="space-y-2">
                {MODULE_ORDER.map((code) => {
                  const m = moduleMap[code]
                  const status = m?.status ?? 'locked'
                  return (
                    <div key={code} className={`flex items-center gap-3 p-3 rounded-xl ${
                      status === 'completed' ? 'bg-emerald-950/30 border border-emerald-900/40' :
                      status === 'active'    ? 'bg-blue-950/30 border border-blue-900/40' :
                      'bg-slate-800/30 border border-slate-800'
                    }`}>
                      <span className={`text-xs font-bold w-7 text-center ${
                        status === 'completed' ? 'text-emerald-400' :
                        status === 'active'    ? 'text-blue-400' :
                        'text-slate-600'
                      }`}>
                        {status === 'completed' ? '✓' : code}
                      </span>
                      <span className={`text-sm flex-1 ${status === 'locked' ? 'text-slate-600' : 'text-slate-200'}`}>
                        {MODULE_LABELS[code]}
                      </span>
                      <span className="text-xs text-slate-600">
                        {status === 'completed' ? (m.completed_at ? new Date(m.completed_at).toLocaleDateString('es-MX') : '') :
                         status === 'active' ? 'En progreso' : 'Pendiente'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Participantes */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300">Participantes</h2>
                <Link
                  href={`/dashboard/caso/${id}/invitar` as any}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  + Invitar
                </Link>
              </div>
              {(!participants || participants.length === 0) ? (
                <p className="text-xs text-slate-600">No hay participantes invitados aún</p>
              ) : (
                <div className="space-y-2">
                  {participants.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {p.role === 'director' ? 'D' : 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{p.invitation_email ?? '—'}</p>
                        <p className="text-xs text-slate-500">{p.job_title ?? p.role}</p>
                      </div>
                      <span className={`text-xs font-medium ${p.activated_at ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {p.activated_at ? 'Activo' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Agenda Oculta */}
          <AgendaPanel signals={signals ?? []} />
        </div>
      </div>
    </AppShell>
  )
}
