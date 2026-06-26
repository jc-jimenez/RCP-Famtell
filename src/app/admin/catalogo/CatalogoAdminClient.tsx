'use client'

import { useState } from 'react'

const ROLE_OPTIONS = [
  { id: 'director_general',   label: 'Director General' },
  { id: 'gerente_comercial',  label: 'Gerente Comercial' },
  { id: 'gerente_operativo',  label: 'Gerente Operativo' },
  { id: 'cfo_contador',       label: 'CFO / Contador' },
  { id: 'rrhh_admin',         label: 'RRHH / Admin' },
  { id: 'gerente_marketing',  label: 'Gerente Marketing' },
]

type Question = {
  id: string; text: string; nova_hint: string | null
  sort_order: number; suggested_roles: string[]; response_type: string; is_active: boolean
}
type Section = {
  id: string; code: string; name: string; sort_order: number
  suggested_roles: string[]; questions: Question[]
}
type Module = {
  id: string; code: string; name: string; sort_order: number; is_active: boolean; sections: Section[]
}

export default function CatalogoAdminClient({ initialModules }: { initialModules: Module[] }) {
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [activeModule, setActiveModule] = useState<string>(initialModules[0]?.code ?? '')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<null | 'section' | 'question'>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState<any>({})

  const mod = modules.find(m => m.code === activeModule)!
  const sec = mod?.sections.find(s => s.id === activeSection) ?? null

  // ── API helpers ─────────────────────────────────────────────

  async function apiSection(method: string, body: any) {
    const res = await fetch('/api/admin/catalogo/sections', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return res.json()
  }

  async function apiQuestion(method: string, body: any) {
    const res = await fetch('/api/admin/catalogo/questions', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return res.json()
  }

  // ── Sections ────────────────────────────────────────────────

  function openNewSection() {
    setEditTarget(null)
    setForm({ code: '', name: '', description: '', suggested_roles: [] })
    setModal('section')
  }

  function openEditSection(s: Section) {
    setEditTarget(s)
    setForm({ code: s.code, name: s.name, suggested_roles: [...s.suggested_roles] })
    setModal('section')
  }

  async function saveSection() {
    setSaving(true)
    if (editTarget) {
      const data = await apiSection('PATCH', { id: editTarget.id, name: form.name, suggested_roles: form.suggested_roles })
      setModules(ms => ms.map(m => m.code === activeModule
        ? { ...m, sections: m.sections.map(s => s.id === data.id ? { ...s, ...data, questions: s.questions } : s) }
        : m))
    } else {
      const maxOrder = Math.max(0, ...mod.sections.map(s => s.sort_order)) + 1
      const data = await apiSection('POST', {
        module_template_id: mod.id, code: form.code, name: form.name,
        description: form.description, sort_order: maxOrder, suggested_roles: form.suggested_roles,
      })
      setModules(ms => ms.map(m => m.code === activeModule
        ? { ...m, sections: [...m.sections, { ...data, questions: [] }] }
        : m))
    }
    setSaving(false)
    setModal(null)
  }

  async function deleteSection(s: Section) {
    if (!confirm(`¿Eliminar sección "${s.name}" y todas sus preguntas?`)) return
    await apiSection('DELETE', { id: s.id })
    setModules(ms => ms.map(m => m.code === activeModule
      ? { ...m, sections: m.sections.filter(x => x.id !== s.id) }
      : m))
    if (activeSection === s.id) setActiveSection(null)
  }

  // ── Questions ───────────────────────────────────────────────

  function openNewQuestion() {
    if (!sec) return
    setEditTarget(null)
    setForm({ text: '', nova_hint: '', suggested_roles: [...sec.suggested_roles], response_type: 'text' })
    setModal('question')
  }

  function openEditQuestion(q: Question) {
    setEditTarget(q)
    setForm({ text: q.text, nova_hint: q.nova_hint ?? '', suggested_roles: [...q.suggested_roles], response_type: q.response_type })
    setModal('question')
  }

  async function saveQuestion() {
    if (!sec) return
    setSaving(true)
    if (editTarget) {
      const data = await apiQuestion('PATCH', { id: editTarget.id, text: form.text, nova_hint: form.nova_hint || null, suggested_roles: form.suggested_roles, response_type: form.response_type })
      setModules(ms => ms.map(m => ({
        ...m, sections: m.sections.map(s => s.id === sec.id
          ? { ...s, questions: s.questions.map(q => q.id === data.id ? data : q) }
          : s)
      })))
    } else {
      const maxOrder = Math.max(0, ...sec.questions.map(q => q.sort_order)) + 1
      const data = await apiQuestion('POST', {
        section_id: sec.id, text: form.text, nova_hint: form.nova_hint || null,
        sort_order: maxOrder, suggested_roles: form.suggested_roles, response_type: form.response_type,
      })
      setModules(ms => ms.map(m => ({
        ...m, sections: m.sections.map(s => s.id === sec.id
          ? { ...s, questions: [...s.questions, data] }
          : s)
      })))
    }
    setSaving(false)
    setModal(null)
  }

  async function toggleQuestion(q: Question) {
    const data = await apiQuestion('PATCH', { id: q.id, is_active: !q.is_active })
    setModules(ms => ms.map(m => ({
      ...m, sections: m.sections.map(s => ({
        ...s, questions: s.questions.map(x => x.id === data.id ? data : x)
      }))
    })))
  }

  async function deleteQuestion(q: Question) {
    if (!confirm('¿Eliminar esta pregunta?')) return
    await apiQuestion('DELETE', { id: q.id })
    setModules(ms => ms.map(m => ({
      ...m, sections: m.sections.map(s => ({
        ...s, questions: s.questions.filter(x => x.id !== q.id)
      }))
    })))
  }

  function toggleRole(role: string) {
    setForm((f: any) => ({
      ...f,
      suggested_roles: f.suggested_roles.includes(role)
        ? f.suggested_roles.filter((r: string) => r !== role)
        : [...f.suggested_roles, role],
    }))
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Catálogo de Diagnóstico</h1>
        <p className="text-sm text-muted">Módulos, secciones y preguntas que Nova usa como guion</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_260px_1fr]">

        {/* Col 1: módulos */}
        <div className="card p-3 space-y-1 self-start">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider px-2 pb-1">Módulos</p>
          {modules.map(m => (
            <button
              key={m.code}
              onClick={() => { setActiveModule(m.code); setActiveSection(null) }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                activeModule === m.code ? 'bg-accent-soft text-accent font-semibold' : 'text-ink hover:bg-surface-2'
              }`}
            >
              <span className="font-mono text-xs text-faint mr-2">{m.code}</span>{m.name}
            </button>
          ))}
        </div>

        {/* Col 2: secciones */}
        <div className="card p-3 space-y-1 self-start">
          <div className="flex items-center justify-between px-2 pb-1">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Secciones</p>
            <button onClick={openNewSection} className="text-xs text-accent hover:underline">+ Nueva</button>
          </div>
          {mod?.sections.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                activeSection === s.id ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-faint">{s.code}</p>
                <p className="text-sm truncate">{s.name}</p>
                <p className="text-xs text-faint">{s.questions.length} preguntas</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                <button onClick={e => { e.stopPropagation(); openEditSection(s) }} className="text-xs text-muted hover:text-ink">✎</button>
                <button onClick={e => { e.stopPropagation(); deleteSection(s) }} className="text-xs text-muted hover:text-red-600">✕</button>
              </div>
            </div>
          ))}
          {mod?.sections.length === 0 && (
            <p className="text-xs text-faint px-3 py-2">Sin secciones</p>
          )}
        </div>

        {/* Col 3: preguntas */}
        <div className="space-y-3">
          {sec ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{sec.code} — {sec.name}</p>
                  <p className="text-xs text-muted">{sec.questions.length} preguntas</p>
                </div>
                <button onClick={openNewQuestion} className="btn-primary text-xs px-3 py-1.5">+ Pregunta</button>
              </div>

              <div className="space-y-2">
                {sec.questions.map((q, qi) => (
                  <div key={q.id} className={`card p-4 space-y-2 ${!q.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-faint font-mono mt-0.5 flex-shrink-0">{qi + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink">{q.text}</p>
                        {q.nova_hint && (
                          <p className="text-xs text-muted mt-1 line-clamp-2 italic">{q.nova_hint.slice(0, 120)}…</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {q.suggested_roles.map(r => (
                            <span key={r} className="badge text-xs">{ROLE_OPTIONS.find(x => x.id === r)?.label ?? r}</span>
                          ))}
                          <span className={`badge text-xs ${q.response_type === 'text' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'}`}>
                            {q.response_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => toggleQuestion(q)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${q.is_active ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-subtle text-faint hover:bg-surface-2'}`}>
                          {q.is_active ? 'Activa' : 'Inactiva'}
                        </button>
                        <button onClick={() => openEditQuestion(q)} className="text-xs px-2 py-1 rounded-lg border border-subtle hover:bg-surface-2 text-muted">✎</button>
                        <button onClick={() => deleteQuestion(q)} className="text-xs px-2 py-1 rounded-lg border border-subtle hover:bg-red-50 hover:border-red-200 text-muted hover:text-red-600">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
                {sec.questions.length === 0 && (
                  <div className="card p-8 text-center">
                    <p className="text-faint text-sm">Sin preguntas en esta sección</p>
                    <button onClick={openNewQuestion} className="mt-3 btn-primary text-xs">+ Agregar primera pregunta</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-10 text-center">
              <p className="text-faint text-sm">Selecciona una sección para ver sus preguntas</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal sección */}
      {modal === 'section' && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-ink">{editTarget ? 'Editar sección' : 'Nueva sección'}</h3>

            {!editTarget && (
              <div>
                <label className="label-text">Código (ej: 1.6)</label>
                <input value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} className="input-field" placeholder="1.6" />
              </div>
            )}
            <div>
              <label className="label-text">Nombre</label>
              <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Nombre de la sección" />
            </div>
            <div>
              <label className="label-text">Roles sugeridos</label>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {ROLE_OPTIONS.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface-2">
                    <input type="checkbox" checked={form.suggested_roles?.includes(r.id)} onChange={() => toggleRole(r.id)} />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={saveSection} disabled={saving || !form.name || (!editTarget && !form.code)} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pregunta */}
      {modal === 'question' && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-ink">{editTarget ? 'Editar pregunta' : 'Nueva pregunta'}</h3>

            <div>
              <label className="label-text">Texto de la pregunta *</label>
              <textarea value={form.text} onChange={e => setForm((f: any) => ({ ...f, text: e.target.value }))} rows={3} className="input-field resize-none" placeholder="¿Cuál es…?" />
            </div>
            <div>
              <label className="label-text">Orientación para Nova (nova_hint) <span className="text-faint font-normal">— confidencial, no se muestra al usuario</span></label>
              <textarea value={form.nova_hint} onChange={e => setForm((f: any) => ({ ...f, nova_hint: e.target.value }))} rows={4} className="input-field resize-none text-xs" placeholder="Contexto interno para que Nova profundice o detecte señales…" />
            </div>
            <div>
              <label className="label-text">Tipo de respuesta</label>
              <select value={form.response_type} onChange={e => setForm((f: any) => ({ ...f, response_type: e.target.value }))} className="input-field">
                <option value="text">Texto libre</option>
                <option value="number">Número</option>
                <option value="scale">Escala (1-5)</option>
                <option value="file">Archivo / documento</option>
              </select>
            </div>
            <div>
              <label className="label-text">Roles sugeridos</label>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {ROLE_OPTIONS.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface-2">
                    <input type="checkbox" checked={form.suggested_roles?.includes(r.id)} onChange={() => toggleRole(r.id)} />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={saveQuestion} disabled={saving || !form.text} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
