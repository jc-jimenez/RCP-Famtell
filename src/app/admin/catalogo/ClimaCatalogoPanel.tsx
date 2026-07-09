'use client'

import { useEffect, useState } from 'react'

type QuestionType = 'open' | 'number' | 'scale_1_5' | 'choice' | 'choice_text'

interface ClimateQuestion {
  id: string
  key: string
  label: string
  type: QuestionType
  options: string[] | null
  min_label: string | null
  max_label: string | null
  sort_order: number
}

const TYPE_LABEL: Record<QuestionType, string> = {
  open: 'Respuesta libre',
  number: 'Numérica',
  scale_1_5: 'Escala 1-5',
  choice: 'Opción única',
  choice_text: 'Sí / No',
}

export default function ClimaCatalogoPanel() {
  const [questions, setQuestions] = useState<ClimateQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<QuestionType>('open')
  const [newOptions, setNewOptions] = useState('')
  const [newMinLabel, setNewMinLabel] = useState('')
  const [newMaxLabel, setNewMaxLabel] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const [suggesting, setSuggesting] = useState(false)
  const [suggestFocus, setSuggestFocus] = useState('')
  const [proposals, setProposals] = useState<any[]>([])
  const [suggestError, setSuggestError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/clima-catalogo')
    const data = await res.json()
    setQuestions(data.questions ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function needsOptions(type: QuestionType) {
    return type === 'choice' || type === 'choice_text'
  }

  async function addQuestion() {
    if (!newLabel.trim()) return
    setBusy(true)
    const res = await fetch('/api/admin/clima-catalogo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: newLabel,
        type: newType,
        options: needsOptions(newType) ? newOptions.split(',').map(o => o.trim()).filter(Boolean) : null,
        minLabel: newType === 'scale_1_5' ? newMinLabel : null,
        maxLabel: newType === 'scale_1_5' ? newMaxLabel : null,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Error'); return }
    setQuestions(prev => [...prev, data.question])
    setNewLabel(''); setNewOptions(''); setNewMinLabel(''); setNewMaxLabel(''); setNewType('open')
  }

  function startEdit(q: ClimateQuestion) {
    setEditingId(q.id)
    setEditLabel(q.label)
  }

  async function saveEdit() {
    if (!editingId || !editLabel.trim()) return
    setBusy(true)
    const res = await fetch('/api/admin/clima-catalogo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, label: editLabel }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Error'); return }
    setQuestions(prev => prev.map(q => q.id === editingId ? data.question : q))
    setEditingId(null)
  }

  async function deleteQuestion(q: ClimateQuestion) {
    if (!confirm(`¿Quitar "${q.label}" del banco de Clima Laboral?`)) return
    setBusy(true)
    const res = await fetch(`/api/admin/clima-catalogo?id=${q.id}`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) { alert('Error al borrar'); return }
    setQuestions(prev => prev.filter(x => x.id !== q.id))
  }

  async function suggest() {
    setSuggesting(true)
    setSuggestError(null)
    setProposals([])
    const res = await fetch('/api/admin/clima-catalogo/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focus: suggestFocus }),
    })
    const data = await res.json()
    setSuggesting(false)
    if (!res.ok) { setSuggestError(data.error ?? 'No se pudo generar la propuesta'); return }
    setProposals(data.questions ?? [])
  }

  async function acceptProposal(p: any) {
    setBusy(true)
    const res = await fetch('/api/admin/clima-catalogo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: p.label, type: p.type, options: p.options ?? null, minLabel: p.minLabel ?? null, maxLabel: p.maxLabel ?? null }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Error'); return }
    setQuestions(prev => [...prev, data.question])
    setProposals(prev => prev.filter(x => x !== p))
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-bold text-ink">Clima Laboral — banco de preguntas</h2>
        <p className="text-sm text-muted mt-0.5">
          Preguntas base de la encuesta anónima de Clima Laboral. Cada caso nuevo se siembra con este banco al crear su encuesta —
          editar aquí no cambia encuestas ya creadas.
        </p>
      </div>

      {/* Proponer con IA */}
      <div className="card p-4 space-y-3 border-accent/20">
        <h3 className="text-sm font-semibold text-ink">✨ Proponer preguntas con IA</h3>
        <div className="flex gap-2">
          <input
            value={suggestFocus}
            onChange={e => setSuggestFocus(e.target.value)}
            placeholder="Enfoque opcional (ej. seguridad, liderazgo, carga de trabajo)"
            className="input-field text-sm flex-1"
          />
          <button onClick={suggest} disabled={suggesting} className="btn-primary text-sm px-4 disabled:opacity-50">
            {suggesting ? 'Pensando…' : 'Proponer'}
          </button>
        </div>
        {suggestError && <p className="text-xs text-red-600">{suggestError}</p>}
        {proposals.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-subtle">
            {proposals.map((p, i) => (
              <div key={i} className="flex items-start justify-between gap-3 bg-surface-2 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{p.label}</p>
                  <span className="text-xs text-faint">{TYPE_LABEL[p.type as QuestionType] ?? p.type}</span>
                </div>
                <button onClick={() => acceptProposal(p)} disabled={busy} className="text-xs px-2.5 py-1 rounded-lg border border-accent text-accent hover:bg-accent-soft flex-shrink-0 disabled:opacity-50">
                  + Agregar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card p-10 text-center text-sm text-muted">Cargando…</div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="card p-4">
              {editingId === q.id ? (
                <div className="space-y-2">
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="input-field text-sm w-full" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={busy} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink"><span className="text-faint font-mono text-xs mr-1.5">{i + 1}.</span>{q.label}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-muted mt-1 inline-block">{TYPE_LABEL[q.type]}</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => startEdit(q)} className="text-xs px-2.5 py-1 rounded-lg border border-subtle text-muted hover:bg-surface-2">Editar</button>
                    <button onClick={() => deleteQuestion(q)} disabled={busy} className="text-xs px-2.5 py-1 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50">Quitar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alta manual */}
      <div className="card p-4 space-y-2">
        <h3 className="text-sm font-semibold text-ink">Nueva pregunta manual</h3>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Texto de la pregunta" className="input-field text-sm w-full" />
        <select value={newType} onChange={e => setNewType(e.target.value as QuestionType)} className="input-field text-sm w-full">
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {needsOptions(newType) && (
          <input value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="Opciones separadas por coma (ej. Sí, No)" className="input-field text-sm w-full" />
        )}
        {newType === 'scale_1_5' && (
          <div className="grid grid-cols-2 gap-2">
            <input value={newMinLabel} onChange={e => setNewMinLabel(e.target.value)} placeholder="Etiqueta mínima (ej. Muy mala)" className="input-field text-sm w-full" />
            <input value={newMaxLabel} onChange={e => setNewMaxLabel(e.target.value)} placeholder="Etiqueta máxima (ej. Excelente)" className="input-field text-sm w-full" />
          </div>
        )}
        <button onClick={addQuestion} disabled={busy || !newLabel.trim()} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
          + Agregar pregunta
        </button>
      </div>
    </div>
  )
}
