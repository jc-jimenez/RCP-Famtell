'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Consultor {
  id: string
  email: string
  company_name: string
  full_name: string | null
  whatsapp_phone: string | null
  credits_balance: number
  credits_total: number
  subscription_plan: string
  status: string
  created_at: string
  last_login: string | null
  active_cases: number
}

interface Props { consultores: Consultor[] }

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }
const PLAN_COLORS: Record<string, string> = {
  starter: 'text-muted bg-surface-2 border-subtle',
  pro: 'text-purple-700 bg-purple-50 border-purple-200',
  enterprise: 'text-amber-700 bg-amber-50 border-amber-200',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRelative(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem`
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`
  return formatDate(iso)
}

function exportCSV(consultores: Consultor[]) {
  const headers = ['Empresa', 'Email', 'Plan', 'Créditos disponibles', 'Créditos total', 'Casos activos', 'Último login', 'Estado', 'Registro']
  const rows = consultores.map(c => [
    c.company_name,
    c.email,
    PLAN_LABELS[c.subscription_plan] ?? c.subscription_plan,
    c.credits_balance,
    c.credits_total,
    c.active_cases,
    c.last_login ? new Date(c.last_login).toLocaleDateString('es-MX') : '',
    c.status,
    new Date(c.created_at).toLocaleDateString('es-MX'),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rcpai_consultores_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ConsultoresClient({ consultores: initial }: Props) {
  const [consultores, setConsultores] = useState<Consultor[]>(initial)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', companyName: '', fullName: '', whatsapp: '', plan: 'starter', credits: 100 })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editCredits, setEditCredits] = useState(0)
  const [editStatus, setEditStatus] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [search, setSearch] = useState('')

  function set(k: string, v: unknown) { setForm(prev => ({ ...prev, [k]: v })) }

  const filtered = consultores.filter(c =>
    !search || c.email.includes(search) || c.company_name.toLowerCase().includes(search.toLowerCase())
  )

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
      setForm({ email: '', companyName: '', fullName: '', whatsapp: '', plan: 'starter', credits: 100 })
    }
  }

  async function handleUpdate(accountId: string) {
    const res = await fetch('/api/admin/consultores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, credits: editCredits, status: editStatus, fullName: editFullName, whatsapp: editWhatsapp }),
    })
    const data = await res.json()
    if (res.ok) {
      setConsultores(prev => prev.map(c => c.id === accountId ? { ...c, ...data.account } : c))
      setEditId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
          <h1 className="text-xl font-bold text-ink mt-1">Consultores <span className="text-sm font-normal text-faint">({consultores.length})</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="input-field text-sm w-48"
          />
          <button
            onClick={() => exportCSV(filtered)}
            className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
            title="Exportar para campaña de marketing"
          >
            ↓ CSV
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Nuevo</button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: consultores.length },
          { label: 'Activos', value: consultores.filter(c => c.status === 'active').length },
          { label: 'Login último mes', value: consultores.filter(c => c.last_login && Date.now() - new Date(c.last_login).getTime() < 30 * 86400000).length },
          { label: 'Sin actividad +30d', value: consultores.filter(c => !c.last_login || Date.now() - new Date(c.last_login).getTime() > 30 * 86400000).length },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-xs text-faint mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-subtle text-xs text-faint uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Empresa / Email</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-center">Casos</th>
                <th className="px-4 py-3 text-center">Último login</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-faint">Sin resultados</td></tr>
              )}
              {filtered.map((c) => {
                const daysInactive = c.last_login ? Math.floor((Date.now() - new Date(c.last_login).getTime()) / 86400000) : 999
                return (
                  <tr key={c.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{c.full_name || c.company_name || '—'}</p>
                      <p className="text-xs text-faint">{c.company_name} · {c.email}</p>
                      {c.whatsapp_phone && <p className="text-xs text-faint">{c.whatsapp_phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${PLAN_COLORS[c.subscription_plan]}`}>
                        {PLAN_LABELS[c.subscription_plan] ?? c.subscription_plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-medium ${c.credits_balance <= 20 ? 'text-red-600' : 'text-ink'}`}>
                        {c.credits_balance}
                      </span>
                      <span className="text-xs text-faint"> / {c.credits_total}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.active_cases > 0 ? 'text-blue-700 bg-blue-50' : 'text-faint bg-surface-2'
                      }`}>
                        {c.active_cases} caso{c.active_cases !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${daysInactive > 30 ? 'text-orange-600' : 'text-muted'}`} title={c.last_login ?? ''}>
                        {formatRelative(c.last_login)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'active' ? 'text-emerald-700 bg-emerald-50'
                        : 'text-red-700 bg-red-50'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditId(c.id); setEditCredits(c.credits_balance); setEditStatus(c.status); setEditFullName(c.full_name ?? ''); setEditWhatsapp(c.whatsapp_phone ?? '') }}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
            <div>
              <label className="label-text">Nombre completo</label>
              <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)} className="input-field" placeholder="Nombre y apellido" />
            </div>
            <div>
              <label className="label-text">WhatsApp</label>
              <input type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} className="input-field" placeholder="+52 55 1234 5678" />
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
              <button onClick={handleCreate} disabled={saving || !form.email || !form.companyName || !form.fullName.trim() || !form.whatsapp.trim()} className="btn-primary flex-1 disabled:opacity-50">
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
              <label className="label-text">Nombre completo</label>
              <input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)} className="input-field" placeholder="Nombre y apellido" />
            </div>
            <div>
              <label className="label-text">WhatsApp</label>
              <input type="tel" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} className="input-field" placeholder="+52 55 1234 5678" />
            </div>
            <div>
              <label className="label-text">Créditos disponibles</label>
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
