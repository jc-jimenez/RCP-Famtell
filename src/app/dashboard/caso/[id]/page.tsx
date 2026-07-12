export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import AgendaPanel from '@/components/consultor/AgendaPanel'
import ParticipantesPanel from '@/components/consultor/ParticipantesPanel'
import CasoTabs from '@/components/consultor/CasoTabs'
import SharePortalPanel from '@/components/consultor/SharePortalPanel'
import { computeAllModulesCompletion, getModulesForPosition } from '@/lib/moduleCompletion'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import { getDominantIntent } from '@/lib/anthropic/agenda-detector'
import ModuleJourneyCard, { JOURNEY_ACCENTS } from '@/components/shared/ModuleJourneyCard'
import ModuleRadarChart from '@/components/shared/ModuleRadarChart'
import ProgressTrendChart from '@/components/shared/ProgressTrendChart'
import CustomerJourneyMap from '@/components/shared/CustomerJourneyMap'
import { computeCustomerJourney } from '@/lib/customerJourney'

const JOURNEY_CONTINUE_HREF: Record<string, (caseId: string) => string> = {
  preparacion: (id) => `/dashboard/caso/${id}/puestos`,
  captura: (id) => `/dashboard/caso/${id}?tab=participantes`,
  analisis: (id) => `/caso/${id}/brief`,
  diagnostico: (id) => `/caso/${id}/brief`,
  prioridades: (id) => `/caso/${id}/brief`,
  plan: (id) => `/caso/${id}/brief`,
  implementacion: (id) => `/caso/${id}/checkin`,
}

const INTENT_LABEL: Record<string, string> = {
  growth: '🔵 Crecimiento',
  restructure: '🟡 Redimensionamiento',
  exit: '🔴 Salida / Asociación',
  mixed: '⬜ Sin definir aún',
}

const MODULE_EMOJI: Record<string, string> = {
  M1: '💼', M2: '⚙️', M3: '🤝', M4: '💰', M5: '🎯', M6: '🧑‍🤝‍🧑', M7: '📋',
}

function kpiTrafficLight(actual: number, target: number): 'green' | 'yellow' | 'red' | 'gray' {
  if (target === 0) return 'gray'
  const pct = actual / target
  if (pct >= 0.9) return 'green'
  if (pct >= 0.6) return 'yellow'
  return 'red'
}

const KPI_TL_TEXT: Record<string, string> = { green: 'text-emerald-600', yellow: 'text-amber-600', red: 'text-red-600', gray: 'text-faint' }

export default async function CasoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab = 'diagnostico' } = await searchParams

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

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

  const catalogScope = await resolveCatalogScope(db, id)
  const templatesQuery = db.from('module_templates').select('code, name').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, id).order('sort_order', { ascending: true })
  const moduleOrder: string[] = (templates ?? []).map((t: any) => t.code)
  const moduleLabels: Record<string, string> = {}
  ;(templates ?? []).forEach((t: any) => { moduleLabels[t.code] = t.name })

  const { data: modules } = await db
    .from('modules')
    .select('module_code, status, completed_at, credits_used, backup_pdf_path')
    .eq('case_id', id)

  const moduleMap: Record<string, any> = {}
  ;(modules ?? []).forEach((m: any) => { moduleMap[m.module_code] = m })
  const completedCount = Object.values(moduleMap).filter((m: any) => m.status === 'completed').length

  const completionList = tab === 'diagnostico' ? await computeAllModulesCompletion(db, id) : []
  const completionMap: Record<string, { colorStatus: 'red' | 'amber' | 'green'; requiredTotal: number; completedTotal: number; pending: { jobPositionName: string; hasOccupant: boolean }[] }> = {}
  completionList.forEach(c => { completionMap[c.moduleCode] = c })

  const { data: participants } = await db
    .from('case_users')
    .select('id, role, job_title, job_position_id, business_role_id, invitation_email, full_name, permissions_json, activated_at')
    .eq('case_id', id)

  const { data: rawPositions } = await db
    .from('case_job_positions')
    .select('id, name, job_description, business_role_id')
    .eq('case_id', id)
    .order('created_at', { ascending: true })

  const positions = await Promise.all(
    (rawPositions ?? []).map(async (p: any) => ({ ...p, moduleCodes: await getModulesForPosition(db, id, p.id) }))
  )

  const { data: businessRoles } = await db
    .from('business_roles')
    .select('id, name')
    .order('sort_order', { ascending: true })

  const { data: signals } = await db
    .from('agenda_signals')
    .select('signal_type, signal_text, module_code, detected_at')
    .eq('case_id', id)
    .order('detected_at', { ascending: true })

  // Radiografía del caso — solo se consulta en el tab diagnostico, con datos
  // que ya existen y tienen queries funcionando en otras páginas (kpis,
  // checkin, brief): se consolidan aquí en una sola vista.
  let kpiDefinitions: any[] = []
  let latestKpiRecord: any = null
  let checkinHistory: { week_number: number; progress_score: number; submitted_at: string | null }[] = []
  let briefStatus: string | null = null
  let journey = null as Awaited<ReturnType<typeof computeCustomerJourney>> | null

  if (tab === 'diagnostico') {
    const [{ data: defs }, { data: kpiRecords }, { data: checkins }, { data: brief }, journeyResult] = await Promise.all([
      db.from('case_kpi_definitions').select('id, metric_key, label, target, unit').eq('case_id', id).order('sort_order', { ascending: true }),
      db.from('kpi_records').select('week, values, recorded_at').eq('case_id', id).order('week', { ascending: false }).limit(1),
      db.from('check_ins').select('week_number, progress_score, submitted_at').eq('case_id', id).order('week_number', { ascending: true }),
      db.from('brief_documents').select('status').eq('case_id', id).maybeSingle(),
      computeCustomerJourney(id),
    ])
    kpiDefinitions = defs ?? []
    latestKpiRecord = kpiRecords?.[0] ?? null
    checkinHistory = checkins ?? []
    briefStatus = brief?.status ?? null
    journey = journeyResult
  }

  const latestCheckin = checkinHistory[checkinHistory.length - 1] ?? null
  const checkinTrendData = checkinHistory.map(c => ({ week: c.week_number, value: c.progress_score }))
  const radarData = moduleOrder.map(code => ({
    axis: code,
    value: moduleMap[code]?.status === 'completed'
      ? 100
      : Math.round(((completionMap[code]?.completedTotal ?? 0) / Math.max(1, completionMap[code]?.requiredTotal ?? 1)) * 100),
  }))

  const dominantIntent = getDominantIntent(signals ?? [])
  const riskSignals = (signals ?? []).filter((s: any) => s.signal_type === 'red').slice(-5).reverse()
  const signalCounts = { blue: 0, yellow: 0, red: 0 }
  ;(signals ?? []).forEach((s: any) => { signalCounts[s.signal_type as 'blue' | 'yellow' | 'red']++ })

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-xs text-muted hover:text-ink mb-1 inline-block">
              ← Mis casos
            </Link>
            <h1 className="text-xl font-bold text-ink">{caseData.company_name}</h1>
            {caseData.industry && <p className="text-muted text-sm">{caseData.industry}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-faint">Avance</p>
            <p className="text-2xl font-bold text-ink">{completedCount}<span className="text-faint text-lg">/{moduleOrder.length}</span></p>
          </div>
        </div>

        {/* Tabs de navegación */}
        <CasoTabs caseId={id} activeTab={tab} />

        {/* Contenido del tab activo */}
        {tab === 'diagnostico' && journey && (
          <CustomerJourneyMap
            journey={journey}
            continueHref={(JOURNEY_CONTINUE_HREF[journey.stages[journey.currentStageIndex]?.id] ?? (() => `/caso/${id}/brief`))(id)}
            showFindings
          />
        )}

        {tab === 'diagnostico' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">

              {/* Módulos de diagnóstico */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-ink">Módulos de diagnóstico</h2>
                  <span className="text-xs text-faint">{completedCount}/{moduleOrder.length} completados</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {moduleOrder.map((code, i) => {
                    const m = moduleMap[code]
                    const status = m?.status ?? 'locked'
                    const isCompleted = status === 'completed'
                    const isLocked = status === 'locked'
                    const completion = completionMap[code]
                    const percent = isCompleted
                      ? 100
                      : Math.round(((completion?.completedTotal ?? 0) / Math.max(1, completion?.requiredTotal ?? 1)) * 100)
                    const hasBackup = isCompleted && !!m.backup_pdf_path
                    return (
                      <ModuleJourneyCard
                        key={code}
                        index={i + 1}
                        label={moduleLabels[code]}
                        emoji={MODULE_EMOJI[code] ?? '📄'}
                        percent={percent}
                        isCompleted={isCompleted}
                        isLocked={isLocked}
                        subtext={isLocked ? undefined : `${completion?.completedTotal ?? 0}/${completion?.requiredTotal ?? 0} puestos`}
                        href={hasBackup ? `/api/modules/backup?caseId=${id}&moduleCode=${code}` : undefined}
                        ctaLabel={hasBackup ? '📄 Ver PDF' : undefined}
                        accent={JOURNEY_ACCENTS[i % JOURNEY_ACCENTS.length]}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Radar + Tendencia */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-ink mb-2">Radar empresarial</h2>
                  <ModuleRadarChart data={radarData} />
                </div>
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-ink mb-2">Tendencia de avance semanal</h2>
                  {checkinTrendData.length === 0 ? (
                    <p className="text-xs text-faint py-16 text-center">Sin check-ins registrados todavía</p>
                  ) : (
                    <ProgressTrendChart data={checkinTrendData} />
                  )}
                </div>
              </div>
            </div>

            {/* Panel derecho */}
            <div className="space-y-4">

              {/* Índice de Intención Estratégica */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-ink mb-2">Índice de Intención Estratégica</h2>
                <p className="text-lg font-bold text-ink mb-1">{INTENT_LABEL[dominantIntent]}</p>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>🔵 {signalCounts.blue}</span>
                  <span>🟡 {signalCounts.yellow}</span>
                  <span>🔴 {signalCounts.red}</span>
                </div>
                <Link href={`/caso/${id}/indice` as any} className="text-xs text-accent hover:underline mt-3 inline-block">
                  Ver detalle →
                </Link>
              </div>

              {/* Riesgos detectados */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-ink">Riesgos detectados</h2>
                  <span className="badge badge-danger">{signalCounts.red} activos</span>
                </div>
                {riskSignals.length === 0 ? (
                  <p className="text-xs text-faint">Sin riesgos detectados por ahora</p>
                ) : (
                  <ul className="space-y-1.5">
                    {riskSignals.map((s: any, i: number) => (
                      <li key={i} className="text-xs text-ink/80 line-clamp-1">
                        <span className="text-faint">{s.module_code} ·</span> {s.signal_text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* KPIs */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-ink">KPIs</h2>
                  <Link href={`/caso/${id}/kpis` as any} className="text-xs text-accent hover:underline">Ver todos →</Link>
                </div>
                {kpiDefinitions.length === 0 ? (
                  <p className="text-xs text-faint">Sin KPIs definidos todavía</p>
                ) : (
                  <div className="space-y-1.5">
                    {kpiDefinitions.map((d: any) => {
                      const actual = latestKpiRecord?.values?.[d.metric_key] ?? 0
                      const tl = kpiTrafficLight(actual, d.target)
                      return (
                        <div key={d.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted">{d.label}</span>
                          <span className={`font-semibold ${KPI_TL_TEXT[tl]}`}>{actual}{d.unit === '%' ? '%' : ''} / {d.target}{d.unit === '%' ? '%' : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Check-in + Brief */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-ink mb-2">Check-in y Brief</h2>
                {latestCheckin ? (
                  <p className="text-xs text-muted mb-2">
                    Semana {latestCheckin.week_number} · avance {latestCheckin.progress_score}/10
                    {latestCheckin.submitted_at && ` · ${new Date(latestCheckin.submitted_at).toLocaleDateString('es-MX')}`}
                  </p>
                ) : (
                  <p className="text-xs text-faint mb-2">Sin check-ins registrados todavía</p>
                )}
                <p className="text-xs mb-2">
                  Brief: {briefStatus === 'published' ? <span className="text-emerald-600 font-medium">Publicado</span> : briefStatus === 'draft' ? <span className="text-amber-600 font-medium">Borrador</span> : <span className="text-faint">Sin generar</span>}
                </p>
                <div className="flex gap-3">
                  <Link href={`/caso/${id}/checkin` as any} className="text-xs text-accent hover:underline">Ver check-ins →</Link>
                  <Link href={`/caso/${id}/brief` as any} className="text-xs text-accent hover:underline">Ver brief →</Link>
                </div>
              </div>

            </div>
          </div>
        )}

        {tab === 'participantes' && (
          <ParticipantesPanel caseId={id} initialParticipants={participants ?? []} initialPositions={positions} businessRoles={businessRoles ?? []} />
        )}

        {tab === 'agenda' && (
          <AgendaPanel signals={signals ?? []} />
        )}

        {tab === 'portal' && (
          <div className="card p-5">
            <SharePortalPanel caseId={id} />
          </div>
        )}

        {/* Tabs que redirigen a sus páginas propias */}
        {(tab === 'crm' || tab === 'propuestas' || tab === 'tarifas' || tab === 'kpis' || tab === 'checkin' || tab === 'brief') && (
          <TabRedirect caseId={id} tab={tab} />
        )}

      </div>
    </AppShell>
  )
}

function TabRedirect({ caseId, tab }: { caseId: string; tab: string }) {
  const MAP: Record<string, string> = {
    crm:       `/caso/${caseId}/crm`,
    propuestas:`/caso/${caseId}/propuestas`,
    tarifas:   `/caso/${caseId}/tarifas`,
    kpis:      `/caso/${caseId}/kpis`,
    checkin:   `/caso/${caseId}/checkin`,
    brief:     `/caso/${caseId}/brief`,
  }
  const href = MAP[tab]
  if (!href) return null

  return (
    <div className="card p-10 flex flex-col items-center justify-center gap-4 text-center">
      <p className="text-muted text-sm">Abriendo herramienta…</p>
      <Link href={href as any} className="btn-primary">
        Ir a {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </Link>
      <script dangerouslySetInnerHTML={{ __html: `window.location.href = '${href}'` }} />
    </div>
  )
}
