'use client'

import { useState } from 'react'

interface Account {
  id: string
  email: string
  company_name: string
  subscription_plan: string
  credits_balance: number
}

export default function CreditosAdminClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState(0)
  const [saving, setSaving] = useState(false)

  function startEdit(a: Account) {
    setEditingId(a.id)
    setEditValue(a.credits_balance)
  }

  async function saveCredits() {
    if (!editingId) return
    setSaving(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_credits', accountId: editingId, credits: editValue }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error ?? 'Error'); return }
    setAccounts(prev => prev.map(a => a.id === editingId ? { ...a, credits_balance: data.creditsBalance } : a))
    setEditingId(null)
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-subtle text-xs text-faint uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Consultor</th>
            <th className="px-4 py-3 text-left">Plan</th>
            <th className="px-4 py-3 text-right">Créditos</th>
            <th className="px-4 py-3 text-center">Alerta</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-subtle">
          {accounts.map(a => (
            <tr key={a.id} className="hover:bg-surface-2 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{a.company_name}</p>
                <p className="text-xs text-faint">{a.email}</p>
              </td>
              <td className="px-4 py-3 text-muted capitalize">{a.subscription_plan}</td>
              <td className={`px-4 py-3 text-right font-mono font-bold ${
                a.credits_balance < 10 ? 'text-red-600' : a.credits_balance < 20 ? 'text-amber-600' : 'text-ink'
              }`}>
                {editingId === a.id ? (
                  <input
                    type="number"
                    min={0}
                    value={editValue}
                    onChange={e => setEditValue(Number(e.target.value))}
                    className="input-field text-sm w-24 text-right font-mono"
                    autoFocus
                  />
                ) : a.credits_balance}
              </td>
              <td className="px-4 py-3 text-center">
                {a.credits_balance < 10 ? '🔴' : a.credits_balance < 20 ? '🟡' : '🟢'}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === a.id ? (
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={saveCredits} disabled={saving} className="text-xs px-2.5 py-1 rounded-lg border border-accent text-accent hover:bg-accent-soft disabled:opacity-50">
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs px-2.5 py-1 rounded-lg border border-subtle text-muted hover:bg-surface-2">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(a)} className="text-xs px-2.5 py-1 rounded-lg border border-subtle text-muted hover:bg-surface-2">Editar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
