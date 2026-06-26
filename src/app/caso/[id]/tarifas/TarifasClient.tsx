'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

interface Props {
  caseId: string
  companyName: string
}

const PROJECT_TYPES = [
  { id: 'diagnostico',     label: 'Diagnóstico empresarial',  factor: 1.0 },
  { id: 'consultoria',     label: 'Consultoría estratégica',  factor: 1.2 },
  { id: 'implementacion',  label: 'Implementación / ejecución', factor: 1.15 },
  { id: 'capacitacion',    label: 'Capacitación / taller',    factor: 0.9 },
  { id: 'auditoria',       label: 'Auditoría operativa',      factor: 1.1 },
]

const COMPLEXITY = [
  { id: 'low',    label: 'Baja',   factor: 0.85 },
  { id: 'medium', label: 'Media',  factor: 1.0  },
  { id: 'high',   label: 'Alta',   factor: 1.25 },
  { id: 'expert', label: 'Experto',factor: 1.5  },
]

const CURRENCIES = ['MXN', 'USD']

function fmt(n: number, cur: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, minimumFractionDigits: 0 }).format(n)
}

export default function TarifasClient({ caseId, companyName }: Props) {
  const { email } = useSupabaseUser()
  const [copied, setCopied] = useState(false)

  const [p, setP] = useState({
    projectType: 'diagnostico',
    complexity:  'medium',
    hours:       '40',
    ratePerHour: '800',
    expenses:    '5000',
    margin:      '30',
    currency:    'MXN',
    numPayments: '3',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setP(prev => ({ ...prev, [k]: e.target.value }))

  const calc = useMemo(() => {
    const hours      = Math.max(0, Number(p.hours) || 0)
    const rate       = Math.max(0, Number(p.ratePerHour) || 0)
    const expenses   = Math.max(0, Number(p.expenses) || 0)
    const marginPct  = Math.max(0, Math.min(90, Number(p.margin) || 0))
    const typeFactor = PROJECT_TYPES.find(t => t.id === p.projectType)?.factor ?? 1
    const cxFactor   = COMPLEXITY.find(c => c.id === p.complexity)?.factor ?? 1

    const laborBase  = hours * rate * typeFactor * cxFactor
    const subtotal   = laborBase + expenses
    const marginAmt  = subtotal * (marginPct / 100)
    const total      = subtotal + marginAmt

    const payments   = Math.max(1, Number(p.numPayments) || 1)
    const perPayment = total / payments

    const rateAdjusted = hours > 0 ? total / hours : 0

    return { laborBase, expenses, subtotal, marginAmt, total, perPayment, rateAdjusted, hours }
  }, [p])

  const cur = p.currency

  const summaryText = `COTIZACIÓN — ${companyName}

Tipo de proyecto: ${PROJECT_TYPES.find(t => t.id === p.projectType)?.label}
Complejidad: ${COMPLEXITY.find(c => c.id === p.complexity)?.label}
Horas estimadas: ${p.hours} h

DESGLOSE
Mano de obra: ${fmt(calc.laborBase, cur)}
Gastos directos: ${fmt(calc.expenses, cur)}
Subtotal: ${fmt(calc.subtotal, cur)}
Margen (${p.margin}%): ${fmt(calc.marginAmt, cur)}

TOTAL DEL PROYECTO: ${fmt(calc.total, cur)}
Tarifa efectiva por hora: ${fmt(calc.rateAdjusted, cur)}/h

ESQUEMA DE PAGOS (${p.numPayments} parcialidades)
${Array.from({ length: Number(p.numPayments) || 1 }).map((_, i) => `  Pago ${i + 1}: ${fmt(calc.perPayment, cur)}`).join('\n')}
`

  async function handleCopy() {
    await navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell role="consultant" email={email ?? ''}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink mb-2 inline-block">
            ← {companyName}
          </Link>
          <h1 className="text-xl font-bold text-ink">Calculadora de Tarifas</h1>
          <p className="text-muted text-sm mt-0.5">Calcula el precio justo para este proyecto</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">

          {/* Formulario */}
          <div className="card p-6 space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Tipo de proyecto</label>
                <select value={p.projectType} onChange={set('projectType')} className="input-field">
                  {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Nivel de complejidad</label>
                <select value={p.complexity} onChange={set('complexity')} className="input-field">
                  {COMPLEXITY.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Horas estimadas</label>
                <input type="number" min="1" value={p.hours} onChange={set('hours')} className="input-field" placeholder="40" />
              </div>
              <div>
                <label className="label-text">Tu tarifa base / hora</label>
                <input type="number" min="0" value={p.ratePerHour} onChange={set('ratePerHour')} className="input-field" placeholder="800" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Gastos directos (viáticos, etc.)</label>
                <input type="number" min="0" value={p.expenses} onChange={set('expenses')} className="input-field" placeholder="5000" />
              </div>
              <div>
                <label className="label-text">Margen de utilidad (%)</label>
                <input type="number" min="0" max="90" value={p.margin} onChange={set('margin')} className="input-field" placeholder="30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Moneda</label>
                <select value={p.currency} onChange={set('currency')} className="input-field">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Número de pagos</label>
                <select value={p.numPayments} onChange={set('numPayments')} className="input-field">
                  {['1','2','3','4','6','12'].map(n => <option key={n} value={n}>{n} pago{Number(n) > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            {/* Factores aplicados */}
            <div className="bg-surface-2 rounded-xl px-4 py-3 text-xs text-muted flex flex-wrap gap-3">
              <span>Factor tipo: ×{PROJECT_TYPES.find(t => t.id === p.projectType)?.factor.toFixed(2)}</span>
              <span>·</span>
              <span>Factor complejidad: ×{COMPLEXITY.find(c => c.id === p.complexity)?.factor.toFixed(2)}</span>
            </div>
          </div>

          {/* Resultado */}
          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Desglose</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Mano de obra</span>
                  <span className="text-ink font-medium">{fmt(calc.laborBase, cur)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Gastos directos</span>
                  <span className="text-ink font-medium">{fmt(calc.expenses, cur)}</span>
                </div>
                <div className="flex justify-between border-t border-subtle pt-2">
                  <span className="text-muted">Subtotal</span>
                  <span className="text-ink font-medium">{fmt(calc.subtotal, cur)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Margen ({p.margin}%)</span>
                  <span className="text-emerald-700 font-medium">{fmt(calc.marginAmt, cur)}</span>
                </div>
              </div>

              <div className="bg-accent-soft rounded-xl p-4 text-center border border-accent/20 mt-2">
                <p className="text-xs text-accent font-medium mb-1">Total del proyecto</p>
                <p className="text-2xl font-bold text-ink">{fmt(calc.total, cur)}</p>
                <p className="text-xs text-muted mt-1">= {fmt(calc.rateAdjusted, cur)}/h efectivo</p>
              </div>
            </div>

            {/* Esquema de pagos */}
            <div className="card p-5 space-y-3">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Esquema de pagos</h2>
              <div className="space-y-1.5">
                {Array.from({ length: Math.max(1, Number(p.numPayments) || 1) }).map((_, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted">Pago {i + 1}</span>
                    <span className="text-ink font-semibold">{fmt(calc.perPayment, cur)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleCopy} className="btn-secondary w-full text-sm">
              {copied ? '✓ Copiado' : 'Copiar cotización'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
