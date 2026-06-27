'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import CasoTabs from '@/components/consultor/CasoTabs'
import type { UserRole } from '@/types'

interface Props {
  caseId: string
  companyName: string
  role: string
  email: string
}

const SCENARIOS = [
  { id: 'conservador', label: 'Conservador', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  { id: 'moderado',    label: 'Moderado',    color: 'text-accent',    bg: 'bg-accent-soft', border: 'border-accent/30', dot: 'bg-accent' },
  { id: 'agresivo',    label: 'Agresivo',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
]

function fmt(n: number, dec = 0) {
  return n.toLocaleString('es-MX', { maximumFractionDigits: dec })
}
function fmtMXN(n: number) {
  if (n >= 1_000_000) return `$${fmt(n / 1_000_000, 2)}M`
  if (n >= 1_000)     return `$${fmt(n / 1_000, 1)}K`
  return `$${fmt(n)}`
}
function fmtMXNFull(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export default function EscenariosClient({ caseId, companyName, role, email }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'
  const isDirector = role === 'director'

  // ── Base del negocio ──
  const [ingresosMes, setIngresos]       = useState(500000)
  const [costoVariable, setCostoVar]     = useState(55)   // % de ingresos
  const [costoFijo, setCostoFijo]        = useState(120000)
  const [deuda, setDeuda]                = useState(0)
  const [tasaDeuda, setTasaDeuda]        = useState(12)   // % anual

  // ── Levers por escenario ──
  const [levers, setLevers] = useState({
    conservador: { crecimientoMensual: 1.5, mejoraCostoVar: 0,   nuevosClientes: 1,  ticketPromedio: 0 },
    moderado:    { crecimientoMensual: 3.0, mejoraCostoVar: 2,   nuevosClientes: 3,  ticketPromedio: 5 },
    agresivo:    { crecimientoMensual: 5.0, mejoraCostoVar: 4,   nuevosClientes: 6,  ticketPromedio: 10 },
  })

  function updateLever(scenario: string, field: string, value: number) {
    setLevers(prev => ({ ...prev, [scenario]: { ...prev[scenario as keyof typeof prev], [field]: value } }))
  }

  // ── Cálculo de proyecciones ──
  const projections = useMemo(() => {
    return Object.entries(levers).map(([id, lev]) => {
      const months = Array.from({ length: 12 }, (_, i) => {
        const mes = i + 1
        const ing = ingresosMes * Math.pow(1 + lev.crecimientoMensual / 100, mes)
        const cv  = ing * ((costoVariable - lev.mejoraCostoVar) / 100)
        const cf  = costoFijo
        const int = (deuda * (tasaDeuda / 100)) / 12
        const ebitda = ing - cv - cf
        const utilidad = ebitda - int
        return { mes, ing, cv, cf, ebitda, utilidad }
      })
      const anual = {
        ing:      months.reduce((s, m) => s + m.ing, 0),
        ebitda:   months.reduce((s, m) => s + m.ebitda, 0),
        utilidad: months.reduce((s, m) => s + m.utilidad, 0),
      }
      const margenEbitda = (anual.ebitda / anual.ing) * 100
      const breakeven    = costoFijo / (1 - (costoVariable - lev.mejoraCostoVar) / 100)
      return { id, months, anual, margenEbitda, breakeven }
    })
  }, [levers, ingresosMes, costoVariable, costoFijo, deuda, tasaDeuda])

  const [activeScenario, setActive] = useState('moderado')
  const active = projections.find(p => p.id === activeScenario)!
  const sc = SCENARIOS.find(s => s.id === activeScenario)!

  // Escala para mini chart
  const maxIng = Math.max(...active.months.map(m => m.ing))

  const tabBar = isDirector
    ? <DirectorTabs caseId={caseId} />
    : <CasoTabs caseId={caseId} activeTab="escenarios" />

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName} tabBar={tabBar}>
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <h1 className="text-xl font-bold text-ink">Simulador de Escenarios</h1>
          <p className="text-sm text-muted mt-1">Proyecta el crecimiento a 12 meses bajo distintas hipótesis de negocio</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

          {/* ── Inputs ── */}
          <div className="space-y-4">

            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-ink">Base actual del negocio</h2>

              <div>
                <label className="text-xs text-muted block mb-1">Ingresos mensuales actuales</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">$</span>
                  <input type="number" min={10000} max={50000000} step={10000}
                    value={ingresosMes}
                    onChange={e => setIngresos(Number(e.target.value))}
                    className="input-field flex-1 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Costo variable (% de ingresos)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={10} max={90} step={1}
                    value={costoVariable}
                    onChange={e => setCostoVar(Number(e.target.value))}
                    className="flex-1" />
                  <span className="text-sm font-semibold text-ink w-10">{costoVariable}%</span>
                </div>
                <p className="text-xs text-faint">Margen bruto actual: {100 - costoVariable}%</p>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Costo fijo mensual</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">$</span>
                  <input type="number" min={0} max={10000000} step={5000}
                    value={costoFijo}
                    onChange={e => setCostoFijo(Number(e.target.value))}
                    className="input-field flex-1 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Deuda total (capital)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">$</span>
                  <input type="number" min={0} max={100000000} step={50000}
                    value={deuda}
                    onChange={e => setDeuda(Number(e.target.value))}
                    className="input-field flex-1 text-sm" />
                </div>
              </div>

              {deuda > 0 && (
                <div>
                  <label className="text-xs text-muted block mb-1">Tasa anual de deuda (%)</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={5} max={60} step={1}
                      value={tasaDeuda}
                      onChange={e => setTasaDeuda(Number(e.target.value))}
                      className="flex-1" />
                    <span className="text-sm font-semibold text-ink w-10">{tasaDeuda}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Levers por escenario */}
            {SCENARIOS.map(sc => {
              const lev = levers[sc.id as keyof typeof levers]
              return (
                <div key={sc.id} className={`card p-4 space-y-3 border ${sc.border}`}>
                  <h3 className={`text-sm font-semibold ${sc.color}`}>{sc.label}</h3>

                  <div>
                    <label className="text-xs text-muted block mb-1">Crecimiento mensual en ingresos</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={30} step={0.5}
                        value={lev.crecimientoMensual}
                        onChange={e => updateLever(sc.id, 'crecimientoMensual', Number(e.target.value))}
                        className="input-field w-20 text-sm" />
                      <span className="text-xs text-muted">% / mes</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted block mb-1">Mejora en costo variable</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={20} step={0.5}
                        value={lev.mejoraCostoVar}
                        onChange={e => updateLever(sc.id, 'mejoraCostoVar', Number(e.target.value))}
                        className="input-field w-20 text-sm" />
                      <span className="text-xs text-muted">pp de mejora</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Resultados ── */}
          <div className="space-y-4">

            {/* Selector de escenario */}
            <div className="flex gap-2">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    activeScenario === s.id
                      ? `${s.bg} ${s.border} ${s.color}`
                      : 'border-subtle text-muted hover:bg-surface-2'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* KPIs del escenario activo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4">
                <p className="text-xs text-muted mb-1">Ingresos año 1</p>
                <p className={`text-xl font-bold ${sc.color}`}>{fmtMXN(active.anual.ing)}</p>
                <p className="text-xs text-faint mt-1">vs {fmtMXN(ingresosMes * 12)} actual</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted mb-1">EBITDA año 1</p>
                <p className={`text-xl font-bold ${active.anual.ebitda >= 0 ? sc.color : 'text-rose-600'}`}>
                  {fmtMXN(active.anual.ebitda)}
                </p>
                <p className="text-xs text-faint mt-1">Margen {fmt(active.margenEbitda, 1)}%</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted mb-1">Punto de equilibrio</p>
                <p className="text-xl font-bold text-ink">{fmtMXN(active.breakeven)}</p>
                <p className="text-xs text-faint mt-1">por mes</p>
              </div>
            </div>

            {/* Mini chart de barras — ingresos mes a mes */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Ingresos proyectados — 12 meses</h2>
              <div className="flex items-end gap-1.5 h-32">
                {active.months.map(m => {
                  const pct = (m.ing / maxIng) * 100
                  const ebitdaPos = m.ebitda >= 0
                  return (
                    <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative" style={{ height: '96px' }}>
                        <div
                          className={`absolute bottom-0 w-full rounded-t-sm transition-all ${ebitdaPos ? sc.dot : 'bg-rose-300'}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-faint">{m.mes}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-faint">
                <span>Mes 1: {fmtMXN(active.months[0].ing)}</span>
                <span>Mes 12: {fmtMXN(active.months[11].ing)}</span>
              </div>
            </div>

            {/* Tabla detalle trimestral */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-3">Detalle trimestral</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle">
                      <th className="text-left text-xs text-muted pb-2 font-medium">Trimestre</th>
                      <th className="text-right text-xs text-muted pb-2 font-medium">Ingresos</th>
                      <th className="text-right text-xs text-muted pb-2 font-medium">Costo var.</th>
                      <th className="text-right text-xs text-muted pb-2 font-medium">EBITDA</th>
                      <th className="text-right text-xs text-muted pb-2 font-medium">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {[0, 3, 6, 9].map((start, qi) => {
                      const q = active.months.slice(start, start + 3)
                      const ing     = q.reduce((s, m) => s + m.ing, 0)
                      const cv      = q.reduce((s, m) => s + m.cv, 0)
                      const ebitda  = q.reduce((s, m) => s + m.ebitda, 0)
                      const margen  = (ebitda / ing) * 100
                      return (
                        <tr key={qi}>
                          <td className="py-2 text-ink">Q{qi + 1}</td>
                          <td className="py-2 text-right text-ink">{fmtMXNFull(ing)}</td>
                          <td className="py-2 text-right text-muted">{fmtMXNFull(cv)}</td>
                          <td className={`py-2 text-right font-medium ${ebitda >= 0 ? sc.color : 'text-rose-600'}`}>
                            {fmtMXNFull(ebitda)}
                          </td>
                          <td className={`py-2 text-right text-xs ${ebitda >= 0 ? 'text-muted' : 'text-rose-500'}`}>
                            {fmt(margen, 1)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-subtle font-semibold">
                      <td className="pt-2 text-ink">Total año</td>
                      <td className="pt-2 text-right text-ink">{fmtMXNFull(active.anual.ing)}</td>
                      <td className="pt-2 text-right text-muted">{fmtMXNFull(active.months.reduce((s,m)=>s+m.cv,0))}</td>
                      <td className={`pt-2 text-right ${active.anual.ebitda >= 0 ? sc.color : 'text-rose-600'}`}>
                        {fmtMXNFull(active.anual.ebitda)}
                      </td>
                      <td className={`pt-2 text-right text-xs ${active.anual.ebitda >= 0 ? 'text-muted' : 'text-rose-500'}`}>
                        {fmt(active.margenEbitda, 1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Comparación de escenarios */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-3">Comparación de escenarios — ingresos año 1</h2>
              <div className="space-y-3">
                {projections.map((p, i) => {
                  const s = SCENARIOS[i]
                  const maxVal = Math.max(...projections.map(x => x.anual.ing))
                  const pct = (p.anual.ing / maxVal) * 100
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className={`text-xs font-medium w-24 flex-shrink-0 ${s.color}`}>{s.label}</span>
                      <div className="flex-1 bg-surface-2 rounded-full h-2.5">
                        <div className={`${s.dot} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-ink w-24 text-right">{fmtMXN(p.anual.ing)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-subtle">
                <p className="text-xs text-muted">
                  Rango de resultado: <span className="font-semibold text-ink">{fmtMXN(projections[0].anual.ing)}</span> — <span className="font-semibold text-emerald-700">{fmtMXN(projections[2].anual.ing)}</span>
                  <span className="ml-2 text-faint">({fmt((projections[2].anual.ing / projections[0].anual.ing - 1) * 100, 0)}% de diferencia entre extremos)</span>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  )
}
