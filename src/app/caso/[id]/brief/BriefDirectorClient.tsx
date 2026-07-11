'use client'

import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import type { UserRole } from '@/types'

interface Props {
  caseId: string
  companyName: string
  email: string
  brief: any
  role: string
  moduleNames?: Record<string, string>
}

// Catálogo global de siempre — se usa como respaldo si moduleNames no trae
// el código (no debería pasar, pero evita una etiqueta vacía).
const FALLBACK_MODULE_NAMES: Record<string, string> = {
  M1: 'Radiografía Comercial', M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',     M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva', M6: 'Radiografía Interna', M7: 'Síntesis y Plan RCP',
}

const IER_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  growth:      { label: 'Crecimiento',         emoji: '🔵', color: 'text-blue-700' },
  restructure: { label: 'Redimensionamiento',   emoji: '🟡', color: 'text-amber-700' },
  exit:        { label: 'Salida / Fusión',       emoji: '🔴', color: 'text-rose-700' },
  mixed:       { label: 'Intención mixta',       emoji: '⚪', color: 'text-muted' },
}

export default function BriefDirectorClient({ caseId, companyName, email, brief, role, moduleNames = {} }: Props) {
  const shellRole: UserRole = 'director'
  const publishedDate = brief?.published_at
    ? new Date(brief.published_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  if (!brief) {
    return (
      <AppShell role={shellRole} email={email} caseCompanyName={companyName} tabBar={<DirectorTabs caseId={caseId} />}>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="card p-12 text-center space-y-3">
            <p className="text-3xl">📋</p>
            <p className="text-base font-semibold text-ink">Brief en preparación</p>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Tu consultor está preparando el Brief de Cierre. Lo verás aquí cuando esté listo.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  const ier = IER_CONFIG[brief.ier_snapshot?.dominant ?? 'mixed']
  const mc = brief.market_context ?? {}
  const findings = brief.module_findings ?? {}

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName} tabBar={<DirectorTabs caseId={caseId} />}>
      <div className="max-w-3xl mx-auto space-y-8 pb-16">

        {/* ── Portada ── */}
        <div className="card p-8 text-center space-y-2 border-accent/20 bg-accent-soft">
          <p className="text-xs text-accent uppercase tracking-widest font-medium">Diagnóstico Empresarial RCP</p>
          <h1 className="text-2xl font-bold text-ink">{brief.title ?? 'Brief de Cierre'}</h1>
          <p className="text-lg font-semibold text-muted">{companyName}</p>
          {publishedDate && <p className="text-xs text-faint mt-2">{publishedDate}</p>}
        </div>

        {/* ── Resumen ejecutivo ── */}
        {brief.executive_summary && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-ink border-b border-subtle pb-2">Resumen Ejecutivo</h2>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{brief.executive_summary}</p>
          </section>
        )}

        {/* ── Índice IER ── */}
        {brief.ier_snapshot && brief.ier_snapshot.dominant && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-ink border-b border-subtle pb-2">Índice de Intención Estratégica</h2>
            <div className="card p-5 flex items-center gap-4">
              <span className="text-4xl">{ier.emoji}</span>
              <div>
                <p className={`text-lg font-bold ${ier.color}`}>{ier.label}</p>
                <p className="text-xs text-muted mt-0.5">
                  {brief.ier_snapshot.blue ?? 0} señales de crecimiento ·
                  {brief.ier_snapshot.yellow ?? 0} redimensionamiento ·
                  {brief.ier_snapshot.red ?? 0} salida
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Contexto de mercado ── */}
        {mc.macro && (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-ink border-b border-subtle pb-2">
              Contexto de Mercado — {mc.sector ?? 'Sector'}
            </h2>
            {mc.macro && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Entorno macroeconómico</h3>
                <p className="text-sm text-ink leading-relaxed">{mc.macro}</p>
              </div>
            )}
            {mc.short_term && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Perspectiva 0-12 meses</h3>
                <p className="text-sm text-ink leading-relaxed">{mc.short_term}</p>
              </div>
            )}
            {mc.mid_term && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Perspectiva 1-3 años</h3>
                <p className="text-sm text-ink leading-relaxed">{mc.mid_term}</p>
              </div>
            )}
            {mc.long_term && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Perspectiva 3-5 años</h3>
                <p className="text-sm text-ink leading-relaxed">{mc.long_term}</p>
              </div>
            )}
            {(mc.opportunities?.length > 0 || mc.risks?.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {mc.opportunities?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-700 mb-2">▲ Oportunidades</h3>
                    <ul className="space-y-1">
                      {mc.opportunities.map((op: string, i: number) => (
                        <li key={i} className="text-xs text-ink flex gap-2"><span className="text-emerald-500">•</span>{op}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {mc.risks?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-rose-700 mb-2">▼ Riesgos</h3>
                    <ul className="space-y-1">
                      {mc.risks.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-ink flex gap-2"><span className="text-rose-500">•</span>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Hallazgos M1-M7 ── */}
        {Object.keys(findings).length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-ink border-b border-subtle pb-2">Hallazgos del Diagnóstico</h2>
            <div className="space-y-3">
              {Object.entries(findings).sort().map(([mod, text]) => (
                <div key={mod} className="flex gap-4">
                  <span className="text-xs font-mono bg-accent-soft text-accent px-2 py-1 rounded h-fit flex-shrink-0">{mod}</span>
                  <div>
                    <p className="text-xs font-medium text-muted mb-0.5">{moduleNames[mod] ?? FALLBACK_MODULE_NAMES[mod] ?? mod}</p>
                    <p className="text-sm text-ink leading-relaxed">{text as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Planes ── */}
        {[
          { key: 'plan_90d', label: 'Plan de Acción — 90 Días' },
          { key: 'plan_6m',  label: 'Plan de Consolidación — 6 Meses' },
          { key: 'plan_1a',  label: 'Plan Estratégico — 1 Año' },
          { key: 'plan_3a',  label: 'Visión Estratégica — 3 Años' },
        ].map(({ key, label }) => {
          const items: any[] = brief?.[key] ?? []
          if (items.length === 0) return null
          return (
            <section key={key} className="space-y-3">
              <h2 className="text-base font-bold text-ink border-b border-subtle pb-2">{label}</h2>
              <div className="space-y-2">
                {items.map((item: any, i: number) => (
                  <div key={i} className="card p-4 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(item.semana || item.trimestre || item.año) && (
                        <span className="text-xs font-mono bg-surface-2 text-muted px-2 py-0.5 rounded">
                          {item.semana || item.trimestre || item.año}
                        </span>
                      )}
                      {item.area && <span className="badge text-xs">{item.area}</span>}
                      {item.prioridad === 'alta' && <span className="text-xs text-rose-600 font-medium">● Alta prioridad</span>}
                    </div>
                    <p className="text-sm font-medium text-ink">
                      {item.accion || item.iniciativa || item.objetivo || item.vision}
                    </p>
                    {item.kpi && <p className="text-xs text-muted">KPI: {item.kpi}</p>}
                    {item.resultado_esperado && <p className="text-xs text-muted">Resultado esperado: {item.resultado_esperado}</p>}
                    {item.meta_numerica && <p className="text-xs text-muted">Meta: {item.meta_numerica}</p>}
                    {item.hito_clave && <p className="text-xs text-accent">Hito: {item.hito_clave}</p>}
                    {item.hito_transformador && <p className="text-xs text-accent">Hito transformador: {item.hito_transformador}</p>}
                    {item.objetivos && (
                      <ul className="text-xs text-muted space-y-0.5">
                        {item.objetivos.map((o: string, j: number) => <li key={j}>• {o}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {/* Footer */}
        <div className="text-center text-xs text-faint pt-4 border-t border-subtle">
          Generado con www.bizdoctor.site · {companyName} · {publishedDate}
        </div>
      </div>
    </AppShell>
  )
}
