'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Consultor {
  id: string
  email: string
  company_name: string
  credits_balance: number
  subscription_plan: string
  status: string
  created_at: string
}

interface Props { consultores: Consultor[] }

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }
const PLAN_COLORS: Record<string, string> = {
  starter: 'text-muted bg-surface-2 border-subtle',
  pro: 'text-purple-700 bg-purple-50 border-purple-200',
  enterprise: 'text-amber-700 bg-amber-50 border-amber-200',
}

export default function ConsultoresClient({ consultores: initial }: Props) {
  const [consultores, setConsultores] = useState<Consultor[]>(initial)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', companyName: '', plan: 'starter', credits: 100 })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editCredits, setEditCredits] = useState(0)
  const [editStatus, setEditStatus] = useState('')

  function set(k: string, v: unknown) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleCreate() {
    setSaving(true)
    const res = await fetch('/api/admin/consultores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setConsultores(prev => [data.account, ...prev])
      setShowModal(false)
      setForm({ email: '', companyName: '', plan: 'starter', credits: 100 })
    }
  }

  async function handleUpdate(accountId: string) {
    const res = await fetch('/api/admin/consultores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, credits: editCredits, status: editStatus }),
    })
    const data = await res.json()
    if (res.ok) {
      setConsultores(prev => prev.map(c => c.id === accountId ? data.account : c))
      setEditId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
          <h1 className="text-xl font-bold text-ink mt-1">Consultores</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Nuevo consultor</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle text-xs text-faint uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Empresa / Email</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-right">Créditos</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {consultores.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-faint">Sin consultores aún</td></tr>
            )}
            {consultores.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{c.company_name}</p>
                  <p className="text-xs text-faint">{c.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${PLAN_COLORS[c.subscription_plan]}`}>
                    {PLAN_LABELS[c.subscription_plan] ?? c.subscription_plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-ink font-mono">{c.credits_balance}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    c.status === 'active' ? 'text-emerald-700 bg-emerald-50'
                    : 'text-red-700 bg-red-50'
                  }`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditId(c.id); setEditCredits(c.credits_balance); setEditStatus(c.status) }}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-ink">Nuevo consultor</h3>
            <div>
              <label className="label-text">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" placeholder="consultor@empresa.com" />
            </div>
            <div>
              <label className="label-text">Nombre empresa</label>
              <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)} className="input-field" placeholder="Consultoría XYZ" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Plan</label>
                <select value={form.plan} onChange={e => set('plan', e.target.value)} className="input-field">
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="label-text">Créditos iniciales</label>
                <input type="number" value={form.credits} onChange={e => set('credits', Number(e.target.value))} className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.email || !form.companyName} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Creando…' : 'Crear consultor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-ink">Editar consultor</h3>
            <div>
              <label className="label-text">Créditos</label>
              <input type="number" value={editCredits} onChange={e => setEditCredits(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="label-text">Estado</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="input-field">
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="trial">Trial</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditId(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleUpdate(editId)} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
