'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

type Stage = 'pending' | 'contacted' | 'proposal_sent' | 'negotiating' | 'closed_won' | 'closed_lost'
type RelType = 'client' | 'prospect' | 'supplier' | 'partner' | 'other'

interface Contact {
  id: string
  name: string
  company: string | null
  role: string | null
  email: string | null
  phone: string | null
  relationship_type: RelType
  notes: string | null
  pipeline_stage: Stage | null
  potential_value_monthly: number | null
  close_probability: 'high' | 'medium' | 'low' | null
  next_action: string | null
  next_action_date: string | null
}

interface Props {
  caseId: string
  companyName: string
  initialContacts: Contact[]
}

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'pending',       label: 'Por contactar',   color: 'bg-surface-2 border-subtle' },
  { key: 'contacted',     label: 'Contactado',       color: 'bg-blue-50 border-blue-200' },
  { key: 'proposal_sent', label: 'Propuesta enviada',color: 'bg-violet-50 border-violet-200' },
  { key: 'negotiating',   label: 'Negociando',       color: 'bg-amber-50 border-amber-200' },
  { key: 'closed_won',    label: 'Ganado ✓',         color: 'bg-emerald-50 border-emerald-200' },
  { key: 'closed_lost',   label: 'Perdido',          color: 'bg-red-50 border-red-200' },
]

const STAGE_BADGE: Record<Stage, string> = {
  pending:       'text-faint bg-surface-2 border-subtle',
  contacted:     'text-blue-700 bg-blue-50 border-blue-200',
  proposal_sent: 'text-violet-700 bg-violet-50 border-violet-200',
  negotiating:   'text-amber-700 bg-amber-50 border-amber-200',
  closed_won:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  closed_lost:   'text-red-700 bg-red-50 border-red-200',
}

const REL_LABELS: Record<RelType, string> = {
  client: 'Cliente', prospect: 'Prospecto', supplier: 'Proveedor',
  partner: 'Aliado', other: 'Otro',
}

const PROB_BADGE: Record<string, string> = {
  high: 'text-emerald-700 bg-emerald-50',
  medium: 'text-amber-700 bg-amber-50',
  low: 'text-red-700 bg-red-50',
}

type View = 'kanban' | 'list'

export default function CRMClient({ caseId, companyName, initialContacts }: Props) {
  const { email } = useSupabaseUser()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [view, setView] = useState<View>('kanban')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', company: '', role: '', email: '', phone: '',
    relationship_type: 'prospect' as RelType,
    notes: '', pipeline_stage: 'pending' as Stage,
    potential_value_monthly: '', close_probability: 'medium' as 'high' | 'medium' | 'low',
    next_action: '', next_action_date: '',
  })

  function openNew() {
    setEditContact(null)
    setForm({ name: '', company: '', role: '', email: '', phone: '', relationship_type: 'prospect', notes: '', pipeline_stage: 'pending', potential_value_monthly: '', close_probability: 'medium', next_action: '', next_action_date: '' })
    setShowModal(true)
  }

  function openEdit(c: Contact) {
    setEditContact(c)
    setForm({
      name: c.name, company: c.company ?? '', role: c.role ?? '',
      email: c.email ?? '', phone: c.phone ?? '',
      relationship_type: c.relationship_type,
      notes: c.notes ?? '', pipeline_stage: c.pipeline_stage ?? 'pending',
      potential_value_monthly: c.potential_value_monthly ? String(c.potential_value_monthly) : '',
      close_probability: c.close_probability ?? 'medium',
      next_action: c.next_action ?? '', next_action_date: c.next_action_date ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      name: form.name, company: form.company || null, role: form.role || null,
      email: form.email || null, phone: form.phone || null,
      relationship_type: form.relationship_type, notes: form.notes || null,
      pipeline_stage: form.pipeline_stage,
      potential_value_monthly: form.potential_value_monthly ? Number(form.potential_value_monthly) : null,
      close_probability: form.close_probability,
      next_action: form.next_action || null,
      next_action_date: form.next_action_date || null,
    }

    if (editContact) {
      const res = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editContact.id, ...payload }),
      })
      const data = await res.json()
      if (res.ok) setContacts(prev => prev.map(c => c.id === editContact.id ? data.contact : c))
    } else {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, ...payload }),
      })
      const data = await res.json()
      if (res.ok) setContacts(prev => [...prev, data.contact])
    }
    setSaving(false)
    setShowModal(false)
  }

  async function moveStage(contactId: string, stage: Stage) {
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, pipeline_stage: stage } : c))
    await fetch('/api/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: contactId, pipeline_stage: stage }),
    })
  }

  const byStage = (stage: Stage) => contacts.filter(c => (c.pipeline_stage ?? 'pending') === stage)
  const prospects = contacts.filter(c => c.relationship_type === 'prospect')
  const totalPotential = prospects.reduce((s, c) => s + (c.potential_value_monthly ?? 0), 0)
  const won = contacts.filter(c => c.pipeline_stage === 'closed_won')

  return (
    <AppShell role="consultant" email={email ?? ''}>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink mb-2 inline-block">
              ← {companyName}
            </Link>
            <h1 className="text-xl font-bold text-ink">CRM Ligero</h1>
            <p className="text-muted text-sm mt-0.5">{contacts.length} contactos · potencial ${totalPotential.toLocaleString('es-MX')}/mes</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-surface-2 rounded-xl p-1 border border-subtle">
              {(['kanban', 'list'] as View[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors font-medium ${view === v ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}>
                  {v === 'kanban' ? 'Kanban' : 'Lista'}
                </button>
              ))}
            </div>
            <button onClick={openNew} className="btn-primary text-sm">+ Contacto</button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-2xl font-bold text-ink">{contacts.length}</p>
            <p className="text-xs text-muted mt-0.5">Contactos totales</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-emerald-600">{won.length}</p>
            <p className="text-xs text-muted mt-0.5">Clientes ganados</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-accent">${totalPotential.toLocaleString('es-MX')}</p>
            <p className="text-xs text-muted mt-0.5">Potencial mensual</p>
          </div>
        </div>

        {/* Vista Kanban */}
        {view === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {STAGES.map(({ key, label, color }) => (
                <div
                  key={key}
                  className={`w-56 rounded-xl border p-3 space-y-2 ${color}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    if (dragging) moveStage(dragging, key)
                    setDragging(null)
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-ink">{label}</p>
                    <span className="text-xs text-faint">{byStage(key).length}</span>
                  </div>
                  {byStage(key).map(c => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragging(c.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => openEdit(c)}
                      className="bg-surface rounded-lg border border-subtle p-3 cursor-pointer hover:border-accent/30 hover:shadow-card transition-all"
                    >
                      <p className="text-xs font-semibold text-ink truncate">{c.name}</p>
                      {c.company && <p className="text-xs text-muted truncate">{c.company}</p>}
                      {c.potential_value_monthly && (
                        <p className="text-xs text-accent font-medium mt-1">${c.potential_value_monthly.toLocaleString('es-MX')}/mes</p>
                      )}
                      {c.next_action && (
                        <p className="text-xs text-faint mt-1 truncate">→ {c.next_action}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista Lista */}
        {view === 'list' && (
          <div className="card overflow-hidden">
            {contacts.length === 0 ? (
              <p className="text-center text-faint py-10 text-sm">Sin contactos aún. Agrega contactos del M3 o crea nuevos.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle text-xs text-faint uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Etapa</th>
                    <th className="px-4 py-3 text-right">Potencial/mes</th>
                    <th className="px-4 py-3 text-left">Próxima acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {contacts.map(c => (
                    <tr key={c.id} onClick={() => openEdit(c)} className="hover:bg-surface-2 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{c.name}</p>
                        {c.company && <p className="text-xs text-faint">{c.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{REL_LABELS[c.relationship_type]}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STAGE_BADGE[c.pipeline_stage ?? 'pending']}`}>
                          {STAGES.find(s => s.key === (c.pipeline_stage ?? 'pending'))?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-ink font-mono text-xs">
                        {c.potential_value_monthly ? `$${c.potential_value_monthly.toLocaleString('es-MX')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted max-w-[160px] truncate">{c.next_action ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-ink">{editContact ? 'Editar contacto' : 'Nuevo contacto'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label-text">Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="label-text">Empresa</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input-field" placeholder="Empresa S.A." />
              </div>
              <div>
                <label className="label-text">Puesto</label>
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field" placeholder="Director Compras" />
              </div>
              <div>
                <label className="label-text">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label-text">Teléfono</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="+52 55 1234 5678" />
              </div>
              <div>
                <label className="label-text">Tipo de relación</label>
                <select value={form.relationship_type} onChange={e => setForm(f => ({ ...f, relationship_type: e.target.value as RelType }))} className="input-field">
                  {Object.entries(REL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Etapa CRM</label>
                <select value={form.pipeline_stage} onChange={e => setForm(f => ({ ...f, pipeline_stage: e.target.value as Stage }))} className="input-field">
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Potencial mensual ($)</label>
                <input type="number" value={form.potential_value_monthly} onChange={e => setForm(f => ({ ...f, potential_value_monthly: e.target.value }))} className="input-field" placeholder="50000" />
              </div>
              <div>
                <label className="label-text">Probabilidad de cierre</label>
                <select value={form.close_probability} onChange={e => setForm(f => ({ ...f, close_probability: e.target.value as any }))} className="input-field">
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label-text">Próxima acción</label>
                <input value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))} className="input-field" placeholder="Llamar para seguimiento" />
              </div>
              <div>
                <label className="label-text">Fecha próxima acción</label>
                <input type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="label-text">Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Guardando…' : editContact ? 'Guardar cambios' : 'Agregar contacto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
