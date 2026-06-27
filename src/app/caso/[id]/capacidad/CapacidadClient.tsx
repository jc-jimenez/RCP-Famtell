'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import type { UserRole } from '@/types'

interface Props {
  caseId: string
  companyName: string
  role: 'director' | 'collaborator' | 'consultant'
  email: string
}

const RACK_TYPES = [
  { id: 'selectivo',  label: 'Rack Selectivo',   posXm2: 0.8,  kgXpos: 1200, desc: 'Acceso a cada pallet individualmente' },
  { id: 'drive_in',   label: 'Drive-In / Push',   posXm2: 1.4,  kgXpos: 1000, desc: 'Alta densidad, acceso LIFO' },
  { id: 'piso',       label: 'Almacén en Piso',   posXm2: 0.5,  kgXpos: 2000, desc: 'Sin rack, apilado directo' },
  { id: 'mezanine',   label: 'Entrepisos / Mez.',  posXm2: 1.1,  kgXpos: 800,  desc: 'Doble nivel con mezanine' },
]

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('es-MX', { maximumFractionDigits: decimals })
}

function fmtMXN(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export default function CapacidadClient({ caseId, companyName, role, email }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'

  // Inputs del almacén
  const [m2Total, setM2Total]         = useState(1000)
  const [pctAprovechable, setPct]     = useState(65)
  const [rackTypeId, setRackTypeId]   = useState('selectivo')
  const [niveles, setNiveles]         = useState(3)
  const [ocupacion, setOcupacion]     = useState(70)
  const [rotacion, setRotacion]       = useState(30)
  const [tarifaDia, setTarifaDia]     = useState(12)   // MXN por posición/día
  const [tarifaAlmacenaje, setTarifa] = useState(0.80) // MXN por kg/mes (alternativa)
  const [modoTarifa, setModo]         = useState<'posicion' | 'kg'>('posicion')

  const rack = RACK_TYPES.find(r => r.id === rackTypeId)!

  const calc = useMemo(() => {
    const m2Util       = m2Total * (pctAprovechable / 100)
    const posXnivel    = m2Util * rack.posXm2
    const posTotal     = Math.floor(posXnivel * niveles)
    const posOcupadas  = Math.floor(posTotal * (ocupacion / 100))
    const kgTotal      = posTotal * rack.kgXpos
    const kgOcupados   = posOcupadas * rack.kgXpos
    const toneladas    = kgTotal / 1000
    const toneladasOcup = kgOcupados / 1000

    // Ingresos
    const ingDiarioPot  = modoTarifa === 'posicion'
      ? posTotal * tarifaDia
      : (kgTotal / 1000) * tarifaAlmacenaje * 1000 / 30

    const ingDiarioReal = modoTarifa === 'posicion'
      ? posOcupadas * tarifaDia
      : (kgOcupados / 1000) * tarifaAlmacenaje * 1000 / 30

    const ingMensualPot  = ingDiarioPot * 30
    const ingMensualReal = ingDiarioReal * 30
    const ingAnualPot    = ingMensualPot * 12
    const ingAnualReal   = ingMensualReal * 12

    // Rotación: cuántas veces rota al mes
    const rotacionesMes = Math.round(30 / rotacion * 10) / 10

    // Brecha de ingresos (por ocupación)
    const brechaOcupacion = ingMensualPot - ingMensualReal

    return {
      m2Util, posTotal, posOcupadas, kgTotal, kgOcupados,
      toneladas, toneladasOcup,
      ingDiarioPot, ingDiarioReal,
      ingMensualPot, ingMensualReal,
      ingAnualPot, ingAnualReal,
      rotacionesMes, brechaOcupacion,
    }
  }, [m2Total, pctAprovechable, rack, niveles, ocupacion, rotacion, tarifaDia, tarifaAlmacenaje, modoTarifa])

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName}>
      <div className="max-w-4xl mx-auto space-y-6">

        {role === 'director' && <DirectorTabs caseId={caseId} />}

        {role === 'consultant' && (
          <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink inline-block mb-1">
            ← {companyName}
          </Link>
        )}

        <div>
          <h1 className="text-xl font-bold text-ink">Tracker de Capacidad</h1>
          <p className="text-sm text-muted mt-1">Calcula el potencial real de tu almacén: m² → posiciones → toneladas → ingresos</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">

          {/* ── Panel de inputs ── */}
          <div className="space-y-5">

            {/* Superficie */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-ink">Superficie del almacén</h2>

              <div>
                <label className="text-xs text-muted block mb-1">m² totales del almacén</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={100} max={50000} step={50}
                    value={m2Total}
                    onChange={e => setM2Total(Number(e.target.value))}
                    className="input-field w-28 text-sm"
                  />
                  <span className="text-xs text-muted">m²</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">% área aprovechable <span className="text-faint">(descuenta pasillos, columnas, oficinas)</span></label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={40} max={85} step={1}
                    value={pctAprovechable}
                    onChange={e => setPct(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-ink w-10">{pctAprovechable}%</span>
                </div>
                <p className="text-xs text-faint mt-1">{fmt(calc.m2Util)} m² útiles</p>
              </div>
            </div>

            {/* Tipo de almacenamiento */}
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-ink">Tipo de almacenamiento</h2>
              <div className="space-y-2">
                {RACK_TYPES.map(r => (
                  <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    rackTypeId === r.id ? 'border-accent bg-accent-soft' : 'border-subtle hover:bg-surface-2'
                  }`}>
                    <input
                      type="radio" name="rack" value={r.id}
                      checked={rackTypeId === r.id}
                      onChange={() => setRackTypeId(r.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-ink">{r.label}</p>
                      <p className="text-xs text-muted">{r.desc}</p>
                      <p className="text-xs text-faint mt-0.5">{r.posXm2} pos/m² · {fmt(r.kgXpos)} kg/pos</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Configuración operativa */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-ink">Configuración operativa</h2>

              <div>
                <label className="text-xs text-muted block mb-1">Niveles de rack</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setNiveles(n)}
                      className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                        niveles === n ? 'border-accent bg-accent text-white' : 'border-subtle text-muted hover:bg-surface-2'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Ocupación actual</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} step={5}
                    value={ocupacion}
                    onChange={e => setOcupacion(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-ink w-10">{ocupacion}%</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Rotación promedio (días en almacén)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} max={365} step={1}
                    value={rotacion}
                    onChange={e => setRotacion(Number(e.target.value))}
                    className="input-field w-20 text-sm"
                  />
                  <span className="text-xs text-muted">días · {calc.rotacionesMes}× por mes</span>
                </div>
              </div>
            </div>

            {/* Tarifa */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-ink">Tarifa</h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setModo('posicion')}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${modoTarifa === 'posicion' ? 'border-accent bg-accent text-white' : 'border-subtle text-muted'}`}
                >
                  Por posición/día
                </button>
                <button
                  onClick={() => setModo('kg')}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${modoTarifa === 'kg' ? 'border-accent bg-accent text-white' : 'border-subtle text-muted'}`}
                >
                  Por kg/mes
                </button>
              </div>

              {modoTarifa === 'posicion' ? (
                <div>
                  <label className="text-xs text-muted block mb-1">Tarifa por posición / día (MXN)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">$</span>
                    <input
                      type="number" min={1} max={500} step={0.5}
                      value={tarifaDia}
                      onChange={e => setTarifaDia(Number(e.target.value))}
                      className="input-field w-24 text-sm"
                    />
                    <span className="text-xs text-muted">MXN / pos / día</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-muted block mb-1">Tarifa por kg / mes (MXN)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">$</span>
                    <input
                      type="number" min={0.1} max={50} step={0.1}
                      value={tarifaAlmacenaje}
                      onChange={e => setTarifa(Number(e.target.value))}
                      className="input-field w-24 text-sm"
                    />
                    <span className="text-xs text-muted">MXN / kg / mes</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Panel de resultados ── */}
          <div className="space-y-4">

            {/* KPIs principales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <p className="text-xs text-muted mb-1">Posiciones totales</p>
                <p className="text-2xl font-bold text-ink">{fmt(calc.posTotal)}</p>
                <p className="text-xs text-faint mt-1">{fmt(calc.posOcupadas)} ocupadas ({ocupacion}%)</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted mb-1">Capacidad total</p>
                <p className="text-2xl font-bold text-ink">{fmt(calc.toneladas, 1)} <span className="text-base font-normal">ton</span></p>
                <p className="text-xs text-faint mt-1">{fmt(calc.toneladasOcup, 1)} ton ocupadas</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted mb-1">Ingreso diario potencial</p>
                <p className="text-2xl font-bold text-ink">{fmtMXN(calc.ingDiarioPot)}</p>
                <p className="text-xs text-faint mt-1">Real: {fmtMXN(calc.ingDiarioReal)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted mb-1">Ingreso mensual potencial</p>
                <p className="text-2xl font-bold text-ink">{fmtMXN(calc.ingMensualPot)}</p>
                <p className="text-xs text-faint mt-1">Real: {fmtMXN(calc.ingMensualReal)}</p>
              </div>
            </div>

            {/* Brecha de ocupación */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-ink">Ocupación vs Potencial</h2>
                <span className="text-xs text-muted">{ocupacion}% ocupado</span>
              </div>
              <div className="w-full bg-surface-2 rounded-full h-3 mb-3">
                <div
                  className={`h-3 rounded-full transition-all ${ocupacion >= 80 ? 'bg-emerald-500' : ocupacion >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                  style={{ width: `${ocupacion}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted">Ingreso real/mes</p>
                  <p className="text-sm font-semibold text-ink">{fmtMXN(calc.ingMensualReal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Brecha por ocupación</p>
                  <p className="text-sm font-semibold text-rose-600">-{fmtMXN(calc.brechaOcupacion)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Potencial 100%</p>
                  <p className="text-sm font-semibold text-emerald-700">{fmtMXN(calc.ingMensualPot)}</p>
                </div>
              </div>
            </div>

            {/* Proyección anual */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Proyección anual</h2>
              <div className="space-y-3">
                {[
                  { label: 'Escenario actual',   pct: ocupacion,              color: 'bg-rose-400' },
                  { label: 'Escenario objetivo', pct: Math.min(ocupacion + 15, 95), color: 'bg-amber-400' },
                  { label: 'Capacidad máxima',   pct: 95,                     color: 'bg-emerald-500' },
                ].map(esc => {
                  const ing = modoTarifa === 'posicion'
                    ? calc.posTotal * (esc.pct / 100) * tarifaDia * 30 * 12
                    : calc.kgTotal * (esc.pct / 100) * tarifaAlmacenaje * 12
                  return (
                    <div key={esc.label} className="flex items-center gap-3">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-xs text-muted">{esc.label}</p>
                        <p className="text-xs text-faint">{esc.pct}%</p>
                      </div>
                      <div className="flex-1 bg-surface-2 rounded-full h-2">
                        <div className={`${esc.color} h-2 rounded-full`} style={{ width: `${esc.pct}%` }} />
                      </div>
                      <p className="text-sm font-semibold text-ink w-28 text-right">{fmtMXN(ing)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Resumen ejecutivo */}
            <div className="card p-5 bg-accent-soft border-accent/20">
              <h2 className="text-sm font-semibold text-accent mb-3">Resumen ejecutivo</h2>
              <ul className="space-y-1.5 text-sm text-ink">
                <li>• El almacén tiene <strong>{fmt(calc.posTotal)} posiciones</strong> en <strong>{fmt(calc.m2Util)} m²</strong> útiles</li>
                <li>• Con ocupación actual del <strong>{ocupacion}%</strong>, el ingreso mensual es <strong>{fmtMXN(calc.ingMensualReal)}</strong></li>
                <li>• Subir al <strong>{Math.min(ocupacion + 15, 95)}%</strong> generaría <strong>{fmtMXN(calc.brechaOcupacion * 0.75)}</strong> adicionales al mes</li>
                <li>• Cada posición vacía representa <strong>{fmtMXN(tarifaDia * 30)}</strong>/mes sin cobrar</li>
                <li>• Rotación de {rotacion} días = <strong>{calc.rotacionesMes}× por mes</strong></li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  )
}
