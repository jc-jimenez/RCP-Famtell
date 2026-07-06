'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts'

interface KPIDefinition {
  id: string
  metric_key: string
  label: string
  target: number
  unit: string
  sort_order: number
}

interface KPIRecord {
  week: number
  values: Record<string, number>
  recorded_at: string | null
}

interface Props {
  caseId: string
  role: 'director' | 'consultant'
  initialKPIs: KPIRecord[]
  initialDefinitions: KPIDefinition[]
}

function trafficLight(actual: number, target: number) {
  if (target === 0) return 'gray'
  const pct = actual / target
  if (pct >= 0.9) return 'green'
  if (pct >= 0.6) return 'yellow'
  return 'red'
}

const TL_COLORS = { green: 'text-emerald-600', yellow: 'text-amber-600', red: 'text-red-600', gray: 'text-faint' }
const TL_BG    = { green: 'bg-emerald-50 border-emerald-100', yellow: 'bg-amber-50 border-amber-100', red: 'bg-red-50 border-red-100', gray: 'bg-surface-2 border-subtle' }

function fmt(value: number, unit: string): string {
  if (unit === '$') return `$${(value / 1000).toFixed(0)}k`
  if (unit === '%') return `${value}%`
  return String(value)
}

function slugify(text: string): string {
  return text.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function KPIBoardClient({ caseId, role, initialKPIs, initialDefinitions }: Props) {
  const [kpis, setKPIs] = useState<KPIRecord[]>(initialKPIs)
  const [definitions, setDefinitions] = useState<KPIDefinition[]>(initialDefinitions)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, number>>({})

  const isConsultant = role === 'consultant'
  const isDirector = role === 'director'

  // ── Gestión del catálogo de KPIs (solo consultor) ──
  const [showDefinitions, setShowDefinitions] = useState(definitions.length === 0)
  const [newLabel, setNewLabel] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [savingDef, setSavingDef] = useState(false)
  const [editDefId, setEditDefId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editUnit, setEditUnit] = useState('')

  async function createDefinition() {
    if (!newLabel.trim()) return
    setSavingDef(true)
    const res = await fetch('/api/consultant/case-kpi-definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        metricKey: slugify(newLabel) || `kpi_${definitions.length + 1}`,
        label: newLabel,
        target: Number(newTarget) || 0,
        unit: newUnit,
        sortOrder: definitions.length,
      }),
    })
    const data = await res.json()
    if (data.definition) setDefinitions(prev => [...prev, data.definition])
    setNewLabel('')
    setNewTarget('')
    setNewUnit('')
    setSavingDef(false)
  }

  function startEditDefinition(d: KPIDefinition) {
    setEditDefId(d.id)
    setEditLabel(d.label)
    setEditTarget(String(d.target))
    setEditUnit(d.unit)
  }

  async function saveEditDefinition() {
    if (!editDefId) return
    setSavingDef(true)
    const res = await fetch('/api/consultant/case-kpi-definitions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, definitionId: editDefId, label: editLabel, target: Number(editTarget) || 0, unit: editUnit }),
    })
    const data = await res.json()
    if (data.definition) {
      setDefinitions(prev => prev.map(d => d.id === editDefId ? data.definition : d))
    }
    setEditDefId(null)
    setSavingDef(false)
  }

  async function deleteDefinition(definitionId: string) {
    await fetch('/api/consultant/case-kpi-definitions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, definitionId }),
    })
    setDefinitions(prev => prev.filter(d => d.id !== definitionId))
  }

  // ── Captura semanal (solo directivo) ──

  const latestKPI = kpis[kpis.length - 1]

  async function handleSaveKPI() {
    if (!selectedWeek) return
    setSaving(true)
    const res = await fetch('/api/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, week: selectedWeek, values: form }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setKPIs(prev => {
        const idx = prev.findIndex(k => k.week === selectedWeek)
        if (idx >= 0) { const n = [...prev]; n[idx] = data.kpi; return n }
        return [...prev, data.kpi].sort((a, b) => a.week - b.week)
      })
      setSelectedWeek(null)
      setForm({})
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Tablero KPIs</h1>
        {isDirector && definitions.length > 0 && (
          <button
            onClick={() => { setSelectedWeek((kpis.length + 1)); setForm({}) }}
            className="btn-primary text-sm"
          >
            + Semana {kpis.length + 1}
          </button>
        )}
      </div>

      {/* Catálogo de KPIs — solo consultor (sección 9.1 del PRD) */}
      {isConsultant && (
        <div className="card p-5 space-y-3">
          <button onClick={() => setShowDefinitions(v => !v)} className="w-full flex items-center justify-between text-left">
            <div>
              <h2 className="text-sm font-semibold text-ink">KPIs a trackear en este caso</h2>
              <p className="text-xs text-muted">
                {definitions.length === 0
                  ? 'Sin KPIs definidos todavía — el directivo no podrá capturar avance semanal hasta que definas al menos uno'
                  : `${definitions.length} KPI${definitions.length !== 1 ? 's' : ''} definido${definitions.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <span className="text-xs text-muted">{showDefinitions ? '▲ Ocultar' : '▼ Mostrar'}</span>
          </button>

          {showDefinitions && (
            <div className="space-y-3 pt-2 border-t border-subtle">
              {definitions.map(d => (
                <div key={d.id} className="rounded-xl border border-subtle p-3">
                  {editDefId === d.id ? (
                    <div className="space-y-2">
                      <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="input-field text-sm w-full" placeholder="Nombre del KPI" />
                      <div className="flex gap-2">
                        <input value={editTarget} onChange={e => setEditTarget(e.target.value)} type="number" className="input-field text-sm flex-1" placeholder="Meta" />
                        <input value={editUnit} onChange={e => setEditUnit(e.target.value)} className="input-field text-sm w-24" placeholder="Unidad ($,%)" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEditDefinition} disabled={savingDef} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                          {savingDef ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditDefId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{d.label}</p>
                        <p className="text-xs text-muted">Meta: {fmt(d.target, d.unit)}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditDefinition(d)} className="text-xs px-2.5 py-1.5 rounded-lg border border-subtle hover:bg-surface-2 text-muted hover:text-ink transition-colors">✎</button>
                        <button onClick={() => deleteDefinition(d.id)} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="border-2 border-dashed border-subtle rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-ink">Nuevo KPI</p>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="input-field text-sm w-full"
                  placeholder="Nombre (ej. Ocupación de almacén)"
                />
                <div className="flex gap-2">
                  <input value={newTarget} onChange={e => setNewTarget(e.target.value)} type="number" className="input-field text-sm flex-1" placeholder="Meta (ej. 80)" />
                  <input value={newUnit} onChange={e => setNewUnit(e.target.value)} className="input-field text-sm w-24" placeholder="Unidad ($,%)" />
                </div>
                <button
                  onClick={createDefinition}
                  disabled={!newLabel.trim() || savingDef}
                  className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
                >
                  {savingDef ? 'Guardando…' : '+ Agregar KPI'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {definitions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted font-medium">Todavía no hay KPIs definidos para este caso</p>
          <p className="text-faint text-sm mt-1">
            {isConsultant ? 'Defínelos arriba para que el directivo pueda empezar a capturar avance' : 'Tu consultor definirá los KPIs a seguir próximamente'}
          </p>
        </div>
      ) : kpis.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted font-medium">No hay datos de KPIs aún</p>
          <p className="text-faint text-sm mt-1">Los datos aparecerán cuando el directivo registre la primera semana</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {definitions.map(d => {
              const actual = latestKPI?.values?.[d.metric_key] ?? 0
              const tl = trafficLight(actual, d.target)
              return (
                <div key={d.id} className={`card border p-4 ${TL_BG[tl]}`}>
                  <p className="text-xs text-muted font-medium">{d.label}</p>
                  <p className={`text-xl font-bold mt-1 ${TL_COLORS[tl]}`}>{fmt(actual, d.unit)}</p>
                  <p className="text-xs text-faint">meta: {fmt(d.target, d.unit)}</p>
                </div>
              )
            })}
          </div>

          {definitions.map(d => (
            <div key={d.id} className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">{d.label} — 12 semanas</h2>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={kpis} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `S${v}`} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => fmt(v, d.unit)} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                    formatter={(v: unknown) => [fmt(Number(v) || 0, d.unit), d.label]}
                    labelFormatter={v => `Semana ${v}`}
                  />
                  <ReferenceLine y={d.target} stroke="#cbd5e1" strokeDasharray="4 2" />
                  <Line
                    type="monotone"
                    dataKey={(row: KPIRecord) => row.values?.[d.metric_key] ?? 0}
                    name={d.label}
                    stroke="#185FA5"
                    strokeWidth={2}
                    dot={{ fill: '#185FA5', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </>
      )}

      {isDirector && selectedWeek !== null && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-ink">Semana {selectedWeek}</h3>
            <div className="grid grid-cols-2 gap-3">
              {definitions.map(d => (
                <div key={d.id}>
                  <label className="label-text text-xs">{d.label}{d.unit ? ` (${d.unit})` : ''}</label>
                  <input
                    type="number"
                    value={form[d.metric_key] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [d.metric_key]: Number(e.target.value) }))}
                    className="input-field text-sm py-2"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setSelectedWeek(null); setForm({}) }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSaveKPI} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar semana'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
