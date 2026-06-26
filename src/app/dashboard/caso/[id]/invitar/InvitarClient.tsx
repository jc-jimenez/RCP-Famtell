'use client'

import { useState } from 'react'
import Link from 'next/link'

const MODULES = [
  { code: 'M1', label: 'Radiografía Comercial' },
  { code: 'M2', label: 'Radiografía Operativa' },
  { code: 'M3', label: 'Base de Contactos' },
  { code: 'M4', label: 'Radiografía Financiera' },
  { code: 'M5', label: 'Radiografía Competitiva' },
  { code: 'M6', label: 'Radiografía Interna' },
  { code: 'M7', label: 'Síntesis y Plan RCP' },
]
const ALL_CODES = MODULES.map(m => m.code)

interface Participant {
  id: string
  role: string
  job_title: string | null
  invitation_email: string | null
  invitation_token: string | null
  permissions_json: { modules?: string[] } | null
  activated_at: string | null
  last_seen_at: string | null
}

interface Props {
  caseId: string
  companyName: string
  initialParticipants: Participant[]
  appUrl: string
}

type Tab = 'todos' | 'activos' | 'pendientes'

function assignedModules(p: Participant): string[] {
  if (p.role === 'director') return ALL_CODES
  return p.permissions_json?.modules ?? []
}

export default function InvitarClient({ caseId, companyName, initialParticipants, appUrl }: Props) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [tab, setTab] = useState<Tab>('todos')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    email: '',
    role: 'collaborator' as 'director' | 'collaborator',
    jobTitle: '',
    modules: [] as string[],
  })

  const filtered = participants.filter(p => {
    if (tab === 'activos') return !!p.activated_at
    if (tab === 'pendientes') return !p.activated_at
    return true
  })

  function toggleModule(code: string) {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(code) ? f.modules.filter(c => c !== code) : [...f.modules, code],
    }))
  }

  async function handleInvite() {
    setSaving(true)
    setError(null)
    const modules = form.role === 'director' ? ALL_CODES : form.modules
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        email: form.email,
        role: form.role,
        jobTitle: form.jobTitle || null,
        permissions: { modules },
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Error al invitar'); return }

    const cu = data.caseUser
    setParticipants(prev => [...prev, {
      id: cu.id,
      role: cu.role,
      job_title: cu.job_title,
      invitation_email: cu.invitation_email,
      invitation_token: cu.invitation_token,
      permissions_json: cu.permissions_json,
      activated_at: null,
      last_seen_at: null,
    }])
    setLastInviteUrl(data.activationUrl ?? null)
    setShowModal(false)
    setForm({ email: '', role: 'collaborator', jobTitle: '', modules: [] })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink mb-2 inline-block">
            ← {companyName}
          </Link>
          <h1 className="text-xl font-bold text-ink">Participantes</h1>
          <p className="text-muted text-sm mt-0.5">Invita usuarios y asigna qué módulos responde cada uno</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Invitar</button>
      </div>

      {/* URL de activación tras invitar (Resend puede no estar activo) */}
      {lastInviteUrl && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">Invitación creada</p>
          <p className="text-xs text-amber-700 mb-2">Comparte este enlace con la persona (válido 48h):</p>
          <div className="flex gap-2">
            <input readOnly value={lastInviteUrl} className="input-field text-xs flex-1" onFocus={e => e.target.select()} />
            <button
              onClick={() => navigator.clipboard.writeText(lastInviteUrl)}
              className="btn-secondary text-xs whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card p-5">
        <div className="flex gap-1 mb-4 bg-surface-2 rounded-xl p-1 w-fit">
          {(['todos', 'activos', 'pendientes'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-medium px-4 py-1.5 rounded-lg capitalize transition-colors ${
                tab === t ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-faint py-6 text-center">Sin participantes en esta vista</p>
        ) : (
          <div className="divide-y divide-subtle">
            {filtered.map(p => {
              const mods = assignedModules(p)
              const name = p.invitation_email ?? '—'
              const initials = (name[0] ?? '?').toUpperCase()
              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-surface-2 border border-subtle flex items-center justify-center text-xs font-bold text-muted flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{name}</p>
                    <p className="text-xs text-muted">
                      {p.role === 'director' ? 'Directivo' : 'Colaborador'}
                      {' · '}
                      {p.role === 'director' ? 'Módulos 1-7' : `Módulos ${mods.map(m => m.replace('M', '')).join(', ') || '—'}`}
                    </p>
                  </div>
                  <span className={`badge ${p.activated_at ? 'badge-success' : 'badge-warning'}`}>
                    {p.activated_at ? 'Activo' : 'Pendiente'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal invitar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-ink">Invitar participante</h3>

            <div>
              <label className="label-text">Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field" placeholder="persona@empresa.com" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))} className="input-field">
                  <option value="director">Directivo</option>
                  <option value="collaborator">Colaborador</option>
                </select>
              </div>
              <div>
                <label className="label-text">Posición</label>
                <input type="text" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
                  className="input-field" placeholder="Gerente Operativo" />
              </div>
            </div>

            {/* Asignación de módulos */}
            <div>
              <label className="label-text">
                Módulos asignados
                {form.role === 'director' && <span className="text-faint font-normal"> — el directivo accede a todos</span>}
              </label>
              {form.role === 'director' ? (
                <p className="text-xs text-muted bg-surface-2 rounded-lg px-3 py-2">Módulos 1 a 7 (acceso completo)</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 mt-1">
                  {MODULES.map(m => (
                    <label key={m.code} className="flex items-center gap-2 text-sm text-ink cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={form.modules.includes(m.code)}
                        onChange={() => toggleModule(m.code)}
                        className="accent-brand"
                      />
                      <span className="font-medium text-xs w-6">{m.code}</span>
                      <span className="text-muted text-xs">{m.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowModal(false); setError(null) }} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleInvite}
                disabled={saving || !form.email || (form.role === 'collaborator' && form.modules.length === 0)}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Invitando…' : 'Enviar invitación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
