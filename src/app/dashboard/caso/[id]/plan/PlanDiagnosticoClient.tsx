'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

const ROLE_LABEL: Record<string, string> = {
  director_general:  'Director General',
  gerente_comercial: 'Gerente Comercial',
  gerente_operativo: 'Gerente Operativo',
  cfo_contador:      'CFO / Contador',
  rrhh_admin:        'RRHH / Admin',
  gerente_marketing: 'Gerente Marketing',
}

type Override = { is_active: boolean; custom_text: string | null }
type Question = { id: string; text: string; nova_hint: string | null; suggested_roles: string[]; is_active: boolean }
type Section  = { id: string; code: string; name: string; suggested_roles: string[]; questions: Question[] }
type Module   = { id: string; code: string; name: string; sections: Section[] }

interface Props {
  caseId: string
  companyName: string
  modules: Module[]
  initialOverrides: Record<string, Override>
}

export default function PlanDiagnosticoClient({ caseId, companyName, modules, initialOverrides }: Props) {
  const { email } = useSupabaseUser()
  const [overrides, setOverrides] = useState<Record<string, Override>>(initialOverrides)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeModule, setActiveModule] = useState(modules[0]?.code ?? '')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const mod = modules.find(m => m.code === activeModule)!

  function isActive(q: Question): boolean {
    if (overrides[q.id] !== undefined) return overrides[q.id].is_active
    return q.is_active
  }

  function displayText(q: Question): string {
    return overrides[q.id]?.custom_text ?? q.text
  }

  async function toggleQuestion(q: Question) {
    const newActive = !isActive(q)
    setSaving(q.id)
    await fetch('/api/consultant/case-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, questionId: q.id, isActive: newActive, customText: overrides[q.id]?.custom_text ?? null }),
    })
    setOverrides(prev => ({ ...prev, [q.id]: { is_active: newActive, custom_text: prev[q.id]?.custom_text ?? null } }))
    setSaving(null)
  }

  async function saveCustomText(q: Question) {
    setSaving(q.id)
    await fetch('/api/consultant/case-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, questionId: q.id, isActive: isActive(q), customText: editText || null }),
    })
    setOverrides(prev => ({ ...prev, [q.id]: { is_active: isActive(q), custom_text: editText || null } }))
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
  }

  // Contadores por módulo
  const stats = modules.map(m => {
    const allQ = m.sections.flatMap(s => s.questions)
    const active = allQ.filter(q => isActive(q)).length
    const custom = allQ.filter(q => overrides[q.id]?.custom_text).length
    return { code: m.code, total: allQ.length, active, custom }
  })

  return (
    <AppShell role="consultant" email={email ?? ''}>
      <div className="max-w-5xl mx-auto space-y-4">

        <div>
          <Link href={`/dashboard/caso/${caseId}?tab=diagnostico` as any} className="text-xs text-muted hover:text-ink mb-1 inline-block">
            ← {companyName}
          </Link>
          <h1 className="text-xl font-bold text-ink">Plan de Diagnóstico</h1>
          <p className="text-sm text-muted">Personaliza las preguntas que Nova hará en cada módulo para este caso</p>
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
                  {st.custom > 0 && <p className="text-xs text-amber-600 mt-0.5">✎ {st.custom} personalizadas</p>}
                </button>
              )
            })}
          </div>

          {/* Panel preguntas */}
          <div className="space-y-4">
            {mod.sections.map(sec => (
              <div key={sec.id} className="card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-faint bg-surface-2 px-2 py-0.5 rounded">{sec.code}</span>
                  <h3 className="text-sm font-semibold text-ink">{sec.name}</h3>
                  {sec.suggested_roles.length > 0 && (
                    <div className="ml-auto flex flex-wrap gap-1">
                      {sec.suggested_roles.map(r => (
                        <span key={r} className="badge text-xs">{ROLE_LABEL[r] ?? r}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {sec.questions.map((q, qi) => {
                    const active = isActive(q)
                    const text = displayText(q)
                    const isCustom = !!overrides[q.id]?.custom_text
                    const isEditing = editId === q.id

                    return (
                      <div key={q.id} className={`rounded-xl border p-3 transition-opacity ${active ? 'border-subtle bg-surface' : 'border-subtle bg-surface-2 opacity-50'}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-faint font-mono mt-1 flex-shrink-0 w-5">{qi + 1}</span>

                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  rows={3}
                                  className="input-field resize-none text-sm w-full"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => saveCustomText(q)} disabled={saving === q.id} className="btn-primary text-xs px-3 py-1 disabled:opacity-50">
                                    {saving === q.id ? 'Guardando…' : 'Guardar'}
                                  </button>
                                  <button onClick={() => setEditId(null)} className="btn-secondary text-xs px-3 py-1">Cancelar</button>
                                  {isCustom && (
                                    <button onClick={() => { resetOverride(q); setEditId(null) }} className="text-xs text-amber-600 hover:underline">
                                      Restaurar original
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className={`text-sm ${isCustom ? 'text-amber-800' : 'text-ink'}`}>{text}</p>
                                {isCustom && <p className="text-xs text-amber-600 mt-0.5">✎ Personalizada</p>}
                                {q.suggested_roles.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {q.suggested_roles.map(r => (
                                      <span key={r} className="text-xs bg-surface-2 text-muted px-1.5 py-0.5 rounded">{ROLE_LABEL[r] ?? r}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => { setEditId(q.id); setEditText(text) }}
                                className="text-xs px-2 py-1 rounded-lg border border-subtle hover:bg-surface-2 text-muted"
                                title="Editar pregunta para este caso"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => toggleQuestion(q)}
                                disabled={saving === q.id}
                                className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                                  active
                                    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    : 'border-subtle text-faint hover:bg-surface-2'
                                }`}
                                title={active ? 'Desactivar esta pregunta' : 'Activar esta pregunta'}
                              >
                                {saving === q.id ? '…' : active ? '✓' : '○'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
