'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CaseRow {
  id: string
  company_name: string
  industry: string | null
  status: string
  strategic_intent: string | null
  created_at: string
  account_id: string
}

interface Account {
  id: string
  company_name: string
  email: string
}

interface Props {
  initialCases: CaseRow[]
  accounts: Account[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  completed: 'text-faint bg-surface-2 border-subtle',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
}

const INTENT_ICON: Record<string, string> = { growth: '🔵', restructure: '🟡', exit: '🔴', mixed: '⚪' }

const INDUSTRIES = [
  'Logística / 3PL', 'Manufactura', 'Comercio y distribución', 'Servicios profesionales',
  'Tecnología', 'Alimentos y bebidas', 'Construcción', 'Salud', 'Retail', 'Otro',
]

export default function CasosAdminClient({ initialCases, accounts }: Props) {
  const router = useRouter()
  const [cases, setCases] = useState<CaseRow[]>(initialCases)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    accountId: '',
    companyName: '',
    industry: '',
    description: '',
    intent: 'mixed',
    strategicNotes: '',
  })

  const accountMap: Record<string, Account> = {}
  for (const a of accounts) accountMap[a.id] = a

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/casos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: form.accountId,
        companyName: form.companyName,
        industry: form.industry,
        description: form.description,
        strategicIntent: form.intent,
        strategicNotes: form.strategicNotes,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Error al crear el caso'); return }
    setCases(prev => [data.case, ...prev])
    setShowModal(false)
    setForm({ accountId: '', companyName: '', industry: '', description: '', intent: 'mixed', strategicNotes: '' })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
          <h1 className="text-xl font-bold text-ink mt-1">Casos globales</h1>
          <p className="text-muted text-sm mt-0.5">{cases.length} casos en la plataforma</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
          + Nuevo caso
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle text-xs text-faint uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Industria</th>
              <th className="px-4 py-3 text-left">Consultor</th>
              <th className="px-4 py-3 text-center">Intención</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {cases.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-faint">Sin casos aún</td></tr>
            )}
            {cases.map(c => {
              const acc = accountMap[c.account_id]
              return (
                <tr key={c.id} onClick={() => router.push(`/admin/casos/${c.id}` as any)} className="hover:bg-surface-2 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-ink">{c.company_name}</td>
                  <td className="px-4 py-3 text-muted">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3">
                    {acc ? (
                      <>
                        <p className="text-ink text-xs">{acc.company_name}</p>
                        <p className="text-faint text-xs">{acc.email}</p>
                      </>
                    ) : <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-base" title={c.strategic_intent ?? 'mixed'}>
                    {INTENT_ICON[c.strategic_intent ?? 'mixed']}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.pending}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-faint text-xs">
                    {new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-ink">Nuevo caso (soporte)</h3>
            <p className="text-xs text-muted -mt-2">Crea un caso a nombre de un consultor para resolver un inconveniente puntual.</p>

            <div>
              <label className="label-text">Consultor dueño del caso *</label>
              <select value={form.accountId} onChange={e => set('accountId', e.target.value)} className="input-field">
                <option value="">Seleccionar…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.company_name} — {a.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Nombre de la empresa *</label>
              <input value={form.companyName} onChange={e => set('companyName', e.target.value)} className="input-field" placeholder="Ej. Famtell S.A. de C.V." />
            </div>

            <div>
              <label className="label-text">Industria</label>
              <select value={form.industry} onChange={e => set('industry', e.target.value)} className="input-field">
                <option value="">Seleccionar…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="label-text">Descripción breve</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="input-field resize-none" placeholder="Contexto inicial del caso" />
            </div>

            <div>
              <label className="label-text">Intención estratégica inicial</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {[
                  { value: 'growth', label: '🔵 Crecimiento' },
                  { value: 'restructure', label: '🟡 Redimensionamiento' },
                  { value: 'exit', label: '🔴 Salida / Asociación' },
                  { value: 'mixed', label: '⬜ Sin definir aún' },
                ].map(intent => (
                  <button
                    key={intent.value}
                    type="button"
                    onClick={() => set('intent', intent.value)}
                    className={`text-left rounded-xl border p-2.5 text-xs transition-all ${
                      form.intent === intent.value ? 'border-accent bg-accent-soft' : 'border-subtle bg-surface-2 hover:border-accent/30'
                    }`}
                  >
                    {intent.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowModal(false); setError(null) }} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.accountId || !form.companyName.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Creando…' : 'Crear caso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
