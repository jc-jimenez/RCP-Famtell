'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

interface Props {
  caseId: string
  companyName: string
  industry: string | null
  creditsRemaining: number
  hasBrief: boolean
}

const PROPOSAL_COST = 5

export default function ProposalClient({ caseId, companyName, industry, creditsRemaining, hasBrief }: Props) {
  const { email } = useSupabaseUser()
  const [credits, setCredits] = useState(creditsRemaining)
  const [generating, setGenerating] = useState(false)
  const [proposal, setProposal] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    prospectName: '',
    prospectCompany: '',
    prospectNeed: '',
    proposedValue: '',
    currency: 'MXN',
  })

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    setProposal(null)

    const res = await fetch('/api/ai/generate-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, ...form }),
    })
    const data = await res.json()
    setGenerating(false)

    if (!res.ok) { setError(data.error); return }
    setProposal(data.proposal)
    setCredits(c => c - data.creditsUsed)
  }

  async function handleCopy() {
    if (!proposal) return
    await navigator.clipboard.writeText(proposal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell role="consultant" email={email ?? ''}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink mb-2 inline-block">
              ← {companyName}
            </Link>
            <h1 className="text-xl font-bold text-ink">Generador de Propuestas</h1>
            <p className="text-muted text-sm mt-0.5">{PROPOSAL_COST} créditos por propuesta · {credits} disponibles</p>
          </div>
        </div>

        {!hasBrief && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700 mb-1">Sin brief generado</p>
            <p className="text-xs text-amber-600">
              Las propuestas son más precisas cuando existe un Brief M7. Puedes generar igual con el contexto base del caso.
            </p>
          </div>
        )}

        <form onSubmit={handleGenerate} className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Datos del prospecto</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Nombre del contacto *</label>
              <input
                value={form.prospectName}
                onChange={e => setForm(f => ({ ...f, prospectName: e.target.value }))}
                className="input-field"
                placeholder="Lic. María González"
                required
              />
            </div>
            <div>
              <label className="label-text">Empresa</label>
              <input
                value={form.prospectCompany}
                onChange={e => setForm(f => ({ ...f, prospectCompany: e.target.value }))}
                className="input-field"
                placeholder="Industrias del Norte S.A."
              />
            </div>
          </div>

          <div>
            <label className="label-text">Necesidad detectada *</label>
            <textarea
              value={form.prospectNeed}
              onChange={e => setForm(f => ({ ...f, prospectNeed: e.target.value }))}
              rows={3}
              className="input-field resize-none"
              placeholder="Ej: Necesitan optimizar su cadena de suministro y reducir costos logísticos en un 15%..."
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label-text">Valor propuesto (opcional)</label>
              <input
                type="number"
                value={form.proposedValue}
                onChange={e => setForm(f => ({ ...f, proposedValue: e.target.value }))}
                className="input-field"
                placeholder="85000"
              />
            </div>
            <div>
              <label className="label-text">Moneda</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input-field">
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={generating || credits < PROPOSAL_COST || !form.prospectName || !form.prospectNeed}
            className="btn-primary w-full disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Nova está redactando…
              </span>
            ) : `✨ Generar propuesta (${PROPOSAL_COST} créditos)`}
          </button>
        </form>

        {proposal && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">N</div>
                <span className="text-sm font-semibold text-ink">Propuesta generada por Nova</span>
              </div>
              <button onClick={handleCopy} className="btn-secondary text-xs px-3">
                {copied ? '✓ Copiado' : 'Copiar texto'}
              </button>
            </div>

            <div className="prose prose-sm max-w-none text-ink">
              {proposal.split('\n').map((line, i) => {
                if (line.startsWith('## ') || line.startsWith('# ')) {
                  return <h3 key={i} className="text-sm font-bold text-ink mt-4 mb-1">{line.replace(/^#+\s/, '')}</h3>
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="text-sm font-semibold text-ink mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
                }
                if (line.startsWith('- ')) {
                  return <p key={i} className="text-sm text-ink flex gap-2 ml-2"><span className="text-accent flex-shrink-0">·</span>{line.slice(2)}</p>
                }
                if (line.trim() === '') return <div key={i} className="h-2" />
                return <p key={i} className="text-sm text-ink leading-relaxed">{line}</p>
              })}
            </div>

            <div className="pt-2 border-t border-subtle">
              <button
                onClick={() => { setProposal(null); setForm({ prospectName: '', prospectCompany: '', prospectNeed: '', proposedValue: '', currency: 'MXN' }) }}
                className="btn-secondary text-xs"
              >
                Nueva propuesta
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
