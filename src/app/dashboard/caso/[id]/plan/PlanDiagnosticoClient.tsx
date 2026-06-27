'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

const ALL_ROLES: { id: string; label: string }[] = [
  { id: 'director_general',  label: 'Director General' },
  { id: 'gerente_comercial', label: 'Gerente Comercial' },
  { id: 'gerente_operativo', label: 'Gerente Operativo' },
  { id: 'cfo_contador',      label: 'CFO / Contador' },
  { id: 'rrhh_admin',        label: 'RRHH / Admin' },
  { id: 'gerente_marketing', label: 'Gerente Marketing' },
]

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ALL_ROLES.map(r => [r.id, r.label]))

type Override = { is_active: boolean; custom_text: string | null; roles_override: string[] | null }
type Question = { id: string; text: string; nova_hint: string | null; suggested_roles: string[]; is_active: boolean }
type CustomQuestion = { id: string; section_id: string; text: string; nova_hint: string | null; suggested_roles: string[]; is_active: boolean; is_custom: true }
type Section  = { id: string; code: string; name: string; suggested_roles: string[]; questions: Question[] }
type Module   = { id: string; code: string; name: string; sections: Section[] }

interface Props {
  caseId: string
  companyName: string
  modules: Module[]
  initialOverrides: Record<string, Override>
  initialCustomBySection: Record<string, any[]>
}

export default function PlanDiagnosticoClient({
  caseId, companyName, modules, initialOverrides, initialCustomBySection,
}: Props) {
  const { email } = useSupabaseUser()
  const [overrides, setOverrides] = useState<Record<string, Override>>(initialOverrides)
  const [customBySection, setCustomBySection] = useState<Record<string, CustomQuestion[]>>(
    Object.fromEntries(
      Object.entries(initialCustomBySection).map(([sid, qs]) => [
        sid, qs.map(q => ({ ...q, is_custom: true as const })),
      ])
    )
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [activeModule, setActiveModule] = useState(modules[0]?.code ?? '')

  // Edición de pregunta del catálogo
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editRoles, setEditRoles] = useState<string[]>([])

  // Agregar pregunta custom
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [newRoles, setNewRoles] = useState<string[]>([])
  const [newHint, setNewHint] = useState('')

  // Edición de pregunta custom
  const [editCustomId, setEditCustomId] = useState<string | null>(null)
  const [editCustomText, setEditCustomText] = useState('')
  const [editCustomRoles, setEditCustomRoles] = useState<string[]>([])

  const mod = modules.find(m => m.code === activeModule)!

  // ── Helpers para preguntas del catálogo ──

  function isActive(q: Question): boolean {
    return overrides[q.id]?.is_active ?? q.is_active
  }

  function displayText(q: Question): string {
    return overrides[q.id]?.custom_text ?? q.text
  }

  function effectiveRoles(q: Question): string[] {
    return overrides[q.id]?.roles_override ?? q.suggested_roles
  }

  function isCustomText(q: Question): boolean {
    return !!overrides[q.id]?.custom_text
  }

  function hasRolesOverride(q: Question): boolean {
    return !!(overrides[q.id]?.roles_override)
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
        rolesOverride: overrides[q.id]?.roles_override ?? undefined,
      }),
    })
    setOverrides(prev => ({
      ...prev,
      [q.id]: { ...prev[q.id], is_active: newActive, custom_text: prev[q.id]?.custom_text ?? null, roles_override: prev[q.id]?.roles_override ?? null },
    }))
    setSaving(null)
  }

  function startEdit(q: Question) {
    setEditId(q.id)
    setEditText(displayText(q))
    setEditRoles(effectiveRoles(q))
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
        rolesOverride: JSON.stringify(editRoles) !== JSON.stringify(q.suggested_roles) ? editRoles : null,
      }),
    })
    setOverrides(prev => ({
      ...prev,
      [q.id]: {
        is_active: isActive(q),
        custom_text: editText !== q.text ? editText : null,
        roles_override: JSON.stringify(editRoles) !== JSON.stringify(q.suggested_roles) ? editRoles : null,
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
      body: JSON.stringify({ caseId, sectionId, text: newText, novaHint: newHint || null, suggestedRoles: newRoles }),
    })
    const data = await res.json()
    if (data.question) {
      setCustomBySection(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] ?? []), { ...data.question, is_custom: true }],
      }))
    }
    setAddingSectionId(null)
    setNewText('')
    setNewHint('')
    setNewRoles([])
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
      body: JSON.stringify({ caseId, questionId: q.id, text: editCustomText, suggestedRoles: editCustomRoles }),
    })
    const data = await res.json()
    if (data.question) {
      setCustomBySection(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] ?? []).map(x => x.id === q.id ? { ...x, ...data.question, is_custom: true } : x),
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
    const modified = allQ.filter(q => isCustomText(q) || hasRolesOverride(q)).length
    return { code: m.code, total, active, modified }
  })

  function RoleToggle({ roles, onChange }: { roles: string[]; onChange: (r: string[]) => void }) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {ALL_ROLES.map(r => {
          const sel = roles.includes(r.id)
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(sel ? roles.filter(x => x !== r.id) : [...roles, r.id])}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                sel ? 'bg-accent text-white border-accent' : 'border-subtle text-muted hover:border-accent/40'
              }`}
            >
              {r.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <AppShell role="consultant" email={email ?? ''}>
      <div className="max-w-5xl mx-auto space-y-4">

        <div>
          <Link href={`/dashboard/caso/${caseId}?tab=diagnostico` as any} className="text-xs text-muted hover:text-ink mb-1 inline-block">
            ← {companyName}
          </Link>
          <h1 className="text-xl font-bold text-ink">Plan de Diagnóstico</h1>
          <p className="text-sm text-muted">Activa/desactiva preguntas, edita su texto, cambia roles o agrega preguntas propias</p>
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
                    {sec.suggested_roles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sec.suggested_roles.map(r => (
                          <span key={r} className="badge text-xs">{ROLE_LABEL[r] ?? r}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preguntas del catálogo */}
                  <div className="space-y-2">
                    {sec.questions.map((q, qi) => {
                      const active = isActive(q)
                      const text = displayText(q)
                      const roles = effectiveRoles(q)
                      const isEditing = editId === q.id
                      const modified = isCustomText(q) || hasRolesOverride(q)

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
                                    <p className="text-xs text-muted mb-1 font-medium">Roles que responden esta pregunta</p>
                                    <RoleToggle roles={editRoles} onChange={setEditRoles} />
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
                                    {roles.map(r => (
                                      <span key={r} className="text-xs bg-surface-2 text-muted px-1.5 py-0.5 rounded">{ROLE_LABEL[r] ?? r}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {!isEditing && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEdit(q)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-subtle hover:bg-surface-2 text-muted hover:text-ink transition-colors"
                                  title="Editar texto y roles"
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
                                    <p className="text-xs text-muted mb-1 font-medium">Roles que responden</p>
                                    <RoleToggle roles={editCustomRoles} onChange={setEditCustomRoles} />
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
                                  {q.suggested_roles.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {q.suggested_roles.map(r => (
                                        <span key={r} className="text-xs bg-accent-soft text-accent px-1.5 py-0.5 rounded">{ROLE_LABEL[r] ?? r}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {!isEditingCustom && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => { setEditCustomId(q.id); setEditCustomText(q.text); setEditCustomRoles(q.suggested_roles) }}
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
                        <p className="text-xs text-muted mb-1.5 font-medium">Roles que responden esta pregunta</p>
                        <RoleToggle roles={newRoles} onChange={setNewRoles} />
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
                          onClick={() => { setAddingSectionId(null); setNewText(''); setNewHint(''); setNewRoles([]) }}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingSectionId(sec.id); setNewText(''); setNewHint(''); setNewRoles([]) }}
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
