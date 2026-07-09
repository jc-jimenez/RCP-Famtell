'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

type Override = { is_active: boolean; custom_text: string | null; job_position_ids: string[] }
type Question = { id: string; text: string; nova_hint: string | null; is_active: boolean }
type CustomQuestion = { id: string; section_id: string; text: string; nova_hint: string | null; is_active: boolean; is_custom: true; job_position_ids: string[] }
type Section  = { id: string; code: string; name: string; questions: Question[] }
type Module   = { id: string; code: string; name: string; sections: Section[] }
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
  modules: Module[]
  initialOverrides: Record<string, Override>
  initialCustomBySection: Record<string, any[]>
  initialPositions: Position[]
  businessRoles: BusinessRole[]
  /** 'super_admin' cuando el super-admin entra en modo soporte a un caso ajeno */
  role?: 'consultant' | 'super_admin'
  backHref?: string
}

export default function PlanDiagnosticoClient({
  caseId, companyName, modules, initialOverrides, initialCustomBySection, initialPositions, businessRoles,
  role = 'consultant', backHref,
}: Props) {
  const { email } = useSupabaseUser()
  const [overrides, setOverrides] = useState<Record<string, Override>>(initialOverrides)
  const [customBySection, setCustomBySection] = useState<Record<string, CustomQuestion[]>>(
    Object.fromEntries(
      Object.entries(initialCustomBySection).map(([sid, qs]) => [
        sid, qs.map(q => ({ ...q, is_custom: true as const, job_position_ids: q.job_position_ids ?? [] })),
      ])
    )
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [activeModule, setActiveModule] = useState(modules[0]?.code ?? '')

  // Catálogo de puestos del caso (sección 7 del PRD)
  const [positions, setPositions] = useState<Position[]>(initialPositions)
  const [showPositions, setShowPositions] = useState(initialPositions.length === 0)
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
    await fetch('/api/consultant/case-job-positions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, positionId }),
    })
    setPositions(prev => prev.filter(p => p.id !== positionId))
  }

  // Edición de pregunta del catálogo
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editPositionIds, setEditPositionIds] = useState<string[]>([])

  // Agregar pregunta custom
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [newHint, setNewHint] = useState('')
  const [newQPositionIds, setNewQPositionIds] = useState<string[]>([])

  // Edición de pregunta custom
  const [editCustomId, setEditCustomId] = useState<string | null>(null)
  const [editCustomText, setEditCustomText] = useState('')
  const [editCustomPositionIds, setEditCustomPositionIds] = useState<string[]>([])

  const mod = modules.find(m => m.code === activeModule)!

  // ── Helpers para preguntas del catálogo ──

  function isActive(q: Question): boolean {
    return overrides[q.id]?.is_active ?? q.is_active
  }

  function displayText(q: Question): string {
    return overrides[q.id]?.custom_text ?? q.text
  }

  function isCustomText(q: Question): boolean {
    return !!overrides[q.id]?.custom_text
  }

  function mappedPositionIds(q: Question): string[] {
    return overrides[q.id]?.job_position_ids ?? []
  }

  // ── Acciones sobre preguntas del catálogo ──

  async function toggleQuestion(q: Question) {
    const newActive = !isActive(q)
    setSaving(q.id)
    await fetch('/api/consultant/case-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId, questionId: q.id, isActive: newActive,
        customText: overrides[q.id]?.custom_text ?? null,
        jobPositionIds: overrides[q.id]?.job_position_ids ?? [],
      }),
    })
    setOverrides(prev => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        is_active: newActive,
        custom_text: prev[q.id]?.custom_text ?? null,
        job_position_ids: prev[q.id]?.job_position_ids ?? [],
      },
    }))
    setSaving(null)
  }

  function startEdit(q: Question) {
    setEditId(q.id)
    setEditText(displayText(q))
    setEditPositionIds(mappedPositionIds(q))
  }

  async function saveEdit(q: Question) {
    setSaving(q.id)
    await fetch('/api/consultant/case-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        questionId: q.id,
        isActive: isActive(q),
        customText: editText !== q.text ? editText : null,
        jobPositionIds: editPositionIds,
      }),
    })
    setOverrides(prev => ({
      ...prev,
      [q.id]: {
        is_active: isActive(q),
        custom_text: editText !== q.text ? editText : null,
        job_position_ids: editPositionIds,
      },
    }))
    setSaving(null)
    setEditId(null)
  }

  async function resetOverride(q: Question) {
    await fetch('/api/consultant/case-overrides', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, questionId: q.id }),
    })
    setOverrides(prev => {
      const next = { ...prev }
      delete next[q.id]
      return next
    })
    setEditId(null)
  }

  // ── Acciones sobre preguntas custom ──

  async function addCustomQuestion(sectionId: string) {
    if (!newText.trim()) return
    setSaving('new-' + sectionId)
    const res = await fetch('/api/consultant/case-custom-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, sectionId, text: newText, novaHint: newHint || null, jobPositionIds: newQPositionIds }),
    })
    const data = await res.json()
    if (data.question) {
      setCustomBySection(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] ?? []), { ...data.question, is_custom: true, job_position_ids: data.question.job_position_ids ?? [] }],
      }))
    }
    setAddingSectionId(null)
    setNewText('')
    setNewHint('')
    setNewQPositionIds([])
    setSaving(null)
  }

  async function deleteCustomQuestion(sectionId: string, questionId: string) {
    await fetch('/api/consultant/case-custom-questions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, questionId }),
    })
    setCustomBySection(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter(q => q.id !== questionId),
    }))
  }

  async function saveCustomEdit(sectionId: string, q: CustomQuestion) {
    setSaving(q.id)
    const res = await fetch('/api/consultant/case-custom-questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, questionId: q.id, text: editCustomText, jobPositionIds: editCustomPositionIds }),
    })
    const data = await res.json()
    if (data.question) {
      setCustomBySection(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] ?? []).map(x => x.id === q.id ? { ...x, ...data.question, is_custom: true, job_position_ids: data.question.job_position_ids ?? [] } : x),
      }))
    }
    setSaving(null)
    setEditCustomId(null)
  }

  async function toggleCustomQuestion(sectionId: string, q: CustomQuestion) {
    const newActive = !q.is_active
    await fetch('/api/consultant/case-custom-questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, questionId: q.id, isActive: newActive }),
    })
    setCustomBySection(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).map(x => x.id === q.id ? { ...x, is_active: newActive } : x),
    }))
  }

  // Contadores para sidebar
  const stats = modules.map(m => {
    const allQ = m.sections.flatMap(s => s.questions)
    const custom = m.sections.flatMap(s => customBySection[s.id] ?? [])
    const active = allQ.filter(q => isActive(q)).length + custom.filter(q => q.is_active).length
    const total = allQ.length + custom.length
    const modified = allQ.filter(q => isCustomText(q)).length
    return { code: m.code, total, active, modified }
  })

  // Mapeo pregunta → puesto (catálogo de puestos del caso, sección 7 del PRD).
  // Único mecanismo de filtro que usa Nova — el enum de roles anterior se retiró.
  function PositionToggle({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
    if (positions.length === 0) {
      return (
        <p className="text-xs text-amber-600 mt-2">
          No hay puestos creados para este caso todavía — agrega uno arriba en "Puestos" antes de mapear preguntas.
        </p>
      )
    }
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {positions.map(p => {
          const sel = selected.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(sel ? selected.filter(x => x !== p.id) : [...selected, p.id])}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                sel ? 'bg-emerald-600 text-white border-emerald-600' : 'border-subtle text-muted hover:border-emerald-400'
              }`}
            >
              {p.name}
            </button>
          )
        })}
      </div>
    )
  }

  function PositionBadges({ ids }: { ids: string[] }) {
    if (ids.length === 0) {
      return <span className="text-xs text-amber-600">⚠ Sin puesto mapeado — oculta para todos</span>
    }
    return (
      <>
        {ids.map(pid => {
          const pos = positions.find(p => p.id === pid)
          return pos ? (
            <span key={pid} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{pos.name}</span>
          ) : null
        })}
      </>
    )
  }

  return (
    <AppShell role={role} email={email ?? ''}>
      <div className="max-w-5xl mx-auto space-y-4">

        <div>
          <Link href={(backHref ?? `/dashboard/caso/${caseId}?tab=diagnostico`) as any} className="text-xs text-muted hover:text-ink mb-1 inline-block">
            ← {companyName}
          </Link>
          {role === 'super_admin' && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block ml-2">
              Modo soporte — editando el caso de otro consultor
            </p>
          )}
          <h1 className="text-xl font-bold text-ink">Plan de Diagnóstico</h1>
          <p className="text-sm text-muted">Activa/desactiva preguntas, edita su texto, mapea puestos o agrega preguntas propias</p>
        </div>

        {/* Puestos del caso — catálogo específico de esta empresa (sección 7 del PRD) */}
        <div className="card p-5 space-y-3">
          <button onClick={() => setShowPositions(v => !v)} className="w-full flex items-center justify-between text-left">
            <div>
              <h2 className="text-sm font-semibold text-ink">Puestos de {companyName}</h2>
              <p className="text-xs text-muted">
                {positions.length === 0
                  ? 'Sin puestos creados todavía — las preguntas sin puesto mapeado no se le muestran a nadie'
                  : `${positions.length} puesto${positions.length !== 1 ? 's' : ''} creado${positions.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <span className="text-xs text-muted">{showPositions ? '▲ Ocultar' : '▼ Mostrar'}</span>
          </button>

          {showPositions && (
            <div className="space-y-3 pt-2 border-t border-subtle">
              {positions.map(p => (
                <div key={p.id} className="rounded-xl border border-subtle p-3">
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
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">

          {/* Sidebar módulos */}
          <div className="card p-3 space-y-1 self-start">
            {modules.map(m => {
              const st = stats.find(s => s.code === m.code)!
              return (
                <button
                  key={m.code}
                  onClick={() => setActiveModule(m.code)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                    activeModule === m.code ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.code}</span>
                    <span className="text-xs text-muted">{st.active}/{st.total}</span>
                  </div>
                  <p className="text-xs text-muted truncate">{m.name}</p>
                  {st.modified > 0 && <p className="text-xs text-amber-600 mt-0.5">✎ {st.modified} modificadas</p>}
                </button>
              )
            })}
          </div>

          {/* Panel preguntas */}
          <div className="space-y-4">
            {mod.sections.map(sec => {
              const customQs = customBySection[sec.id] ?? []
              const totalSec = sec.questions.length + customQs.length
              const activeSec = sec.questions.filter(q => isActive(q)).length + customQs.filter(q => q.is_active).length
              const isAddingHere = addingSectionId === sec.id

              return (
                <div key={sec.id} className="card p-5 space-y-3">

                  {/* Header de sección */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-faint bg-surface-2 px-2 py-0.5 rounded">{sec.code}</span>
                    <h3 className="text-sm font-semibold text-ink flex-1">{sec.name}</h3>
                    <span className="text-xs text-muted">{activeSec}/{totalSec}</span>
                  </div>

                  {/* Preguntas del catálogo */}
                  <div className="space-y-2">
                    {sec.questions.map((q, qi) => {
                      const active = isActive(q)
                      const text = displayText(q)
                      const isEditing = editId === q.id
                      const modified = isCustomText(q)

                      return (
                        <div key={q.id} className={`rounded-xl border p-3 transition-all ${active ? 'border-subtle bg-surface' : 'border-subtle bg-surface-2 opacity-50'}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xs text-faint font-mono mt-1 flex-shrink-0 w-5">{qi + 1}</span>

                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs text-muted mb-1 font-medium">Texto de la pregunta</p>
                                    <textarea
                                      value={editText}
                                      onChange={e => setEditText(e.target.value)}
                                      rows={3}
                                      className="input-field resize-none text-sm w-full"
                                      autoFocus
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted mb-1 font-medium">Puestos que responden esta pregunta</p>
                                    <PositionToggle selected={editPositionIds} onChange={setEditPositionIds} />
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => saveEdit(q)} disabled={saving === q.id} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                                      {saving === q.id ? 'Guardando…' : 'Guardar cambios'}
                                    </button>
                                    <button onClick={() => setEditId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                                    {modified && (
                                      <button onClick={() => resetOverride(q)} className="text-xs text-amber-600 hover:underline">
                                        Restaurar original
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className={`text-sm leading-relaxed ${modified ? 'text-amber-800' : 'text-ink'}`}>{text}</p>
                                  {modified && <p className="text-xs text-amber-600 mt-0.5">✎ Modificada para este caso</p>}
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    <PositionBadges ids={mappedPositionIds(q)} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {!isEditing && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEdit(q)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-subtle hover:bg-surface-2 text-muted hover:text-ink transition-colors"
                                  title="Editar texto y puestos"
                                >
                                  ✎ Editar
                                </button>
                                <button
                                  onClick={() => toggleQuestion(q)}
                                  disabled={saving === q.id}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                                    active
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      : 'border-subtle text-faint hover:bg-surface-2'
                                  }`}
                                  title={active ? 'Desactivar — Nova no hará esta pregunta' : 'Activar'}
                                >
                                  {saving === q.id ? '…' : active ? '✓ Activa' : '○ Inactiva'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Preguntas custom del consultor */}
                    {customQs.map((q, qi) => {
                      const isEditingCustom = editCustomId === q.id
                      return (
                        <div key={q.id} className={`rounded-xl border-2 border-dashed p-3 transition-all ${q.is_active ? 'border-accent/30 bg-accent-soft/30' : 'border-subtle bg-surface-2 opacity-50'}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xs text-accent font-mono mt-1 flex-shrink-0 w-5">+{sec.questions.length + qi + 1}</span>

                            <div className="flex-1 min-w-0">
                              {isEditingCustom ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editCustomText}
                                    onChange={e => setEditCustomText(e.target.value)}
                                    rows={3}
                                    className="input-field resize-none text-sm w-full"
                                    autoFocus
                                  />
                                  <div>
                                    <p className="text-xs text-muted mb-1 font-medium">Puestos que responden esta pregunta</p>
                                    <PositionToggle selected={editCustomPositionIds} onChange={setEditCustomPositionIds} />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => saveCustomEdit(sec.id, q)} disabled={saving === q.id} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                                      {saving === q.id ? 'Guardando…' : 'Guardar'}
                                    </button>
                                    <button onClick={() => setEditCustomId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-ink leading-relaxed">{q.text}</p>
                                  <p className="text-xs text-accent mt-0.5">Pregunta personalizada</p>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    <PositionBadges ids={q.job_position_ids ?? []} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {!isEditingCustom && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => { setEditCustomId(q.id); setEditCustomText(q.text); setEditCustomPositionIds(q.job_position_ids ?? []) }}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-subtle hover:bg-surface-2 text-muted hover:text-ink transition-colors"
                                >
                                  ✎ Editar
                                </button>
                                <button
                                  onClick={() => toggleCustomQuestion(sec.id, q)}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                    q.is_active
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      : 'border-subtle text-faint hover:bg-surface-2'
                                  }`}
                                >
                                  {q.is_active ? '✓ Activa' : '○ Inactiva'}
                                </button>
                                <button
                                  onClick={() => deleteCustomQuestion(sec.id, q.id)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                  title="Eliminar esta pregunta"
                                >
                                  🗑
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Formulario para agregar pregunta custom */}
                  {isAddingHere ? (
                    <div className="border-2 border-dashed border-accent/30 rounded-xl p-4 space-y-3 bg-accent-soft/20">
                      <p className="text-xs font-semibold text-accent">Nueva pregunta para esta sección</p>
                      <textarea
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        placeholder="Escribe la pregunta que Nova hará..."
                        rows={2}
                        className="input-field resize-none text-sm w-full"
                        autoFocus
                      />
                      <input
                        value={newHint}
                        onChange={e => setNewHint(e.target.value)}
                        placeholder="Contexto interno para Nova (opcional)"
                        className="input-field text-xs w-full"
                      />
                      <div>
                        <p className="text-xs text-muted mb-1.5 font-medium">Puestos que responden esta pregunta</p>
                        <PositionToggle selected={newQPositionIds} onChange={setNewQPositionIds} />
                      </div>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => addCustomQuestion(sec.id)}
                          disabled={!newText.trim() || saving === 'new-' + sec.id}
                          className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
                        >
                          {saving === 'new-' + sec.id ? 'Guardando…' : 'Agregar pregunta'}
                        </button>
                        <button
                          onClick={() => { setAddingSectionId(null); setNewText(''); setNewHint(''); setNewQPositionIds([]) }}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingSectionId(sec.id); setNewText(''); setNewHint(''); setNewQPositionIds([]) }}
                      className="w-full py-2 border-2 border-dashed border-subtle rounded-xl text-xs text-muted hover:border-accent/40 hover:text-accent transition-colors"
                    >
                      + Agregar pregunta a esta sección
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
