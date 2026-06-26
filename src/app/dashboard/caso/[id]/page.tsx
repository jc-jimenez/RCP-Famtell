export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import AgendaPanel from '@/components/consultor/AgendaPanel'
import ParticipantesPanel from '@/components/consultor/ParticipantesPanel'
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
    .select('id, role, job_title, invitation_email, permissions_json, activated_at')
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
            <Link href="/dashboard" className="text-xs text-muted hover:text-ink mb-2 inline-block">
              ← Mis casos
            </Link>
            <h1 className="text-xl font-bold text-ink">{caseData.company_name}</h1>
            {caseData.industry && <p className="text-muted text-sm mt-0.5">{caseData.industry}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-faint">Progreso</p>
            <p className="text-2xl font-bold text-ink">{completedCount}<span className="text-faint text-lg">/7</span></p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">

            {/* Módulos */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Módulos de diagnóstico</h2>
              <div className="space-y-2">
                {MODULE_ORDER.map((code) => {
                  const m = moduleMap[code]
                  const status = m?.status ?? 'locked'
                  return (
                    <div key={code} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      status === 'completed' ? 'bg-emerald-50/50 border-emerald-100' :
                      status === 'active'    ? 'bg-accent-soft border-accent/20' :
                      'bg-surface-2 border-subtle'
                    }`}>
                      <span className={`text-xs font-bold w-7 text-center ${
                        status === 'completed' ? 'text-emerald-600' :
                        status === 'active'    ? 'text-accent' :
                        'text-faint'
                      }`}>
                        {status === 'completed' ? '✓' : code}
                      </span>
                      <span className={`text-sm flex-1 ${status === 'locked' ? 'text-faint' : 'text-ink'}`}>
                        {MODULE_LABELS[code]}
                      </span>
                      <span className="text-xs text-faint">
                        {status === 'completed' ? (m.completed_at ? new Date(m.completed_at).toLocaleDateString('es-MX') : '') :
                         status === 'active' ? 'En progreso' : 'Pendiente'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <ParticipantesPanel caseId={id} initialParticipants={participants ?? []} />
          </div>

          {/* Agenda Oculta */}
          <AgendaPanel signals={signals ?? []} />
        </div>
      </div>
    </AppShell>
  )
}
