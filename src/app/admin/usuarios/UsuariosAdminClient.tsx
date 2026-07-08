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
  jobTitle: string | null
  fullName: string | null
  businessRole: string | null
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

export default function UsuariosAdminClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterKind, setFilterKind] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [tempPwFor, setTempPwFor] = useState<{ email: string; pw: string } | null>(null)
  const [creditsFor, setCreditsFor] = useState<User | null>(null)
  const [creditsValue, setCreditsValue] = useState(0)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

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

  const filtered = users.filter(u => {
    if (filterKind !== 'all' && u.kind !== filterKind) return false
    const q = query.toLowerCase().trim()
    if (!q) return true
    return (u.email ?? '').toLowerCase().includes(q) || (u.companyName ?? '').toLowerCase().includes(q) || (u.jobTitle ?? '').toLowerCase().includes(q) || (u.fullName ?? '').toLowerCase().includes(q)
  })

  const counts = users.reduce((acc: Record<string, number>, u) => { acc[u.kind] = (acc[u.kind] ?? 0) + 1; return acc }, {})

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
        <h1 className="text-xl font-bold text-ink mt-1">Usuarios</h1>
        <p className="text-muted text-sm mt-0.5">Gestión de soporte: activar/bloquear, resetear contraseña, ajustar créditos.</p>
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
