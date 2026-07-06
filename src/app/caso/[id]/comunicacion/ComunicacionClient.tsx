'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import CasoTabs from '@/components/consultor/CasoTabs'
import type { UserRole } from '@/types'

interface Props {
  caseId: string
  companyName: string
  industry: string
  role: string
  email: string
  initialTemplates: Template[]
}

// ── Plantillas ──────────────────────────────────────────────────────────────
// Ver docs/PRD_RCPFAMTELL3PL.md sección 9.3 — antes hardcoded aquí mismo,
// ahora catálogo editable por cuenta de consultor (communication_templates).

interface Template {
  id: string
  category: string
  label: string
  channel: 'email' | 'whatsapp'
  subject?: string | null
  body: string
  is_active: boolean
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function ComunicacionClient({ caseId, companyName, industry, role, email, initialTemplates }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'
  const isConsultant = role === 'consultant'

  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const activeTemplates = useMemo(() => templates.filter(t => t.is_active), [templates])
  const CATEGORIES = useMemo(() => ['Todos', ...Array.from(new Set(activeTemplates.map(t => t.category)))], [activeTemplates])

  const [category, setCategory] = useState('Todos')
  const [channel, setChannel]   = useState<'all' | 'email' | 'whatsapp'>('all')
  const [selectedId, setSelected] = useState(initialTemplates[0]?.id ?? null)
  const [copied, setCopied]     = useState(false)

  // Gestión del catálogo — solo consultor
  const [showManage, setShowManage] = useState(false)
  const [savingTpl, setSavingTpl] = useState(false)
  const [editTplId, setEditTplId] = useState<string | null>(null)
  const [tplForm, setTplForm] = useState({ category: '', label: '', channel: 'email' as 'email' | 'whatsapp', subject: '', body: '' })

  function resetTplForm() {
    setTplForm({ category: '', label: '', channel: 'email', subject: '', body: '' })
    setEditTplId(null)
  }

  async function createTemplate() {
    if (!tplForm.category.trim() || !tplForm.label.trim() || !tplForm.body.trim()) return
    setSavingTpl(true)
    const res = await fetch('/api/consultant/communication-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tplForm, sortOrder: templates.length }),
    })
    const data = await res.json()
    if (data.template) setTemplates(prev => [...prev, data.template])
    resetTplForm()
    setSavingTpl(false)
  }

  function startEditTemplate(t: Template) {
    setEditTplId(t.id)
    setTplForm({ category: t.category, label: t.label, channel: t.channel, subject: t.subject ?? '', body: t.body })
  }

  async function saveEditTemplate() {
    if (!editTplId) return
    setSavingTpl(true)
    const res = await fetch('/api/consultant/communication-templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: editTplId, ...tplForm }),
    })
    const data = await res.json()
    if (data.template) setTemplates(prev => prev.map(t => t.id === editTplId ? data.template : t))
    resetTplForm()
    setSavingTpl(false)
  }

  async function toggleTemplateActive(t: Template) {
    const res = await fetch('/api/consultant/communication-templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: t.id, isActive: !t.is_active }),
    })
    const data = await res.json()
    if (data.template) setTemplates(prev => prev.map(x => x.id === t.id ? data.template : x))
  }

  async function deleteTemplate(templateId: string) {
    await fetch('/api/consultant/communication-templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    })
    setTemplates(prev => prev.filter(t => t.id !== templateId))
  }

  // Variables del usuario
  const [vars, setVars] = useState({
    nombre:             '',
    empresa_prospecto:  companyName,
    empresa_consultor:  '',
    consultor:          '',
    telefono:           '',
    sector:             industry,
    gancho:             '',
    problema:           '',
    meses:              '6',
    reto_actual:        '',
    accion_previa:      '',
    modulos:            '7',
    objetivo_principal: '',
    plazo:              '3 meses',
    modulo:             'Módulo 2',
    tiempo:             '30',
    link_modulo:        '',
    semana:             '1',
    modulos_completados:'3',
    modulos_pendientes: 'M4, M5, M6, M7',
    siguiente_accion:   'Completar M4 esta semana',
    comentario_consultor: '',
  })

  function setVar(key: string, val: string) {
    setVars(prev => ({ ...prev, [key]: val }))
  }

  const filtered = useMemo(() => activeTemplates.filter(t => {
    if (category !== 'Todos' && t.category !== category) return false
    if (channel !== 'all' && t.channel !== channel) return false
    return true
  }), [activeTemplates, category, channel])

  const selected = activeTemplates.find(t => t.id === selectedId) ?? filtered[0]

  function fillVars(text: string) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key as keyof typeof vars] || `[${key}]`)
  }

  const filledBody    = selected ? fillVars(selected.body) : ''
  const filledSubject = selected?.subject ? fillVars(selected.subject) : ''

  async function copyText() {
    const text = selected?.channel === 'email' && filledSubject
      ? `Asunto: ${filledSubject}\n\n${filledBody}`
      : filledBody
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Detectar variables usadas en la plantilla seleccionada
  const usedVars = useMemo(() => {
    if (!selected) return []
    const matches = new Set<string>()
    const pattern = /\{\{(\w+)\}\}/g
    let m
    const fullText = (selected.subject ?? '') + selected.body
    while ((m = pattern.exec(fullText)) !== null) matches.add(m[1])
    return Array.from(matches)
  }, [selected])

  const VAR_LABELS: Record<string, string> = {
    nombre: 'Nombre del contacto', empresa_prospecto: 'Empresa del prospecto',
    empresa_consultor: 'Tu empresa', consultor: 'Tu nombre', telefono: 'Tu teléfono',
    sector: 'Sector / industria', gancho: 'Gancho de entrada', problema: 'Problema clave',
    meses: 'Meses desde último contacto', reto_actual: 'Reto actual del sector',
    accion_previa: 'Acción previa tomada', modulos: 'Nº de módulos',
    objetivo_principal: 'Objetivo principal', plazo: 'Plazo estimado',
    modulo: 'Módulo pendiente', tiempo: 'Minutos estimados', link_modulo: 'Link del módulo',
    semana: 'Número de semana', modulos_completados: 'Módulos completados',
    modulos_pendientes: 'Módulos pendientes', siguiente_accion: 'Siguiente acción',
    comentario_consultor: 'Comentario del consultor',
  }

  const tabBar = role === 'director'
    ? <DirectorTabs caseId={caseId} />
    : <CasoTabs caseId={caseId} activeTab="comunicacion" />

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName} tabBar={tabBar}>
      <div className="max-w-5xl mx-auto space-y-4">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">Motor de Comunicación</h1>
            <p className="text-sm text-muted mt-1">Plantillas de email y WhatsApp para cada etapa del proceso comercial</p>
          </div>
          {isConsultant && (
            <button onClick={() => setShowManage(v => !v)} className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap">
              {showManage ? 'Ocultar gestión' : '⚙ Gestionar plantillas'}
            </button>
          )}
        </div>

        {/* Gestión del catálogo — solo consultor (sección 9.3 del PRD) */}
        {isConsultant && showManage && (
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Plantillas de {companyName.length > 0 ? 'tu cuenta' : 'tu cuenta'}</h2>
            <p className="text-xs text-muted -mt-2">Se reutilizan en todos tus casos. Desactivar una no la borra, solo la oculta del uso diario.</p>

            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className={`rounded-xl border p-3 ${t.is_active ? 'border-subtle' : 'border-subtle bg-surface-2 opacity-60'}`}>
                  {editTplId === t.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={tplForm.category} onChange={e => setTplForm(f => ({ ...f, category: e.target.value }))} className="input-field text-sm" placeholder="Categoría" />
                        <input value={tplForm.label} onChange={e => setTplForm(f => ({ ...f, label: e.target.value }))} className="input-field text-sm" placeholder="Nombre" />
                      </div>
                      <div className="flex gap-2">
                        {(['email', 'whatsapp'] as const).map(ch => (
                          <button key={ch} type="button" onClick={() => setTplForm(f => ({ ...f, channel: ch }))}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${tplForm.channel === ch ? 'border-accent bg-accent text-white' : 'border-subtle text-muted'}`}>
                            {ch === 'email' ? '✉ Email' : '💬 WhatsApp'}
                          </button>
                        ))}
                      </div>
                      {tplForm.channel === 'email' && (
                        <input value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} className="input-field text-sm w-full" placeholder="Asunto" />
                      )}
                      <textarea value={tplForm.body} onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))} rows={5} className="input-field text-sm w-full resize-none" placeholder="Cuerpo del mensaje (usa {{variable}} para campos dinámicos)" />
                      <div className="flex gap-2">
                        <button onClick={saveEditTemplate} disabled={savingTpl} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{savingTpl ? 'Guardando…' : 'Guardar'}</button>
                        <button onClick={resetTplForm} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{t.channel === 'email' ? '✉' : '💬'} {t.label}</p>
                        <p className="text-xs text-muted">{t.category}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditTemplate(t)} className="text-xs px-2.5 py-1.5 rounded-lg border border-subtle hover:bg-surface-2 text-muted hover:text-ink transition-colors">✎</button>
                        <button onClick={() => toggleTemplateActive(t)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${t.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-subtle text-faint'}`}>
                          {t.is_active ? '✓ Activa' : '○ Inactiva'}
                        </button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {editTplId === null && (
                <div className="border-2 border-dashed border-subtle rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-ink">Nueva plantilla</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={tplForm.category} onChange={e => setTplForm(f => ({ ...f, category: e.target.value }))} className="input-field text-sm" placeholder="Categoría (ej. Prospección)" />
                    <input value={tplForm.label} onChange={e => setTplForm(f => ({ ...f, label: e.target.value }))} className="input-field text-sm" placeholder="Nombre" />
                  </div>
                  <div className="flex gap-2">
                    {(['email', 'whatsapp'] as const).map(ch => (
                      <button key={ch} type="button" onClick={() => setTplForm(f => ({ ...f, channel: ch }))}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${tplForm.channel === ch ? 'border-accent bg-accent text-white' : 'border-subtle text-muted'}`}>
                        {ch === 'email' ? '✉ Email' : '💬 WhatsApp'}
                      </button>
                    ))}
                  </div>
                  {tplForm.channel === 'email' && (
                    <input value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} className="input-field text-sm w-full" placeholder="Asunto" />
                  )}
                  <textarea value={tplForm.body} onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))} rows={5} className="input-field text-sm w-full resize-none" placeholder="Cuerpo del mensaje (usa {{variable}} para campos dinámicos)" />
                  <button onClick={createTemplate} disabled={!tplForm.category.trim() || !tplForm.label.trim() || !tplForm.body.trim() || savingTpl} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
                    {savingTpl ? 'Guardando…' : '+ Agregar plantilla'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTemplates.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-muted font-medium">No hay plantillas activas todavía</p>
            <p className="text-faint text-sm mt-1">
              {isConsultant ? 'Agrégalas arriba en "Gestionar plantillas"' : 'Tu consultor todavía no ha definido plantillas de comunicación'}
            </p>
          </div>
        ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

          {/* ── Lista de plantillas ── */}
          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'email', 'whatsapp'] as const).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    channel === ch ? 'border-accent bg-accent text-white' : 'border-subtle text-muted hover:bg-surface-2'
                  }`}>
                  {ch === 'all' ? 'Todos' : ch === 'email' ? '✉ Email' : '💬 WhatsApp'}
                </button>
              ))}
            </div>

            <div className="space-y-0.5">
              {CATEGORIES.filter(c => c !== 'Todos').map(cat => {
                const catTemplates = filtered.filter(t => t.category === cat)
                if (catTemplates.length === 0) return null
                return (
                  <div key={cat}>
                    <p className="text-xs text-faint font-medium px-2 pt-3 pb-1 uppercase tracking-wide">{cat}</p>
                    {catTemplates.map(t => (
                      <button key={t.id} onClick={() => setSelected(t.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center gap-2 ${
                          selectedId === t.id ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
                        }`}>
                        <span className="text-xs">{t.channel === 'email' ? '✉' : '💬'}</span>
                        <span className="text-xs">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Editor + Preview ── */}
          {selected && (
            <div className="space-y-4">
              {/* Variables */}
              <div className="card p-4 space-y-3">
                <h2 className="text-xs font-semibold text-ink uppercase tracking-wide">Variables</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {usedVars.map(v => (
                    <div key={v}>
                      <label className="text-xs text-muted block mb-1">{VAR_LABELS[v] ?? v}</label>
                      <input
                        type="text"
                        value={vars[v as keyof typeof vars] ?? ''}
                        onChange={e => setVar(v, e.target.value)}
                        placeholder={`[${v}]`}
                        className="input-field w-full text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{selected.channel === 'email' ? '✉' : '💬'}</span>
                    <h2 className="text-sm font-semibold text-ink">{selected.label}</h2>
                    <span className={`badge text-xs ${selected.channel === 'email' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {selected.channel === 'email' ? 'Email' : 'WhatsApp'}
                    </span>
                  </div>
                  <button
                    onClick={copyText}
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>

                {selected.subject && (
                  <div className="bg-surface-2 rounded-xl px-4 py-2.5">
                    <span className="text-xs text-muted">Asunto: </span>
                    <span className="text-sm text-ink">{filledSubject}</span>
                  </div>
                )}

                <div className={`rounded-xl p-4 whitespace-pre-wrap text-sm leading-relaxed ${
                  selected.channel === 'whatsapp'
                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-900'
                    : 'bg-surface border border-subtle text-ink'
                }`}>
                  {filledBody}
                </div>

                {/* Indicador de variables sin llenar */}
                {filledBody.includes('[') && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    ⚠ Hay variables sin completar — aparecen como [nombre_variable]
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </AppShell>
  )
}
