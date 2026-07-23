export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import AppShell from '@/components/shared/AppShell'

const PAIN_COLOR: Record<string, string> = {
  alto: 'bg-rose-50 text-rose-700 border-rose-200',
  medio: 'bg-amber-50 text-amber-700 border-amber-200',
  bajo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}
const URGENCY_COLOR: Record<string, string> = {
  urgente: 'bg-rose-50 text-rose-700 border-rose-200',
  importante: 'bg-amber-50 text-amber-700 border-amber-200',
  deseable: 'bg-blue-50 text-blue-700 border-blue-200',
}

// Vista de solo lectura para el super-admin — a diferencia de BriefDirectorClient
// (lo que ve el directivo del caso, solo el resumen ejecutivo/IER/contexto/planes),
// esta muestra TODO lo que el consultor generó, incluyendo lo interno
// (diagnósticos clave, JTBD comercial, segmentos, prioridades, hipótesis) —
// para soporte, sin depender de que el consultor comparta un PDF a mano.
export default async function AdminCasoBriefPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: caseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) redirect('/login')

  const admin = getSupabaseAdmin()
  if (!admin) redirect('/admin/casos')
  const db = admin as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry')
    .eq('id', caseId)
    .maybeSingle()
  if (!caseData) redirect('/admin/casos')

  const { data: brief } = await db
    .from('brief_documents')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle()

  const { data: caseModules } = await db
    .from('module_templates')
    .select('code, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  const moduleNames: Record<string, string> = {}
  ;(caseModules ?? []).forEach((m: any) => { moduleNames[m.code] = m.name })

  const findings = brief?.module_findings ?? {}
  const jtbd = (brief?.jtbd ?? []).filter((j: any) => j.approved)
  const jtbdComercial = (brief?.jtbd_comercial ?? []).filter((j: any) => j.approved)
  const segments = (brief?.segments ?? []).filter((s: any) => s.approved)
  const priorities = (brief?.priorities ?? []).filter((p: any) => p.approved)
  const hipConfirmadas = (brief?.hypotheses ?? []).filter((h: any) => h.status === 'confirmed')
  const mc = brief?.market_context ?? {}

  const planSections = [
    { key: 'plan_90d', label: 'Plan de Acción — 90 Días' },
    { key: 'plan_6m', label: 'Plan de Consolidación — 6 Meses' },
    { key: 'plan_1a', label: 'Plan Estratégico — 1 Año' },
    { key: 'plan_3a', label: 'Visión Estratégica — 3 Años' },
  ] as const

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <div className="max-w-4xl mx-auto space-y-4 pb-16">
        <div>
          <Link href={`/admin/casos/${caseId}` as any} className="text-xs text-muted hover:text-ink mb-1 inline-block">
            ← {caseData.company_name}
          </Link>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block">
            Modo soporte — vista de solo lectura del Brief de otro consultor
          </p>
        </div>

        <nav className="flex gap-1.5">
          <Link href={`/admin/casos/${caseId}?tab=diagnostico` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">Diagnóstico</Link>
          <Link href={`/admin/casos/${caseId}?tab=participantes` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">Participantes</Link>
          <Link href={`/admin/casos/${caseId}/plan` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">Módulos</Link>
          <Link href={`/admin/casos/${caseId}/puestos` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">Puestos</Link>
          <Link href={`/admin/casos/${caseId}/avance` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">Avance</Link>
          <Link href={`/admin/casos/${caseId}/respaldos` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">Respaldos</Link>
          <Link href={`/admin/casos/${caseId}/brief` as any} className="text-sm px-4 py-2 rounded-xl bg-accent-soft text-accent font-medium transition-colors">Brief</Link>
        </nav>

        {!brief ? (
          <div className="card p-12 text-center space-y-2">
            <p className="text-3xl">📋</p>
            <p className="text-sm font-medium text-ink">El consultor todavía no ha generado el Brief de este caso.</p>
          </div>
        ) : (
          <>
            <div className="card p-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-ink">{brief.title ?? 'Brief de Cierre'}</h1>
                <p className="text-xs text-muted mt-0.5">
                  Estado: <span className="font-medium">{brief.status === 'published' ? 'Publicado al directivo' : 'Borrador'}</span>
                  {brief.updated_at && ` · Última actualización ${new Date(brief.updated_at).toLocaleString('es-MX')}`}
                </p>
              </div>
              {brief.status === 'published' && (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-xs">✓ Publicado</span>
              )}
            </div>

            {brief.executive_summary?.trim() && (
              <section className="card p-4 space-y-2">
                <h2 className="text-sm font-semibold text-ink">Resumen Ejecutivo</h2>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{brief.executive_summary}</p>
              </section>
            )}

            {mc?.macro && (
              <section className="card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-ink">Contexto de Mercado — {mc.sector ?? 'Sector'}</h2>
                {mc.macro && <div><p className="text-xs font-medium text-muted mb-0.5">Entorno macroeconómico</p><p className="text-sm text-ink">{mc.macro}</p></div>}
                {mc.short_term && <div><p className="text-xs font-medium text-muted mb-0.5">Perspectiva 0-12 meses</p><p className="text-sm text-ink">{mc.short_term}</p></div>}
                {mc.mid_term && <div><p className="text-xs font-medium text-muted mb-0.5">Perspectiva 1-3 años</p><p className="text-sm text-ink">{mc.mid_term}</p></div>}
                {mc.long_term && <div><p className="text-xs font-medium text-muted mb-0.5">Perspectiva 3-5 años</p><p className="text-sm text-ink">{mc.long_term}</p></div>}
              </section>
            )}

            {Object.keys(findings).length > 0 && (
              <section className="card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-ink">Hallazgos por Módulo</h2>
                {Object.entries(findings).sort().map(([code, text]) => (
                  <div key={code} className="flex gap-3">
                    <span className="text-xs font-mono bg-accent-soft text-accent px-2 py-1 rounded h-fit flex-shrink-0">{code}</span>
                    <div>
                      <p className="text-xs font-medium text-muted mb-0.5">{moduleNames[code] ?? code}</p>
                      <p className="text-sm text-ink leading-relaxed">{text as string}</p>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {jtbd.length > 0 && (
              <section className="card p-4 space-y-2">
                <h2 className="text-sm font-semibold text-ink">Diagnósticos Clave ({jtbd.length})</h2>
                {jtbd.map((j: any) => (
                  <div key={j.id} className="border-t border-subtle pt-2 first:border-t-0 first:pt-0 space-y-1">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-muted border border-subtle">{j.area}</span>
                      {j.pain_level && <span className={`text-xs px-2 py-0.5 rounded border ${PAIN_COLOR[j.pain_level] ?? ''}`}>Impacto: {j.pain_level}</span>}
                      {j.urgency && <span className={`text-xs px-2 py-0.5 rounded border ${URGENCY_COLOR[j.urgency] ?? ''}`}>{j.urgency}</span>}
                      <span className="text-xs font-mono text-faint">{j.module_origin}</span>
                    </div>
                    <p className="text-sm text-ink">{j.statement}</p>
                  </div>
                ))}
              </section>
            )}

            {jtbdComercial.length > 0 && (
              <section className="card p-4 space-y-2">
                <h2 className="text-sm font-semibold text-ink">JTBD Comercial ({jtbdComercial.length})</h2>
                {jtbdComercial.map((j: any) => (
                  <div key={j.id} className="border-t border-subtle pt-2 first:border-t-0 first:pt-0">
                    <p className="text-sm text-ink">{j.statement}</p>
                  </div>
                ))}
              </section>
            )}

            {segments.length > 0 && (
              <section className="card p-4 space-y-2">
                <h2 className="text-sm font-semibold text-ink">Segmentos ({segments.length})</h2>
                {segments.map((s: any) => (
                  <div key={s.id} className="border-t border-subtle pt-2 first:border-t-0 first:pt-0">
                    <div className="flex gap-1.5 items-center mb-0.5">
                      <span className="badge text-xs">{s.priority}</span>
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                    </div>
                    <p className="text-xs text-muted">{s.description}</p>
                  </div>
                ))}
              </section>
            )}

            {priorities.length > 0 && (
              <section className="card p-4 space-y-2">
                <h2 className="text-sm font-semibold text-ink">Prioridades de Intervención ({priorities.length})</h2>
                {priorities.map((p: any) => (
                  <div key={p.id} className="border-t border-subtle pt-2 first:border-t-0 first:pt-0 space-y-1">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <span className={`text-xs px-2 py-0.5 rounded border ${URGENCY_COLOR[p.urgency] ?? ''}`}>{p.urgency}</span>
                      <span className="badge text-xs">{p.area}</span>
                      {p.impact && <span className="text-xs text-muted">Impacto: {p.impact}</span>}
                      {p.effort && <span className="text-xs text-muted">Esfuerzo: {p.effort}</span>}
                    </div>
                    <p className="text-sm text-ink">{p.statement}</p>
                  </div>
                ))}
              </section>
            )}

            {hipConfirmadas.length > 0 && (
              <section className="card p-4 space-y-2">
                <h2 className="text-sm font-semibold text-ink">Hipótesis Confirmadas ({hipConfirmadas.length})</h2>
                {hipConfirmadas.map((h: any) => (
                  <div key={h.id} className="border-t border-subtle pt-2 first:border-t-0 first:pt-0 space-y-1">
                    <div className="flex gap-1.5 items-center">
                      <span className="badge text-xs">{h.area}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">✓ confirmada</span>
                    </div>
                    <p className="text-sm font-medium text-ink">{h.statement}</p>
                    <p className="text-xs text-muted">{h.final_conclusion ?? h.draft_conclusion}</p>
                  </div>
                ))}
              </section>
            )}

            {planSections.map(({ key, label }) => {
              const items: any[] = brief?.[key] ?? []
              if (items.length === 0) return null
              return (
                <section key={key} className="card p-4 space-y-2">
                  <h2 className="text-sm font-semibold text-ink">{label} ({items.length})</h2>
                  {items.map((item: any, i: number) => (
                    <div key={i} className="border-t border-subtle pt-2 first:border-t-0 first:pt-0 space-y-1">
                      <div className="flex gap-1.5 flex-wrap items-center">
                        {(item.semana || item.trimestre || item.año) && (
                          <span className="text-xs font-mono bg-surface-2 text-muted px-1.5 py-0.5 rounded">{item.semana || item.trimestre || item.año}</span>
                        )}
                        {item.area && <span className="badge text-xs">{item.area}</span>}
                        {item.tipo && <span className={`text-xs px-2 py-0.5 rounded border ${URGENCY_COLOR[item.tipo] ?? ''}`}>{item.tipo}</span>}
                        {item.quick_win && <span className="text-xs text-emerald-700 font-medium">⚡ quick win</span>}
                      </div>
                      <p className="text-sm text-ink">{item.accion || item.iniciativa || item.objetivo || item.vision}</p>
                      {item.kpi && <p className="text-xs text-muted">KPI: {item.kpi}</p>}
                    </div>
                  ))}
                </section>
              )
            })}
          </>
        )}
      </div>
    </AppShell>
  )
}
