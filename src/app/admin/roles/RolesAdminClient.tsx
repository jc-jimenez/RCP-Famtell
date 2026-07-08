'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BusinessRole {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
}

export default function RolesAdminClient() {
  const [roles, setRoles] = useState<BusinessRole[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/roles')
    const data = await res.json()
    setRoles(data.roles ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createRole() {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: newDescription.trim() || null }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Error'); return }
    setRoles(prev => [...prev, data.role])
    setNewName('')
    setNewDescription('')
  }

  function startEdit(r: BusinessRole) {
    setEditingId(r.id)
    setEditName(r.name)
    setEditDescription(r.description ?? '')
  }

  async function saveEdit() {
    if (!editingId) return
    const name = editName.trim()
    if (!name) { alert('El nombre es obligatorio'); return }
    setBusy(true)
    const res = await fetch('/api/admin/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, name, description: editDescription.trim() || null }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Error'); return }
    setRoles(prev => prev.map(r => r.id === editingId ? data.role : r))
    setEditingId(null)
  }

  async function deleteRole(r: BusinessRole) {
    if (!confirm(`¿Eliminar el rol "${r.name}"? Los puestos y usuarios que lo tengan asignado quedarán sin rol.`)) return
    setBusy(true)
    const res = await fetch(`/api/admin/roles?id=${r.id}`, { method: 'DELETE' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Error'); return }
    setRoles(prev => prev.filter(x => x.id !== r.id))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
        <h1 className="text-xl font-bold text-ink mt-1">Catálogo de Roles</h1>
        <p className="text-muted text-sm mt-0.5">
          Etiqueta descriptiva global (no afecta permisos). El consultor la asigna a cada puesto y a cada usuario del caso.
        </p>
      </div>

      {/* Alta */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-ink">Nuevo rol</h2>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nombre del rol (ej. Dirección)"
          className="input-field text-sm"
        />
        <textarea
          value={newDescription}
          onChange={e => setNewDescription(e.target.value)}
          placeholder="Descripción de funciones (opcional)"
          className="input-field text-sm"
          rows={2}
        />
        <button onClick={createRole} disabled={busy || !newName.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
          + Agregar rol
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card p-10 text-center text-sm text-muted">Cargando roles…</div>
      ) : (
        <div className="space-y-2">
          {roles.map(r => (
            <div key={r.id} className="card p-4">
              {editingId === r.id ? (
                <div className="space-y-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="input-field text-sm" />
                  <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="input-field text-sm" rows={2} />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={busy} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.name}</p>
                    {r.description && <p className="text-xs text-muted mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => startEdit(r)} className="text-xs px-2.5 py-1 rounded-lg border border-subtle text-muted hover:bg-surface-2">Editar</button>
                    <button onClick={() => deleteRole(r)} disabled={busy} className="text-xs px-2.5 py-1 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50">Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {roles.length === 0 && (
            <div className="card p-10 text-center text-faint text-sm">Sin roles todavía.</div>
          )}
        </div>
      )}
    </div>
  )
}
