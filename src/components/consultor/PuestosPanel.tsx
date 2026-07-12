'use client'

import { useState } from 'react'

type Position = {
  id: string
  name: string
  description: string | null
  job_description: string
  job_description_source_file: string | null
  business_role_id: string | null
}
type BusinessRole = { id: string; name: string }

interface Props {
  caseId: string
  companyName: string
  initialPositions: Position[]
  businessRoles: BusinessRole[]
}

export default function PuestosPanel({ caseId, companyName, initialPositions, businessRoles }: Props) {
  const [positions, setPositions] = useState<Position[]>(initialPositions)
  const [newPositionName, setNewPositionName] = useState('')
  const [newPositionShortDesc, setNewPositionShortDesc] = useState('')
  const [newPositionDesc, setNewPositionDesc] = useState('')
  const [newPositionSourceFile, setNewPositionSourceFile] = useState<string | null>(null)
  const [newPositionRoleId, setNewPositionRoleId] = useState('')
  const [editPositionId, setEditPositionId] = useState<string | null>(null)
  const [editPositionName, setEditPositionName] = useState('')
  const [editPositionShortDesc, setEditPositionShortDesc] = useState('')
  const [editPositionDesc, setEditPositionDesc] = useState('')
  const [editPositionSourceFile, setEditPositionSourceFile] = useState<string | null>(null)
  const [editPositionRoleId, setEditPositionRoleId] = useState('')
  const [savingPosition, setSavingPosition] = useState(false)
  const [extracting, setExtracting] = useState<'new' | 'edit' | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)

  const roleNameById = Object.fromEntries(businessRoles.map(r => [r.id, r.name]))

  async function extractDescriptivo(file: File, target: 'new' | 'edit') {
    setExtractError(null)
    setExtracting(target)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/consultant/case-job-positions/extract-descriptivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, attachment: { base64, mimeType: file.type, fileName: file.name } }),
      })
      const data = await res.json()
      if (!res.ok) { setExtractError(data.error ?? 'No se pudo extraer el texto'); return }
      if (target === 'new') {
        setNewPositionDesc(data.text)
        setNewPositionSourceFile(file.name)
      } else {
        setEditPositionDesc(data.text)
        setEditPositionSourceFile(file.name)
      }
    } catch {
      setExtractError('No se pudo leer el archivo')
    } finally {
      setExtracting(null)
    }
  }

  async function createPosition() {
    if (!newPositionName.trim() || !newPositionDesc.trim()) return
    setSavingPosition(true)
    const res = await fetch('/api/consultant/case-job-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        name: newPositionName,
        description: newPositionShortDesc,
        jobDescription: newPositionDesc,
        jobDescriptionSourceFile: newPositionSourceFile,
        businessRoleId: newPositionRoleId || null,
      }),
    })
    const data = await res.json()
    if (data.position) setPositions(prev => [...prev, data.position])
    setNewPositionName('')
    setNewPositionShortDesc('')
    setNewPositionDesc('')
    setNewPositionSourceFile(null)
    setNewPositionRoleId('')
    setSavingPosition(false)
  }

  function startEditPosition(p: Position) {
    setEditPositionId(p.id)
    setEditPositionName(p.name)
    setEditPositionShortDesc(p.description ?? '')
    setEditPositionDesc(p.job_description)
    setEditPositionSourceFile(p.job_description_source_file)
    setEditPositionRoleId(p.business_role_id ?? '')
  }

  async function saveEditPosition() {
    if (!editPositionId) return
    setSavingPosition(true)
    const res = await fetch('/api/consultant/case-job-positions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        positionId: editPositionId,
        name: editPositionName,
        description: editPositionShortDesc,
        jobDescription: editPositionDesc,
        jobDescriptionSourceFile: editPositionSourceFile,
        businessRoleId: editPositionRoleId || null,
      }),
    })
    const data = await res.json()
    if (data.position) {
      setPositions(prev => prev.map(p => p.id === editPositionId ? data.position : p))
    }
    setEditPositionId(null)
    setSavingPosition(false)
  }

  async function deletePosition(positionId: string) {
    let res = await fetch('/api/consultant/case-job-positions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, positionId }),
    })
    if (res.status === 409) {
      const data = await res.json()
      if (!confirm(data.message ?? '¿Eliminar este puesto?')) return
      res = await fetch('/api/consultant/case-job-positions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, positionId, confirm: true }),
      })
    }
    if (res.ok) setPositions(prev => prev.filter(p => p.id !== positionId))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Puestos de {companyName}</h1>
        <p className="text-sm text-muted mt-0.5">
          {positions.length === 0
            ? 'Sin puestos creados todavía — las preguntas sin puesto mapeado no se le muestran a nadie'
            : `${positions.length} puesto${positions.length !== 1 ? 's' : ''} creado${positions.length !== 1 ? 's' : ''}`}
          . La asignación de preguntas a cada puesto se hace en Módulos.
        </p>
      </div>

      <div className="space-y-3">
        {positions.map(p => (
          <div key={p.id} className="card p-4">
            {editPositionId === p.id ? (
              <div className="space-y-2">
                <input
                  value={editPositionName}
                  onChange={e => setEditPositionName(e.target.value)}
                  className="input-field text-sm w-full"
                  placeholder="Nombre del puesto"
                />
                <input
                  value={editPositionShortDesc}
                  onChange={e => setEditPositionShortDesc(e.target.value)}
                  className="input-field text-sm w-full"
                  placeholder="Descripción corta (opcional, para listas)"
                />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-muted">Descriptivo de puesto (funciones y responsabilidades)</label>
                    <label className="text-xs text-accent hover:underline cursor-pointer">
                      {extracting === 'edit' ? 'Extrayendo…' : '📎 Subir archivo (PDF/Word/txt)'}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        disabled={extracting === 'edit'}
                        onChange={e => { const f = e.target.files?.[0]; if (f) extractDescriptivo(f, 'edit'); e.target.value = '' }}
                      />
                    </label>
                  </div>
                  {editPositionSourceFile && (
                    <p className="text-xs text-faint mb-1">Cargado desde: {editPositionSourceFile}</p>
                  )}
                  <textarea
                    value={editPositionDesc}
                    onChange={e => { setEditPositionDesc(e.target.value); setEditPositionSourceFile(null) }}
                    rows={3}
                    className="input-field text-sm w-full resize-none"
                    placeholder="Descriptivo de puesto: funciones y responsabilidades"
                  />
                </div>
                <select
                  value={editPositionRoleId}
                  onChange={e => setEditPositionRoleId(e.target.value)}
                  className="input-field text-sm w-full"
                >
                  <option value="">Sin rol asignado</option>
                  {businessRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={saveEditPosition} disabled={savingPosition} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                    {savingPosition ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditPositionId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{p.name}</p>
                    {p.business_role_id && roleNameById[p.business_role_id] && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">{roleNameById[p.business_role_id]}</span>
                    )}
                  </div>
                  {p.description && <p className="text-xs text-ink/80 mt-0.5">{p.description}</p>}
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">{p.job_description}</p>
                  {p.job_description_source_file && (
                    <p className="text-xs text-faint mt-0.5">📎 {p.job_description_source_file}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEditPosition(p)} className="text-xs px-2.5 py-1.5 rounded-lg border border-subtle hover:bg-surface-2 text-muted hover:text-ink transition-colors">✎</button>
                  <button onClick={() => deletePosition(p.id)} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">🗑</button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="border-2 border-dashed border-subtle rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-ink">Nuevo puesto</p>
          <input
            value={newPositionName}
            onChange={e => setNewPositionName(e.target.value)}
            className="input-field text-sm w-full"
            placeholder="Nombre del puesto (ej. Gerente de Almacén Fiscal)"
          />
          <input
            value={newPositionShortDesc}
            onChange={e => setNewPositionShortDesc(e.target.value)}
            className="input-field text-sm w-full"
            placeholder="Descripción corta (opcional, para listas)"
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted">Descriptivo de puesto (obligatorio)</label>
              <label className="text-xs text-accent hover:underline cursor-pointer">
                {extracting === 'new' ? 'Extrayendo…' : '📎 Subir archivo (PDF/Word/txt)'}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  disabled={extracting === 'new'}
                  onChange={e => { const f = e.target.files?.[0]; if (f) extractDescriptivo(f, 'new'); e.target.value = '' }}
                />
              </label>
            </div>
            {newPositionSourceFile && (
              <p className="text-xs text-faint mb-1">Cargado desde: {newPositionSourceFile}</p>
            )}
            <textarea
              value={newPositionDesc}
              onChange={e => { setNewPositionDesc(e.target.value); setNewPositionSourceFile(null) }}
              rows={3}
              className="input-field text-sm w-full resize-none"
              placeholder="Descriptivo de puesto: funciones y responsabilidades declaradas (obligatorio)"
            />
          </div>
          {extractError && <p className="text-xs text-red-600">{extractError}</p>}
          <select
            value={newPositionRoleId}
            onChange={e => setNewPositionRoleId(e.target.value)}
            className="input-field text-sm w-full"
          >
            <option value="">Sin rol asignado</option>
            {businessRoles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={createPosition}
            disabled={!newPositionName.trim() || !newPositionDesc.trim() || savingPosition}
            className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
          >
            {savingPosition ? 'Guardando…' : '+ Agregar puesto'}
          </button>
        </div>
      </div>
    </div>
  )
}
