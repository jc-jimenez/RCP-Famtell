export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import { computeAllModulesCompletion } from '@/lib/moduleCompletion'
import type { ModuleCode } from '@/types'

const MODULE_INFO: Record<ModuleCode, { label: string; desc: string }> = {
  M1: { label: 'Radiografía Comercial',   desc: 'Ingresos, clientes y modelo comercial' },
  M2: { label: 'Radiografía Operativa',   desc: 'Procesos, capacidad y cuellos de botella' },
  M3: { label: 'Base de Contactos',       desc: '30 contactos clave para el CRM' },
  M4: { label: 'Radiografía Financiera',  desc: 'Rentabilidad, deuda y flujo de caja' },
  M5: { label: 'Radiografía Competitiva', desc: 'Competidores y posicionamiento de mercado' },
  M6: { label: 'Radiografía Interna',     desc: 'Equipo, cultura y brechas de talento' },
  M7: { label: 'Síntesis y Plan RCP',     desc: 'Diagnóstico completo + Plan 90 días' },
}

const MODULE_ORDER: ModuleCode[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

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
    .select('role, job_title')
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

  // Módulos del caso
  const { data: modules } = await db
    .from('modules')
    .select('module_code, status, completed_at, updated_at')
    .eq('case_id', id)

  const moduleMap: Record<string, { status: string; completed_at: string | null; updated_at: string | null }> = {}
  ;(modules ?? []).forEach((m: any) => {
    moduleMap[m.module_code] = { status: m.status, completed_at: m.completed_at, updated_at: m.updated_at }
  })

  // Última sesión por módulo (para mostrar "Última actividad")
  const { data: sessions } = await db
    .from('sessions')
    .select('module_code, last_message_at')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .order('last_message_at', { ascending: false })

  const lastSessionMap: Record<string, string> = {}
  ;(sessions ?? []).forEach((s: any) => {
    if (!lastSessionMap[s.module_code]) lastSessionMap[s.module_code] = s.last_message_at
  })

  const completedCount = Object.values(moduleMap).filter(m => m.status === 'completed').length
  const shellRole = role === 'consultant' ? 'consultant' : 'director'

  // Próximo módulo activo
  const nextModule = MODULE_ORDER.find(code => {
    const mod = moduleMap[code]
    return !mod || mod.status !== 'completed'
  })

  // Avance real por puesto (rojo/ámbar/verde) — solo se necesita para el módulo activo
  const completionMap: Record<string, { colorStatus: 'red' | 'amber' | 'green'; pending: { jobPositionName: string; hasOccupant: boolean }[] }> = {}
  if (nextModule) {
    const all = await computeAllModulesCompletion(db, id)
    all.forEach(c => { completionMap[c.moduleCode] = c })
  }

  return (
    <AppShell
      role={shellRole}
      email={session.user.email!}
      caseCompanyName={caseData.company_name}
      modulesCompleted={completedCount}
      tabBar={isDirector ? <DirectorTabs caseId={id} /> : undefined}
    >
      <div className="max-w-3xl mx-auto space-y-6">

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
            <p className="text-2xl font-bold text-ink">{completedCount}<span className="text-base font-normal text-muted">/7</span></p>
            <p className="text-xs text-muted">módulos</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            {MODULE_ORDER.map((code, i) => {
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
                  {i < MODULE_ORDER.length - 1 && (
                    <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-400' : 'bg-subtle'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="w-full bg-surface-2 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(completedCount / 7) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {completedCount === 0
              ? 'Comienza con el Módulo 1 para activar tu diagnóstico'
              : completedCount === 7
              ? '¡Diagnóstico completo! Revisa tu Brief en la pestaña Brief M7'
              : `${7 - completedCount} módulos restantes`}
          </p>
        </div>

        {/* Lista de módulos */}
        <div className="space-y-2">
          {MODULE_ORDER.map((code, i) => {
            const info = MODULE_INFO[code]
            const mod = moduleMap[code]
            const status = mod?.status ?? (i === 0 ? 'active' : 'locked')
            const isCompleted = status === 'completed'
            const isCurrent = code === nextModule
            const isLocked = !isCompleted && !isCurrent
            const lastActivity = lastSessionMap[code]
            const hasSession = !!lastActivity
            const completion = isCurrent ? completionMap[code] : undefined
            const colorStatus = completion?.colorStatus

            return (
              <div
                key={code}
                className={`card transition-all ${
                  isCompleted ? 'border-emerald-200 bg-emerald-50/40' :
                  isCurrent && colorStatus === 'amber' ? 'border-amber-300 shadow-sm' :
                  isCurrent   ? 'border-rose-300 shadow-sm' :
                  'opacity-55'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Ícono de estado */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isCompleted ? 'bg-emerald-100 text-emerald-700' :
                    isCurrent && colorStatus === 'amber' ? 'bg-amber-100 text-amber-700' :
                    isCurrent   ? 'bg-rose-100 text-rose-700' :
                    'bg-surface-2 text-faint'
                  }`}>
                    {isCompleted ? '✓' : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isLocked ? 'text-faint' : 'text-ink'}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{info.desc}</p>
                    {isCompleted && mod?.completed_at && (
                      <p className="text-xs text-emerald-600 mt-0.5">Completado {formatDate(mod.completed_at)}</p>
                    )}
                    {!isCompleted && hasSession && (
                      <p className="text-xs text-accent mt-0.5">Última sesión {formatDate(lastActivity)}</p>
                    )}
                    {isCurrent && completion && completion.pending.length > 0 && (
                      <p className={`text-xs mt-0.5 ${colorStatus === 'amber' ? 'text-amber-700' : 'text-rose-700'}`}>
                        Falta: {completion.pending.map(p => p.jobPositionName).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <Link
                        href={`/caso/${id}/modulo/${code}` as any}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Ver sesión
                      </Link>
                    ) : isCurrent ? (
                      <Link
                        href={`/caso/${id}/modulo/${code}` as any}
                        className="btn-primary text-xs px-4 py-2"
                      >
                        {hasSession ? 'Continuar →' : 'Iniciar →'}
                      </Link>
                    ) : (
                      <span className="text-xs text-faint">Bloqueado</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
              <p className="text-xs font-medium text-ink">Brief M7</p>
              <p className="text-xs text-muted mt-0.5">{completedCount === 7 ? 'Ver diagnóstico' : 'Disponible al completar'}</p>
            </Link>
          </div>
        )}

      </div>
    </AppShell>
  )
}
