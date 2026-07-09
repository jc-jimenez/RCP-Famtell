'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  kind: 'super_admin' | 'consultant' | 'director' | 'collaborator' | 'unknown'
  banned: boolean
  createdAt: string
  lastSignIn: string | null
  accountId: string | null
  companyName: string | null
  plan: string | null
  creditsBalance: number | null
  accountStatus: string | null
  caseId: string | null
  caseUserId: string | null
  jobTitle: string | null
  fullName: string | null
  whatsappPhone: string | null
  businessRole: string | null
}

interface CaseOption {
  id: string
  companyName: string
  accountEmail: string | null
}

interface Position {
  id: string
  name: string
}

const KIND_LABEL: Record<string, string> = {
  super_admin: 'Super-Admin',
  consultant: 'Consultor',
  director: 'Directivo',
  collaborator: 'Colaborador',
  unknown: 'Sin rol',
}
const KIND_PILL: Record<string, string> = {
  super_admin: 'bg-amber-50 text-amber-700 border-amber-200',
  consultant: 'bg-accent-soft text-accent border-accent/20',
  director: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  collaborator: 'bg-surface-2 text-muted border-subtle',
  unknown: 'bg-rose-50 text-rose-600 border-rose-200',
}

const NEW_USER_EMPTY = {
  role: 'director' as 'consultant' | 'director' | 'collaborator',
  fullName: '',
  email: '',
  whatsapp: '',
  password: '',
  // Consultor
  companyName: '',
  plan: 'starter',
  credits: 100,
  // Director / Colaborador
  caseId: '',
  positionId: '',
}

function generatePassword(): string {
  return `Bd-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 9000 + 1000)}`
}

export default function UsuariosAdminClient() {
  const [users, setUsers] = useState<User[]>([])
  const [cases, setCases] = useState<CaseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterKind, setFilterKind] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [tempPwFor, setTempPwFor] = useState<{ email: string; pw: string } | null>(null)
  const [creditsFor, setCreditsFor] = useState<User | null>(null)
  const [creditsValue, setCreditsValue] = useState(0)
  const [editFor, setEditFor] = useState<User | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')

  const [showNewUser, setShowNewUser] = useState(false)
  const [newUser, setNewUser] = useState(NEW_USER_EMPTY)
  const [newUserPositions, setNewUserPositions] = useState<Position[]>([])
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [newUserSaving, setNewUserSaving] = useState(false)
  const [newUserError, setNewUserError] = useState<string | null>(null)
  const [newUserResult, setNewUserResult] = useState<{ email: string; pw?: string; activationUrl?: string } | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setUsers(data.users ?? [])
    setCases(data.cases ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function setNewUserField(k: string, v: unknown) {
    setNewUser(prev => ({ ...prev, [k]: v }))
  }

  async function onSelectCase(caseId: string) {
    setNewUserField('caseId', caseId)
    setNewUserField('positionId', '')
    setNewUserPositions([])
    if (!caseId) return
    setLoadingPositions(true)
    const res = await fetch(`/api/consultant/case-job-positions?caseId=${caseId}`)
    const data = await res.json()
    setNewUserPositions(data.positions ?? [])
    setLoadingPositions(false)
  }

  function openNewUser() {
    setNewUser(NEW_USER_EMPTY)
    setNewUserPositions([])
    setNewUserError(null)
    setNewUserResult(null)
    setShowNewUser(true)
  }

  async function createNewUser() {
    setNewUserSaving(true)
    setNewUserError(null)

    if (newUser.role === 'consultant') {
      const res = await fetch('/api/admin/consultores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          companyName: newUser.companyName,
          fullName: newUser.fullName,
          whatsapp: newUser.whatsapp,
          plan: newUser.plan,
          credits: newUser.credits,
        }),
      })
      const data = await res.json()
      setNewUserSaving(false)
      if (!res.ok) { setNewUserError(data.error ?? 'Error al crear el consultor'); return }
      setNewUserResult({ email: newUser.email, pw: data.tempPassword ?? undefined })
      load()
      return
    }

    // Director / Colaborador — alta directa con contraseña (activo de inmediato)
    const res = await fetch('/api/consultant/create-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: newUser.caseId,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        jobPositionId: newUser.positionId,
        businessRoleId: null,
        permissions: newUser.role === 'director' ? { modules: ['M1','M2','M3','M4','M5','M6','M7'] } : { modules: [] },
        fullName: newUser.fullName,
        whatsappPhone: newUser.whatsapp,
      }),
    })
    const data = await res.json()
    setNewUserSaving(false)
    if (!res.ok) { setNewUserError(data.error ?? 'Error al crear el usuario'); return }
    setNewUserResult({ email: newUser.email })
    load()
  }

  async function act(userId: string, action: string, extra?: any) {
    setBusy(userId + action)
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, ...extra }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(data.error ?? 'Error'); return null }
    return data
  }

  async function toggleBan(u: User) {
    const action = u.banned ? 'unban' : 'ban'
    if (!u.banned && !confirm(`¿Bloquear el acceso de ${u.email}? No podrá iniciar sesión hasta desbloquearlo.`)) return
    const data = await act(u.id, action)
    if (data) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, banned: data.banned } : x))
  }

  async function resetPassword(u: User) {
    if (!confirm(`¿Generar una contraseña temporal nueva para ${u.email}? La actual dejará de funcionar.`)) return
    const data = await act(u.id, 'reset_password')
    if (data?.tempPassword) setTempPwFor({ email: u.email, pw: data.tempPassword })
  }

  function openCredits(u: User) {
    setCreditsFor(u)
    setCreditsValue(u.creditsBalance ?? 0)
  }
  async function saveCredits() {
    if (!creditsFor?.accountId) return
    const data = await act(creditsFor.id, 'set_credits', { accountId: creditsFor.accountId, credits: creditsValue })
    if (data) setUsers(prev => prev.map(x => x.id === creditsFor.id ? { ...x, creditsBalance: data.creditsBalance } : x))
    setCreditsFor(null)
  }

  function openEdit(u: User) {
    setEditFor(u)
    setEditFullName(u.fullName ?? '')
    setEditEmail(u.email ?? '')
    setEditWhatsapp(u.whatsappPhone ?? '')
  }
  async function saveEdit() {
    if (!editFor) return
    const data = await act(editFor.id, 'update_profile', {
      kind: editFor.kind,
      accountId: editFor.accountId,
      caseUserId: editFor.caseUserId,
      fullName: editFullName,
      email: editEmail !== editFor.email ? editEmail : undefined,
      whatsapp: editWhatsapp,
    })
    if (data) {
      setUsers(prev => prev.map(x => x.id === editFor.id
        ? { ...x, fullName: editFullName, whatsappPhone: editWhatsapp, email: data.email ?? x.email }
        : x))
      setEditFor(null)
    }
  }

  const filtered = users.filter(u => {
    if (filterKind !== 'all' && u.kind !== filterKind) return false
    const q = query.toLowerCase().trim()
    if (!q) return true
    return (u.email ?? '').toLowerCase().includes(q) || (u.companyName ?? '').toLowerCase().includes(q) || (u.jobTitle ?? '').toLowerCase().includes(q) || (u.fullName ?? '').toLowerCase().includes(q)
  })

  const counts = users.reduce((acc: Record<string, number>, u) => { acc[u.kind] = (acc[u.kind] ?? 0) + 1; return acc }, {})

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
          <h1 className="text-xl font-bold text-ink mt-1">Usuarios</h1>
          <p className="text-muted text-sm mt-0.5">Gestión de soporte: activar/bloquear, resetear contraseña, ajustar créditos, editar datos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNewUser} className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
            + Nuevo Usuario
          </button>
          <Link href={'/admin/consultores' as any} className="btn-secondary text-sm px-4 py-2 whitespace-nowrap">
            + Crear consultor
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por correo, empresa o puesto…"
          className="input-field text-sm max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all', label: `Todos (${users.length})` },
            { id: 'consultant', label: `Consultores (${counts.consultant ?? 0})` },
            { id: 'director', label: `Directivos (${counts.director ?? 0})` },
            { id: 'collaborator', label: `Colaboradores (${counts.collaborator ?? 0})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterKind(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterKind === f.id ? 'bg-accent text-white border-accent' : 'border-subtle text-muted hover:bg-surface-2'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5 ml-auto">↻ Recargar</button>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-sm text-muted">Cargando usuarios…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle text-xs text-faint uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Empresa / Caso</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filtered.map(u => (
                <tr key={u.id} className={u.banned ? 'bg-rose-50/40' : ''}>
                  <td className="px-4 py-3">
                    <p className="text-ink font-medium">{u.fullName || u.email}</p>
                    {u.fullName && <p className="text-xs text-faint">{u.email}</p>}
                    {u.jobTitle && <p className="text-xs text-faint">{u.jobTitle}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${KIND_PILL[u.kind]}`}>{KIND_LABEL[u.kind]}</span>
                      {u.businessRole && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">{u.businessRole}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.companyName ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {u.creditsBalance !== null ? (
                      <span className={u.creditsBalance <= 20 ? 'text-rose-600 font-medium' : 'text-ink'}>{u.creditsBalance}</span>
                    ) : <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.banned
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">Bloqueado</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Activo</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {u.kind !== 'super_admin' && (
                        <button onClick={() => toggleBan(u)} disabled={!!busy}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${u.banned ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'border-rose-300 text-rose-600 hover:bg-rose-50'}`}>
                          {u.banned ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      )}
                      {u.kind !== 'super_admin' && (
                        <button onClick={() => resetPassword(u)} disabled={!!busy}
                          className="text-xs px-2.5 py-1 rounded-lg border border-subtle text-muted hover:bg-surface-2 disabled:opacity-50">
                          Resetear contraseña
                        </button>
                      )}
                      {u.kind === 'consultant' && (
                        <button onClick={() => openCredits(u)} disabled={!!busy}
                          className="text-xs px-2.5 py-1 rounded-lg border border-subtle text-muted hover:bg-surface-2 disabled:opacity-50">
                          Créditos
                        </button>
                      )}
                      {(u.kind === 'consultant' || u.kind === 'director' || u.kind === 'collaborator') && (
                        <button onClick={() => openEdit(u)} disabled={!!busy}
                          className="text-xs px-2.5 py-1 rounded-lg border border-subtle text-muted hover:bg-surface-2 disabled:opacity-50">
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-faint text-sm">Sin usuarios que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo usuario */}
      {showNewUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowNewUser(false)}>
          <div className="card p-6 max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-ink">Nuevo Usuario</h3>

            {newUserResult ? (
              <div className="space-y-3">
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  ✓ {newUserResult.email} creado correctamente.
                </p>
                {newUserResult.pw && (
                  <div className="bg-surface-2 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-muted mb-1">Contraseña temporal</p>
                    <p className="font-mono text-lg text-ink select-all">{newUserResult.pw}</p>
                  </div>
                )}
                <button onClick={() => setShowNewUser(false)} className="btn-primary w-full text-sm">Listo</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="label-text">Rol *</label>
                  <select value={newUser.role} onChange={e => setNewUserField('role', e.target.value)} className="input-field text-sm">
                    <option value="consultant">Consultor</option>
                    <option value="director">Director</option>
                    <option value="collaborator">Colaborador</option>
                  </select>
                </div>

                <div>
                  <label className="label-text">Nombre del usuario</label>
                  <input value={newUser.fullName} onChange={e => setNewUserField('fullName', e.target.value)} className="input-field text-sm" placeholder="Nombre y apellido" />
                </div>

                <div>
                  <label className="label-text">Correo electrónico *</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUserField('email', e.target.value)} className="input-field text-sm" placeholder="usuario@empresa.com" />
                </div>

                <div>
                  <label className="label-text">WhatsApp *</label>
                  <input type="tel" value={newUser.whatsapp} onChange={e => setNewUserField('whatsapp', e.target.value)} className="input-field text-sm" placeholder="+52 55 1234 5678" />
                </div>

                {newUser.role === 'consultant' ? (
                  <>
                    <div>
                      <label className="label-text">Nombre empresa *</label>
                      <input value={newUser.companyName} onChange={e => setNewUserField('companyName', e.target.value)} className="input-field text-sm" placeholder="Consultoría XYZ" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-text">Plan</label>
                        <select value={newUser.plan} onChange={e => setNewUserField('plan', e.target.value)} className="input-field text-sm">
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-text">Créditos iniciales</label>
                        <input type="number" value={newUser.credits} onChange={e => setNewUserField('credits', Number(e.target.value))} className="input-field text-sm" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="label-text">Empresa / Caso *</label>
                      <select value={newUser.caseId} onChange={e => onSelectCase(e.target.value)} className="input-field text-sm">
                        <option value="">Seleccionar…</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>{c.companyName}{c.accountEmail ? ` — ${c.accountEmail}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Puesto *</label>
                      <select
                        value={newUser.positionId}
                        onChange={e => setNewUserField('positionId', e.target.value)}
                        disabled={!newUser.caseId || loadingPositions}
                        className="input-field text-sm disabled:opacity-50"
                      >
                        <option value="">{loadingPositions ? 'Cargando…' : newUser.caseId ? 'Seleccionar…' : 'Elige primero una empresa'}</option>
                        {newUserPositions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {newUser.caseId && !loadingPositions && newUserPositions.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">Este caso no tiene puestos creados todavía.</p>
                      )}
                    </div>
                    <div>
                      <label className="label-text">Contraseña *</label>
                      <div className="flex gap-2">
                        <input value={newUser.password} onChange={e => setNewUserField('password', e.target.value)} className="input-field text-sm flex-1" placeholder="Mínimo 8 caracteres" />
                        <button type="button" onClick={() => setNewUserField('password', generatePassword())} className="btn-secondary text-xs whitespace-nowrap px-3">
                          Generar
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {newUserError && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{newUserError}</p>}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowNewUser(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                  <button
                    onClick={createNewUser}
                    disabled={newUserSaving || !newUser.email.trim() || !newUser.whatsapp.trim() || (
                      newUser.role === 'consultant'
                        ? !newUser.companyName.trim() || !newUser.fullName.trim()
                        : !newUser.caseId || !newUser.positionId || newUser.password.length < 8
                    )}
                    className="btn-primary flex-1 text-sm disabled:opacity-50"
                  >
                    {newUserSaving ? 'Creando…' : 'Crear usuario'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal contraseña temporal */}
      {tempPwFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setTempPwFor(null)}>
          <div className="card p-6 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-ink">Contraseña temporal generada</h3>
            <p className="text-xs text-muted">Compártela con <strong>{tempPwFor.email}</strong>. Deberá cambiarla después. No se volverá a mostrar.</p>
            <div className="bg-surface-2 rounded-xl px-4 py-3 font-mono text-lg text-center text-ink select-all">{tempPwFor.pw}</div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(tempPwFor.pw)} className="btn-secondary flex-1 text-sm">Copiar</button>
              <button onClick={() => setTempPwFor(null)} className="btn-primary flex-1 text-sm">Listo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar datos */}
      {editFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEditFor(null)}>
          <div className="card p-6 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-ink">Editar datos</h3>
            <div>
              <label className="label-text">Nombre completo</label>
              <input value={editFullName} onChange={e => setEditFullName(e.target.value)} className="input-field text-sm" placeholder="Nombre y apellido" />
            </div>
            <div>
              <label className="label-text">Correo electrónico</label>
              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="label-text">WhatsApp</label>
              <input type="tel" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} className="input-field text-sm" placeholder="+52 55 1234 5678" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditFor(null)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button onClick={saveEdit} disabled={!!busy} className="btn-primary flex-1 text-sm disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal créditos */}
      {creditsFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setCreditsFor(null)}>
          <div className="card p-6 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-ink">Ajustar créditos</h3>
            <p className="text-xs text-muted">{creditsFor.email} · {creditsFor.companyName}</p>
            <input type="number" min={0} value={creditsValue} onChange={e => setCreditsValue(Number(e.target.value))} className="input-field" />
            <div className="flex gap-2">
              <button onClick={() => setCreditsFor(null)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button onClick={saveCredits} disabled={!!busy} className="btn-primary flex-1 text-sm disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
