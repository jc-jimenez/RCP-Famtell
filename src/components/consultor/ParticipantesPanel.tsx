'use client'

import { useState } from 'react'

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

// Perfiles con módulos pre-seleccionados
const PROFILES = [
  { id: 'director_general',    label: 'Director General',       icon: '★', modules: ALL_CODES,                         description: 'Acceso completo a todos los módulos' },
  { id: 'gerente_comercial',   label: 'Gerente Comercial',      icon: '◎', modules: ['M1', 'M3', 'M5'],                description: 'Comercial, Contactos, Competencia' },
  { id: 'gerente_operativo',   label: 'Gerente Operativo',      icon: '⚙', modules: ['M2', 'M6'],                      description: 'Operaciones, Procesos internos' },
  { id: 'cfo_contador',        label: 'CFO / Contador',         icon: '₿', modules: ['M4'],                            description: 'Radiografía Financiera' },
  { id: 'rrhh_admin',          label: 'RRHH / Administración',  icon: '◑', modules: ['M6'],                            description: 'Cultura y estructura interna' },
  { id: 'gerente_marketing',   label: 'Gerente de Marketing',   icon: '✦', modules: ['M1', 'M5'],                      description: 'Comercial y Competencia' },
  { id: 'personalizado',       label: 'Personalizado',          icon: '✎', modules: [],                                description: 'Selecciona los módulos manualmente' },
]

const ROLE_LABEL: Record<string, string> = {
  director_general:  'Director General',
  gerente_comercial: 'Gerente Comercial',
  gerente_operativo: 'Gerente Operativo',
  cfo_contador:      'CFO / Contador',
  rrhh_admin:        'RRHH / Administración',
  gerente_marketing: 'Gerente de Marketing',
  personalizado:     'Colaborador',
}

interface Participant {
  id: string
  role: string
  job_title: string | null
  invitation_email: string | null
  permissions_json: { modules?: string[] } | null
  activated_at: string | null
}

interface Props {
  caseId: string
  initialParticipants: Participant[]
}

function assignedModules(p: Participant): string[] {
  if (p.role === 'director') return ALL_CODES
  return p.permissions_json?.modules ?? []
}

function roleLabel(p: Participant): string {
  if (p.role === 'director') return 'Director General'
  if (p.job_title && ROLE_LABEL[p.job_title]) return ROLE_LABEL[p.job_title]
  if (p.job_title) return p.job_title
  return 'Colaborador'
}

export default function ParticipantesPanel({ caseId, initialParticipants }: Props) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    email: '',
    profileId: 'director_general',
    customModules: [] as string[],
  })

  const selectedProfile = PROFILES.find(p => p.id === form.profileId)!
  const isCustom = form.profileId === 'personalizado'
  const effectiveModules = isCustom ? form.customModules : selectedProfile.modules
  const isDirector = form.profileId === 'director_general'

  function toggleCustomModule(code: string) {
    setForm(f => ({
      ...f,
      customModules: f.customModules.includes(code)
        ? f.customModules.filter(c => c !== code)
        : [...f.customModules, code],
    }))
  }

  async function handleInvite() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        email: form.email,
        role: isDirector ? 'director' : 'collaborator',
        jobTitle: form.profileId,
        permissions: { modules: effectiveModules },
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
      permissions_json: cu.permissions_json,
      activated_at: null,
    }])
    setLastInviteUrl(data.activationUrl ?? null)
    setShowModal(false)
    setForm({ email: '', profileId: 'director_general', customModules: [] })
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink">Participantes</h2>
        <button onClick={() => setShowModal(true)} className="text-xs text-accent hover:underline">
          + Invitar
        </button>
      </div>

      {lastInviteUrl && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 mb-4">
          <p className="text-xs font-semibold text-amber-800 mb-1">Enlace de activación (válido 48h)</p>
          <div className="flex gap-2">
            <input readOnly value={lastInviteUrl} className="input-field text-xs flex-1" onFocus={e => e.target.select()} />
            <button onClick={() => navigator.clipboard.writeText(lastInviteUrl)} className="btn-secondary text-xs whitespace-nowrap">
              Copiar
            </button>
          </div>
        </div>
      )}

      {participants.length === 0 ? (
        <p className="text-xs text-faint">No hay participantes invitados aún</p>
      ) : (
        <div className="space-y-2">
          {participants.map(p => {
            const mods = assignedModules(p)
            const label = roleLabel(p)
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-surface-2 border border-subtle flex items-center justify-center text-xs font-bold text-muted">
                  {label.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{p.invitation_email ?? '—'}</p>
                  <p className="text-xs text-faint">
                    {label}
                    {' · '}
                    {isDirectorRole(p.role) ? 'Módulos 1-7' : `Módulos ${mods.map(m => m.replace('M', '')).join(', ') || '—'}`}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-ink">Invitar participante</h3>

            <div>
              <label className="label-text">Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field"
                placeholder="persona@empresa.com"
              />
            </div>

            {/* Selector de perfil */}
            <div>
              <label className="label-text">Perfil / Rol en la empresa</label>
              <div className="grid grid-cols-1 gap-1.5 mt-1">
                {PROFILES.map(profile => (
                  <label
                    key={profile.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      form.profileId === profile.id
                        ? 'border-accent bg-accent-soft'
                        : 'border-subtle bg-surface-2 hover:border-accent/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={profile.id}
                      checked={form.profileId === profile.id}
                      onChange={() => setForm(f => ({ ...f, profileId: profile.id }))}
                      className="sr-only"
                    />
                    <span className="text-base w-5 text-center">{profile.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{profile.label}</p>
                      <p className="text-xs text-muted">{profile.description}</p>
                    </div>
                    {form.profileId === profile.id && (
                      <span className="text-accent text-xs font-bold">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Módulos custom */}
            {isCustom && (
              <div>
                <label className="label-text">Selecciona los módulos</label>
                <div className="grid grid-cols-1 gap-1.5 mt-1">
                  {MODULES.map(m => (
                    <label key={m.code} className="flex items-center gap-2 text-sm text-ink cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={form.customModules.includes(m.code)}
                        onChange={() => toggleCustomModule(m.code)}
                        className="accent-brand"
                      />
                      <span className="font-medium text-xs w-6 text-faint">{m.code}</span>
                      <span className="text-muted text-xs">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Preview de módulos */}
            {!isCustom && effectiveModules.length > 0 && (
              <div className="bg-surface-2 rounded-xl px-4 py-3">
                <p className="text-xs text-muted mb-1">Módulos asignados automáticamente:</p>
                <p className="text-xs font-semibold text-ink">
                  {effectiveModules.join(' · ')}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowModal(false); setError(null) }} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleInvite}
                disabled={saving || !form.email || effectiveModules.length === 0}
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

function isDirectorRole(role: string) {
  return role === 'director'
}
