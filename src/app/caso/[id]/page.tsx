export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import type { ModuleCode } from '@/types'

const MODULE_INFO: Record<ModuleCode, { label: string; desc: string; credits: number }> = {
  M1: { label: 'Radiografía Comercial',   desc: 'Ingresos, clientes y modelo comercial',    credits: 10 },
  M2: { label: 'Radiografía Operativa',   desc: 'Procesos, capacidad y cuellos de botella', credits: 10 },
  M3: { label: 'Base de Contactos',       desc: '30 contactos clave para el CRM',           credits: 10 },
  M4: { label: 'Radiografía Financiera',  desc: 'Rentabilidad, deuda y flujo de caja',       credits: 10 },
  M5: { label: 'Radiografía Competitiva', desc: 'Competidores y posicionamiento de mercado', credits: 10 },
  M6: { label: 'Radiografía Interna',     desc: 'Equipo, cultura y brechas de talento',      credits: 10 },
  M7: { label: 'Síntesis y Plan RCP',     desc: 'Diagnóstico completo + Plan 90 días',       credits: 35 },
}

const MODULE_ORDER: ModuleCode[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

export default async function MiCasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Verificar acceso al caso
  const { data: caseUser } = await db
    .from('case_users')
    .select('role, job_title')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  // También permitir al consultor ver la vista
  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, status, account_id')
    .eq('id', id)
    .single()

  if (!caseData) redirect('/login')
  if (!caseUser) redirect('/login')

  // Módulos del caso
  const { data: modules } = await db
    .from('modules')
    .select('*')
    .eq('case_id', id)
    .order('created_at', { ascending: true })

  // Si no hay módulos, se inicializan al entrar al chat
  const moduleMap: Record<string, { status: string; completed_at: string | null }> = {}
  ;(modules ?? []).forEach((m: any) => {
    moduleMap[m.module_code] = { status: m.status, completed_at: m.completed_at }
  })

  const completedCount = Object.values(moduleMap).filter(m => m.status === 'completed').length
  const role = caseUser.role as 'director' | 'collaborator' | 'consultant'

  return (
    <AppShell
      role={role === 'consultant' ? 'consultant' : 'director'}
      email={session.user.email!}
      caseCompanyName={caseData.company_name}
      modulesCompleted={completedCount}
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-ink">Plan RCP · {caseData.company_name}</h1>
          {caseData.industry && (
            <p className="text-muted text-sm mt-1">{caseData.industry}</p>
          )}
          {caseUser.job_title && (
            <p className="text-xs text-faint mt-0.5">{caseUser.job_title}</p>
          )}
        </div>

        {/* Progreso general — círculos numerados */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-ink">Avance del diagnóstico</p>
            <p className="text-sm font-bold text-ink">{completedCount} / 7 módulos</p>
          </div>
          <div className="flex items-center">
            {MODULE_ORDER.map((code, i) => {
              const mod = moduleMap[code]
              const status = mod?.status ?? (i === 0 ? 'active' : 'locked')
              const done = status === 'completed'
              const active = status === 'active'
              return (
                <div key={code} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      done ? 'bg-module-completed border-module-completed text-white' :
                      active ? 'bg-surface border-module-active text-module-active' :
                      'bg-surface border-subtle text-faint'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${active ? 'text-ink' : 'text-faint'}`}>{code}</span>
                  </div>
                  {i < MODULE_ORDER.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-4 ${done ? 'bg-module-completed' : 'bg-subtle'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Lista de módulos */}
        <div className="space-y-2">
          {MODULE_ORDER.map((code, i) => {
            const info = MODULE_INFO[code]
            const mod = moduleMap[code]
            const status = mod?.status ?? (i === 0 ? 'active' : 'locked')
            const isLocked = status === 'locked'
            const isCompleted = status === 'completed'
            const isActive = status === 'active'

            return (
              <div
                key={code}
                className={`card transition-all ${
                  isCompleted ? 'border-emerald-200 bg-emerald-50/40' :
                  isActive    ? 'border-accent/30' :
                  'opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Número / estado */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isCompleted ? 'bg-emerald-100 text-emerald-700' :
                    isActive    ? 'bg-accent-soft text-accent' :
                    'bg-surface-2 text-faint'
                  }`}>
                    {isCompleted ? '✓' : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isLocked ? 'text-faint' : 'text-ink'}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{info.desc}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <span className="badge badge-success">Completado</span>
                    ) : isActive ? (
                      <Link
                        href={`/caso/${id}/modulo/${code}` as any}
                        className="btn-primary text-xs px-4 py-2"
                      >
                        Iniciar →
                      </Link>
                    ) : (
                      <span className="text-xs text-faint">Se desbloquea al terminar</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
