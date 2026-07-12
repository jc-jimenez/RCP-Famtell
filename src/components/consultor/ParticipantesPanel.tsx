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

interface Position {
  id: string
  name: string
  job_description: string
  business_role_id: string | null
  moduleCodes: string[]
}

interface BusinessRole {
  id: string
  name: string
}

interface Participant {
  id: string
  role: string
  job_title: string | null
  job_position_id: string | null
  business_role_id: string | null
  invitation_email: string | null
  full_name: string | null
  permissions_json: { modules?: string[] } | null
  activated_at: string | null
}

interface Props {
  caseId: string
  initialParticipants: Participant[]
  initialPositions: Position[]
  businessRoles: BusinessRole[]
}

function assignedModules(p: Participant): string[] {
  if (p.role === 'director') return ALL_CODES
  return p.permissions_json?.modules ?? []
}

function generatePassword(): string {
  return `Bd-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 9000 + 1000)}`
}

export default function ParticipantesPanel({ caseId, initialParticipants, initialPositions, businessRoles }: Props) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [positions] = useState<Position[]>(initialPositions)
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState<'invite' | 'direct'>('invite')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const emptyForm = {
    email: '',
    fullName: '',
    positionId: '',
    businessRoleId: '',
    platformRole: 'collaborator' as 'director' | 'collaborator',
    whatsapp: '',
    landlinePhone: '',
    seniority: '',
    password: '',
  }
  const [form, setForm] = useState(emptyForm)

  const isDirector = form.platformRole === 'director'
  const selectedPosition = positions.find(p => p.id === form.positionId)
  const derivedModules = selectedPosition?.moduleCodes ?? []
  const noModulesMapped = !isDirector && !!form.positionId && derivedModules.length === 0
  const effectiveModules = isDirector
    ? ALL_CODES
    : form.positionId
      ? (derivedModules.length > 0 ? derivedModules : ALL_CODES)
      : []
  const noPositions = positions.length === 0
  const roleNameById = Object.fromEntries(businessRoles.map(r => [r.id, r.name]))

  function participantLabel(p: Participant): string {
    return p.full_name || p.invitation_email || '—'
  }

  function positionName(p: Participant): string {
    const pos = positions.find(x => x.id === p.job_position_id)
    return pos?.name ?? p.job_title ?? 'Sin puesto'
  }

  async function deleteParticipant(caseUserId: string) {
    setDeletingId(caseUserId)
    try {
      let res = await fetch('/api/case-users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseUserId }),
      })
      if (res.status === 409) {
        const data = await res.json()
        if (!confirm(data.message ?? '¿Eliminar este participante?')) return
        res = await fetch('/api/case-users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseUserId, confirm: true }),
        })
      }
      if (res.ok) setParticipants(prev => prev.filter(p => p.id !== caseUserId))
    } finally {
      setDeletingId(null)
    }
  }

  function selectPosition(positionId: string) {
    const pos = positions.find(x => x.id === positionId)
    setForm(f => ({ ...f, positionId, businessRoleId: pos?.business_role_id ?? f.businessRoleId }))
  }

  const canSubmit = !!form.email && !!form.positionId && !!form.whatsapp.trim() && effectiveModules.length > 0
    && (mode === 'invite' || form.password.length >= 8)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const selectedPositionName = positions.find(p => p.id === form.positionId)?.name ?? null
    const endpoint = mode === 'invite' ? '/api/invitations' : '/api/consultant/create-participant'
    const body: Record<string, unknown> = {
      caseId,
      email: form.email,
      role: form.platformRole,
      jobPositionId: form.positionId,
      jobTitle: selectedPositionName,
      businessRoleId: form.businessRoleId || null,
      permissions: { modules: effectiveModules },
      whatsappPhone: form.whatsapp.trim(),
      fullName: form.fullName.trim() || null,
      landlinePhone: form.landlinePhone.trim() || null,
      seniority: form.seniority.trim() || null,
    }
    if (mode === 'direct') body.password = form.password

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Error al crear el participante'); return }

    const cu = data.caseUser
    setParticipants(prev => [...prev, {
      id: cu.id,
      role: cu.role,
      job_title: cu.job_title,
      job_position_id: cu.job_position_id,
      business_role_id: cu.business_role_id,
      invitation_email: cu.invitation_email,
      full_name: cu.full_name,
      permissions_json: cu.permissions_json,
      activated_at: cu.activated_at ?? null,
    }])
    setLastInviteUrl(data.activationUrl ?? null)
    setShowModal(false)
    setForm(emptyForm)
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink">Participantes</h2>
        <button onClick={() => setShowModal(true)} className="text-xs text-accent hover:underline">
          + Agregar
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
            const label = positionName(p)
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-surface-2 border border-subtle flex items-center justify-center text-xs font-bold text-muted">
                  {participantLabel(p).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-ink font-medium truncate">{participantLabel(p)}</p>
                    {p.business_role_id && roleNameById[p.business_role_id] && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent flex-shrink-0">{roleNameById[p.business_role_id]}</span>
                    )}
                  </div>
                  <p className="text-xs text-faint">
                    {label}
                    {' · '}
                    {p.role === 'director' ? 'Módulos 1-7' : `Módulos ${mods.map(m => m.replace('M', '')).join(', ') || '—'}`}
                  </p>
                </div>
                <span className={`badge ${p.activated_at ? 'badge-success' : 'badge-warning'}`}>
                  {p.activated_at ? 'Activo' : 'Pendiente'}
                </span>
                <button
                  onClick={() => deleteParticipant(p.id)}
                  disabled={deletingId === p.id}
                  className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Eliminar participante"
                >
                  {deletingId === p.id ? '…' : '🗑'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-ink">Agregar participante</h3>

            {noPositions ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800">Todavía no hay puestos en el catálogo de este caso</p>
                <p className="text-xs text-amber-700">
                  Antes de agregar participantes, ve a "Puestos" y da de alta los puestos reales de la empresa
                  (con su descriptivo) — cada participante se asigna a uno de esos puestos.
                </p>
              </div>
            ) : (
              <>
                {/* Flujo: invitación por correo vs. alta directa con contraseña */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('invite')}
                    className={`text-sm px-3 py-2 rounded-xl border transition-colors ${
                      mode === 'invite' ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-subtle text-muted hover:border-accent/30'
                    }`}
                  >
                    Invitar por correo
                    <p className="text-xs font-normal mt-0.5">Le llega un link, él fija su contraseña</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('direct')}
                    className={`text-sm px-3 py-2 rounded-xl border transition-colors ${
                      mode === 'direct' ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-subtle text-muted hover:border-accent/30'
                    }`}
                  >
                    Crear con contraseña
                    <p className="text-xs font-normal mt-0.5">Tú fijas la contraseña, queda activo de inmediato</p>
                  </button>
                </div>

                <div>
                  <label className="label-text">Nombre del usuario</label>
                  <input
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    className="input-field"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="label-text">Correo electrónico *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input-field"
                    placeholder="persona@empresa.com"
                  />
                </div>

                {mode === 'direct' && (
                  <div>
                    <label className="label-text">Contraseña *</label>
                    <div className="flex gap-2">
                      <input
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="input-field flex-1"
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button type="button" onClick={() => setForm(f => ({ ...f, password: generatePassword() }))} className="btn-secondary text-xs whitespace-nowrap px-3">
                        Generar
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label-text">WhatsApp *</label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    className="input-field"
                    placeholder="+52 55 1234 5678"
                  />
                  <p className="text-xs text-faint mt-1">Se usará para recordatorios de check-in cada lunes</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text">Teléfono fijo</label>
                    <input
                      type="tel"
                      value={form.landlinePhone}
                      onChange={e => setForm(f => ({ ...f, landlinePhone: e.target.value }))}
                      className="input-field"
                      placeholder="55 1234 5678"
                    />
                  </div>
                  <div>
                    <label className="label-text">Antigüedad</label>
                    <input
                      value={form.seniority}
                      onChange={e => setForm(f => ({ ...f, seniority: e.target.value }))}
                      className="input-field"
                      placeholder="ej. 3 años"
                    />
                  </div>
                </div>

                {/* Puesto (catálogo del caso) */}
                <div>
                  <label className="label-text">Puesto en la empresa (catálogo de este caso)</label>
                  <div className="grid grid-cols-1 gap-1.5 mt-1">
                    {positions.map(pos => (
                      <label
                        key={pos.id}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                          form.positionId === pos.id
                            ? 'border-accent bg-accent-soft'
                            : 'border-subtle bg-surface-2 hover:border-accent/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="position"
                          value={pos.id}
                          checked={form.positionId === pos.id}
                          onChange={() => selectPosition(pos.id)}
                          className="sr-only"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{pos.name}</p>
                          <p className="text-xs text-muted line-clamp-2">{pos.job_description}</p>
                        </div>
                        {form.positionId === pos.id && (
                          <span className="text-accent text-xs font-bold">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rol de negocio (catálogo global, sección 15 del PRD) — se sugiere del puesto pero se puede cambiar */}
                <div>
                  <label className="label-text">Rol (descriptivo, para el Brief)</label>
                  <select
                    value={form.businessRoleId}
                    onChange={e => setForm(f => ({ ...f, businessRoleId: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Sin rol asignado</option>
                    {businessRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Rol de plataforma — independiente del puesto */}
                <div>
                  <label className="label-text">Rol de plataforma</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, platformRole: 'director' }))}
                      className={`text-sm px-3 py-2 rounded-xl border transition-colors ${
                        isDirector ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-subtle text-muted hover:border-accent/30'
                      }`}
                    >
                      Director General
                      <p className="text-xs font-normal mt-0.5">Ve el Brief y los KPIs, acceso a todos los módulos</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, platformRole: 'collaborator' }))}
                      className={`text-sm px-3 py-2 rounded-xl border transition-colors ${
                        !isDirector ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-subtle text-muted hover:border-accent/30'
                      }`}
                    >
                      Colaborador
                      <p className="text-xs font-normal mt-0.5">Solo responde los módulos que le asignes</p>
                    </button>
                  </div>
                </div>

                {/* Módulos — se derivan del puesto (qué preguntas están mapeadas a él), ya no se seleccionan a mano */}
                {isDirector ? (
                  <div className="bg-surface-2 rounded-xl px-4 py-3">
                    <p className="text-xs text-muted mb-1">Módulos asignados automáticamente:</p>
                    <p className="text-xs font-semibold text-ink">{ALL_CODES.join(' · ')}</p>
                  </div>
                ) : (
                  <div className="bg-surface-2 rounded-xl px-4 py-3">
                    <p className="text-xs text-muted mb-1">
                      {!form.positionId
                        ? 'Módulos:'
                        : noModulesMapped
                          ? 'Módulos asignados (temporal — el puesto aún no tiene preguntas mapeadas):'
                          : 'Módulos asignados automáticamente según el puesto:'}
                    </p>
                    <p className="text-xs font-semibold text-ink">
                      {form.positionId ? effectiveModules.join(' · ') : 'Selecciona un puesto para ver sus módulos'}
                    </p>
                    {noModulesMapped && (
                      <p className="text-xs text-amber-700 mt-1">
                        Este puesto todavía no tiene preguntas mapeadas en Módulos — se le asignan todos los módulos mientras tanto. Mapea preguntas al puesto para afinar el acceso.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowModal(false); setError(null) }} className="btn-secondary flex-1">Cancelar</button>
              {!noPositions && (
                <button
                  onClick={handleSubmit}
                  disabled={saving || !canSubmit}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : mode === 'invite' ? 'Enviar invitación' : 'Crear participante'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
