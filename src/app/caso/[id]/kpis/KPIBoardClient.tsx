'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts'

interface KPI {
  week: number
  revenue_actual: number
  revenue_target: number
  active_clients: number
  active_clients_target: number
  new_clients: number
  warehouse_occupancy: number
  commercial_contacts: number
  proposals_sent: number
  close_rate: number
}

interface Props {
  caseId: string
  initialKPIs: KPI[]
  canEdit: boolean
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

export default function KPIBoardClient({ caseId, initialKPIs, canEdit }: Props) {
  const [kpis, setKPIs] = useState<KPI[]>(initialKPIs)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<KPI>>({})

  const latestKPI = kpis[kpis.length - 1]

  const metricCards = latestKPI ? [
    { label: 'Ingresos',         actual: latestKPI.revenue_actual,        target: latestKPI.revenue_target,       fmt: (v: number) => `$${(v/1000).toFixed(0)}k` },
    { label: 'Clientes activos', actual: latestKPI.active_clients,        target: latestKPI.active_clients_target,fmt: (v: number) => String(v) },
    { label: 'Clientes nuevos',  actual: latestKPI.new_clients,           target: 1,                              fmt: (v: number) => String(v) },
    { label: 'Ocupación almacén',actual: latestKPI.warehouse_occupancy,   target: 80,                             fmt: (v: number) => `${v}%` },
    { label: 'Contactos',        actual: latestKPI.commercial_contacts,   target: 20,                             fmt: (v: number) => String(v) },
    { label: 'Tasa de cierre',   actual: latestKPI.close_rate,            target: 20,                             fmt: (v: number) => `${v}%` },
  ] : []

  async function handleSaveKPI() {
    if (!selectedWeek) return
    setSaving(true)
    const res = await fetch('/api/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, week: selectedWeek, ...form }),
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
        {canEdit && (
          <button
            onClick={() => { setSelectedWeek((kpis.length + 1)); setForm({}) }}
            className="btn-primary text-sm"
          >
            + Semana {kpis.length + 1}
          </button>
        )}
      </div>

      {kpis.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted font-medium">No hay datos de KPIs aún</p>
          <p className="text-faint text-sm mt-1">Los datos aparecerán cuando el directivo registre la primera semana</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metricCards.map((m) => {
              const tl = trafficLight(m.actual, m.target)
              return (
                <div key={m.label} className={`card border p-4 ${TL_BG[tl]}`}>
                  <p className="text-xs text-muted font-medium">{m.label}</p>
                  <p className={`text-xl font-bold mt-1 ${TL_COLORS[tl]}`}>{m.fmt(m.actual)}</p>
                  <p className="text-xs text-faint">meta: {m.fmt(m.target)}</p>
                </div>
              )
            })}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Ingresos — 12 semanas</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={kpis} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `S${v}`} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  labelStyle={{ color: '#64748b' }}
                  labelFormatter={v => `Semana ${v}`}
                  formatter={(v: unknown, name: unknown) => [`$${((Number(v) || 0)/1000).toFixed(1)}k`, name === 'revenue_actual' ? 'Real' : 'Meta'] as [string, string]}
                />
                <Legend formatter={v => v === 'revenue_actual' ? 'Real' : 'Meta'} />
                <Line type="monotone" dataKey="revenue_target" stroke="#cbd5e1" strokeDasharray="4 2" dot={false} />
                <Line type="monotone" dataKey="revenue_actual" stroke="#185FA5" strokeWidth={2} dot={{ fill: '#185FA5', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Ocupación almacén</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={kpis} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `S${v}`} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  formatter={(v: unknown) => [`${Number(v) || 0}%`, 'Ocupación']}
                  labelFormatter={v => `Semana ${v}`}
                />
                <Line type="monotone" dataKey="warehouse_occupancy" stroke="#0F6E56" strokeWidth={2} dot={{ fill: '#0F6E56', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {canEdit && selectedWeek !== null && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-ink">Semana {selectedWeek}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'revenue_actual',       label: 'Ingresos reales ($)' },
                { key: 'revenue_target',       label: 'Meta de ingresos ($)' },
                { key: 'active_clients',       label: 'Clientes activos' },
                { key: 'active_clients_target',label: 'Meta clientes' },
                { key: 'new_clients',          label: 'Clientes nuevos' },
                { key: 'warehouse_occupancy',  label: 'Ocupación almacén (%)' },
                { key: 'commercial_contacts',  label: 'Contactos comerciales' },
                { key: 'proposals_sent',       label: 'Propuestas enviadas' },
                { key: 'close_rate',           label: 'Tasa de cierre (%)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label-text text-xs">{label}</label>
                  <input
                    type="number"
                    value={(form as any)[key] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [key]: Number(e.target.value) }))}
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
