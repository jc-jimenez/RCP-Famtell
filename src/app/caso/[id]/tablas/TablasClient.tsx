'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import CasoTabs from '@/components/consultor/CasoTabs'
import type { UserRole } from '@/types'

type ColType = 'text' | 'number' | 'currency' | 'percent' | 'select'
interface Column { key: string; label: string; type: ColType; options?: string[] }
interface Instrument {
  id: string
  module_code: string
  name: string
  description: string | null
  columns: Column[]
  job_position_ids: string[]
  sort_order: number
}
interface Row { id: string; row_data: Record<string, any>; sort_order: number }
interface Position { id: string; name: string }

interface Props {
  caseId: string
  companyName: string
  role: 'director' | 'collaborator' | 'consultant'
  email: string
  myPositionId: string | null
  initialInstruments: Instrument[]
  positions: Position[]
}

const MODULES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

function slugify(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function fmtCell(value: any, type: ColType): string {
  if (value === null || value === undefined || value === '') return ''
  if (type === 'currency') return `$${Number(value).toLocaleString('es-MX')}`
  if (type === 'percent') return `${value}%`
  return String(value)
}

export default function TablasClient({ caseId, companyName, role, email, myPositionId, initialInstruments, positions }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'
  const isConsultant = role === 'consultant'

  const [instruments, setInstruments] = useState<Instrument[]>(initialInstruments)
  const visibleInstruments = useMemo(
    () => isConsultant ? instruments : instruments.filter(i => myPositionId && i.job_position_ids.includes(myPositionId)),
    [instruments, isConsultant, myPositionId]
  )

  const [selectedId, setSelectedId] = useState<string | null>(visibleInstruments[0]?.id ?? null)
  const [rowsByInstrument, setRowsByInstrument] = useState<Record<string, Row[]>>({})
  const [loadingRows, setLoadingRows] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [preview, setPreview] = useState<Record<string, any>[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedId && !rowsByInstrument[selectedId]) loadRows(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // ── Gestión de instrumentos (solo consultor) ──
  const [form, setForm] = useState({
    moduleCode: 'M1', name: '', description: '',
    columns: [{ key: 'campo_1', label: '', type: 'text' as ColType }],
    jobPositionIds: [] as string[],
  })
  const [savingInstrument, setSavingInstrument] = useState(false)

  function addColumn() {
    setForm(f => ({ ...f, columns: [...f.columns, { key: `campo_${f.columns.length + 1}`, label: '', type: 'text' }] }))
  }
  function updateColumn(idx: number, field: keyof Column, val: string) {
    setForm(f => {
      const cols = [...f.columns]
      cols[idx] = { ...cols[idx], [field]: val }
      if (field === 'label') cols[idx].key = slugify(val) || `campo_${idx + 1}`
      return { ...f, columns: cols }
    })
  }
  function removeColumn(idx: number) {
    setForm(f => ({ ...f, columns: f.columns.filter((_, i) => i !== idx) }))
  }
  function togglePosition(id: string) {
    setForm(f => ({
      ...f,
      jobPositionIds: f.jobPositionIds.includes(id) ? f.jobPositionIds.filter(x => x !== id) : [...f.jobPositionIds, id],
    }))
  }

  async function createInstrument() {
    if (!form.name.trim() || form.columns.some(c => !c.label.trim())) return
    setSavingInstrument(true)
    const res = await fetch('/api/consultant/case-table-instruments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId, moduleCode: form.moduleCode, name: form.name, description: form.description,
        columns: form.columns, jobPositionIds: form.jobPositionIds, sortOrder: instruments.length,
      }),
    })
    const data = await res.json()
    if (data.instrument) {
      setInstruments(prev => [...prev, data.instrument])
      setSelectedId(data.instrument.id)
    }
    setForm({ moduleCode: 'M1', name: '', description: '', columns: [{ key: 'campo_1', label: '', type: 'text' }], jobPositionIds: [] })
    setSavingInstrument(false)
  }

  async function deleteInstrument(id: string) {
    await fetch('/api/consultant/case-table-instruments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, instrumentId: id }),
    })
    setInstruments(prev => prev.filter(i => i.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // ── Filas ──
  async function loadRows(instrumentId: string) {
    setLoadingRows(true)
    const res = await fetch(`/api/table-rows?instrumentId=${instrumentId}`)
    const data = await res.json()
    setRowsByInstrument(prev => ({ ...prev, [instrumentId]: data.rows ?? [] }))
    setLoadingRows(false)
  }

  function selectInstrument(id: string) {
    setSelectedId(id)
    setPreview(null)
    if (!rowsByInstrument[id]) loadRows(id)
  }

  async function addRow(instrumentId: string) {
    const res = await fetch('/api/table-rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instrumentId, rowData: {}, sortOrder: (rowsByInstrument[instrumentId]?.length ?? 0) }),
    })
    const data = await res.json()
    if (data.row) {
      setRowsByInstrument(prev => ({ ...prev, [instrumentId]: [...(prev[instrumentId] ?? []), data.row] }))
    }
  }

  async function updateRow(instrumentId: string, rowId: string, columnKey: string, value: string) {
    setRowsByInstrument(prev => ({
      ...prev,
      [instrumentId]: (prev[instrumentId] ?? []).map(r => r.id === rowId ? { ...r, row_data: { ...r.row_data, [columnKey]: value } } : r),
    }))
  }

  async function saveRow(instrumentId: string, rowId: string) {
    const row = rowsByInstrument[instrumentId]?.find(r => r.id === rowId)
    if (!row) return
    await fetch('/api/table-rows', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowId, rowData: row.row_data }),
    })
  }

  async function deleteRow(instrumentId: string, rowId: string) {
    await fetch('/api/table-rows', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowId }),
    })
    setRowsByInstrument(prev => ({ ...prev, [instrumentId]: (prev[instrumentId] ?? []).filter(r => r.id !== rowId) }))
  }

  // ── Extracción con IA ──
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedId) return
    setExtracting(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const res = await fetch('/api/table-rows/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrumentId: selectedId, attachment: { base64, mimeType: file.type || 'text/plain', fileName: file.name } }),
      })
      const data = await res.json()
      setPreview(data.rows ?? [])
      setExtracting(false)
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function confirmPreview() {
    if (!selectedId || !preview) return
    for (const rowData of preview) {
      const res = await fetch('/api/table-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrumentId: selectedId, rowData }),
      })
      const data = await res.json()
      if (data.row) {
        setRowsByInstrument(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), data.row] }))
      }
    }
    setPreview(null)
  }

  const selected = visibleInstruments.find(i => i.id === selectedId)
  const rows = selectedId ? (rowsByInstrument[selectedId] ?? []) : []

  const tabBar = role === 'director' ? <DirectorTabs caseId={caseId} /> : role === 'consultant' ? <CasoTabs caseId={caseId} activeTab="tablas" /> : undefined

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName} tabBar={tabBar}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">Tablas de Diagnóstico</h1>
            <p className="text-sm text-muted mt-1">Datos que se llenan en tabla (listas de clientes, competidores, costos, etc.), no por entrevista</p>
          </div>
          {isConsultant && (
            <button onClick={() => setShowManage(v => !v)} className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap">
              {showManage ? 'Ocultar gestión' : '⚙ Gestionar tablas'}
            </button>
          )}
        </div>

        {isConsultant && showManage && (
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Nueva tabla</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text text-xs">Módulo</label>
                <select value={form.moduleCode} onChange={e => setForm(f => ({ ...f, moduleCode: e.target.value }))} className="input-field text-sm">
                  {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text text-xs">Nombre de la tabla</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Mapa de Clientes Activos vs. Inactivos" />
              </div>
            </div>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input-field text-sm w-full resize-none" placeholder="Instrucciones para quien la llena (opcional)" />

            <div>
              <p className="text-xs font-medium text-ink mb-1.5">Columnas</p>
              <div className="space-y-1.5">
                {form.columns.map((c, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input value={c.label} onChange={e => updateColumn(idx, 'label', e.target.value)} className="input-field text-xs flex-1" placeholder="Nombre de columna" />
                    <select value={c.type} onChange={e => updateColumn(idx, 'type', e.target.value)} className="input-field text-xs w-32">
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="currency">Moneda</option>
                      <option value="percent">Porcentaje</option>
                      <option value="select">Selector</option>
                    </select>
                    <button onClick={() => removeColumn(idx)} className="text-xs text-red-600 px-2">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addColumn} className="text-xs text-accent hover:underline mt-1.5">+ Agregar columna</button>
            </div>

            <div>
              <p className="text-xs font-medium text-ink mb-1.5">Puestos que la llenan</p>
              <div className="flex flex-wrap gap-1.5">
                {positions.length === 0 ? (
                  <p className="text-xs text-amber-600">No hay puestos creados en este caso todavía.</p>
                ) : positions.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePosition(p.id)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${form.jobPositionIds.includes(p.id) ? 'bg-emerald-600 text-white border-emerald-600' : 'border-subtle text-muted'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={createInstrument} disabled={!form.name.trim() || savingInstrument} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
              {savingInstrument ? 'Guardando…' : '+ Crear tabla'}
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="card p-3 space-y-1 self-start">
            {visibleInstruments.length === 0 && <p className="text-xs text-faint p-2">No hay tablas asignadas todavía.</p>}
            {visibleInstruments.map(i => (
              <div key={i.id} className="group relative">
                <button onClick={() => selectInstrument(i.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${selectedId === i.id ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'}`}>
                  <p className="text-xs font-medium">{i.module_code} — {i.name}</p>
                </button>
                {isConsultant && (
                  <button onClick={() => deleteInstrument(i.id)} className="absolute top-2 right-2 text-faint hover:text-rose-500 text-xs opacity-0 group-hover:opacity-100">✕</button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {!selected ? (
              <div className="card p-10 text-center text-sm text-muted">Selecciona una tabla de la izquierda.</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{selected.name}</h2>
                    {selected.description && <p className="text-xs text-muted mt-0.5">{selected.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.xlsx" className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={extracting} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">
                      {extracting ? 'Analizando…' : '📎 Subir documento'}
                    </button>
                    <button onClick={() => addRow(selected.id)} className="btn-primary text-xs px-3 py-1.5">+ Agregar fila</button>
                  </div>
                </div>

                {preview && (
                  <div className="card p-4 border-2 border-dashed border-accent/40 space-y-2">
                    <p className="text-xs font-semibold text-accent">Vista previa — {preview.length} filas extraídas del documento</p>
                    <div className="max-h-48 overflow-auto text-xs">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(preview, null, 2)}</pre>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={confirmPreview} className="btn-primary text-xs px-3 py-1.5">Confirmar e insertar</button>
                      <button onClick={() => setPreview(null)} className="btn-secondary text-xs px-3 py-1.5">Descartar</button>
                    </div>
                  </div>
                )}

                <div className="card overflow-x-auto">
                  {loadingRows ? (
                    <p className="text-xs text-muted p-4">Cargando…</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-subtle">
                          {selected.columns.map(c => (
                            <th key={c.key} className="text-left text-xs text-muted p-2 font-medium">{c.label}</th>
                          ))}
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {rows.map(row => (
                          <tr key={row.id}>
                            {selected.columns.map(c => (
                              <td key={c.key} className="p-1.5">
                                {c.type === 'select' ? (
                                  <select
                                    value={row.row_data[c.key] ?? ''}
                                    onChange={e => { updateRow(selected.id, row.id, c.key, e.target.value); saveRow(selected.id, row.id) }}
                                    className="input-field text-xs py-1"
                                  >
                                    <option value="">—</option>
                                    {(c.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    value={row.row_data[c.key] ?? ''}
                                    onChange={e => updateRow(selected.id, row.id, c.key, e.target.value)}
                                    onBlur={() => saveRow(selected.id, row.id)}
                                    className="input-field text-xs py-1 w-full"
                                    type={c.type === 'number' || c.type === 'currency' || c.type === 'percent' ? 'number' : 'text'}
                                  />
                                )}
                              </td>
                            ))}
                            <td>
                              <button onClick={() => deleteRow(selected.id, row.id)} className="text-faint hover:text-rose-500 text-xs px-1">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {rows.length === 0 && !loadingRows && (
                    <p className="text-xs text-faint p-4 text-center">Sin filas todavía — agrega una o sube un documento.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
