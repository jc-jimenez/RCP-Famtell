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
          <h1 className="text-2xl font-bold text-white">{caseData.company_name}</h1>
          {caseData.industry && (
            <p className="text-slate-400 text-sm mt-1">{caseData.industry}</p>
          )}
          {caseUser.job_title && (
            <p className="text-xs text-slate-500 mt-0.5">{caseUser.job_title}</p>
          )}
        </div>

        {/* Progreso general */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-300">Progreso del diagnóstico</p>
            <p className="text-sm font-bold text-white">{completedCount} / 7 módulos</p>
          </div>
          <div className="flex gap-1.5">
            {MODULE_ORDER.map((code) => {
              const mod = moduleMap[code]
              const status = mod?.status ?? 'locked'
              return (
                <div
                  key={code}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    status === 'completed' ? 'bg-module-completed' :
                    status === 'active'    ? 'bg-module-active animate-pulse' :
                    'bg-module-locked'
                  }`}
                  title={`${MODULE_INFO[code].label}: ${status}`}
                />
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
                className={`rounded-2xl border transition-all ${
                  isCompleted ? 'border-emerald-900/50 bg-emerald-950/20' :
                  isActive    ? 'border-blue-800/60 bg-blue-950/20' :
                  'border-slate-800 bg-slate-900/40 opacity-50'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Número / estado */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isCompleted ? 'bg-emerald-800 text-emerald-300' :
                    isActive    ? 'bg-blue-800 text-blue-300' :
                    'bg-slate-800 text-slate-600'
                  }`}>
                    {isCompleted ? '✓' : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isLocked ? 'text-slate-600' : 'text-white'}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{info.desc}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <span className="text-xs text-emerald-500 font-medium">Completado</span>
                    ) : isActive ? (
                      <Link
                        href={`/caso/${id}/modulo/${code}` as any}
                        className="rounded-xl bg-role-directivo hover:opacity-90 transition-opacity px-4 py-2 text-xs font-semibold text-white"
                      >
                        Iniciar →
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-600">Bloqueado</span>
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
