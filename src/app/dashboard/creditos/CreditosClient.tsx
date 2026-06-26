'use client'

import { useState } from 'react'

interface Account {
  id: string
  company_name: string
  credits_balance: number
  subscription_plan: string
  status: string
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$299/mes',
    credits: 100,
    features: ['100 créditos/mes', 'Hasta 3 casos activos', 'Módulos M1–M7', 'Soporte email'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$699/mes',
    credits: 500,
    features: ['500 créditos/mes', 'Casos ilimitados', 'Módulos M1–M7 + Acceso premium', 'Soporte prioritario', 'Brief PDF incluido'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Contactar',
    credits: 2000,
    features: ['2000 créditos/mes', 'Multi-consultor', 'Todos los módulos', 'Onboarding dedicado', 'API access'],
  },
]

const MODULE_COSTS: Record<string, number> = {
  M1: 10, M2: 10, M3: 10, M4: 10, M5: 10, M6: 10, M7: 15,
  'Brief': 20, 'Documento': 5, 'Check-in': 3,
}

export default function CreditosClient({ account }: { account: Account }) {
  const [loading, setLoading] = useState<string | null>(null)

  const planMax = account.subscription_plan === 'pro' ? 500 : account.subscription_plan === 'enterprise' ? 2000 : 100
  const balancePct = Math.min(100, (account.credits_balance / planMax) * 100)
  const barColor = balancePct > 40 ? 'bg-emerald-500' : balancePct > 15 ? 'bg-amber-400' : 'bg-red-500'

  async function handleUpgrade(planId: string) {
    if (planId === 'enterprise') {
      window.open('mailto:hola@rcp.ai?subject=Enterprise Plan', '_blank')
      return
    }
    setLoading(planId)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId }),
    })
    const data = await res.json()
    setLoading(null)
    if (data.url) window.location.assign(data.url)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Créditos y plan</h1>
        <p className="text-muted text-sm mt-0.5">{account.company_name}</p>
      </div>

      {/* Balance card */}
      <div className="card p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm text-muted font-medium">Créditos disponibles</p>
            <p className="text-4xl font-bold text-ink mt-1">{account.credits_balance}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              account.subscription_plan === 'pro' ? 'text-purple-700 bg-purple-50 border-purple-200'
              : account.subscription_plan === 'enterprise' ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-muted bg-surface-2 border-subtle'
            }`}>
              {account.subscription_plan.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="w-full bg-surface-2 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${balancePct}%` }} />
        </div>
        <p className="text-xs text-faint mt-2">
          {account.credits_balance < 20 && '⚠️ Créditos bajos — considera hacer upgrade'}
          {account.credits_balance >= 20 && `${balancePct.toFixed(0)}% del límite de tu plan`}
        </p>
      </div>

      {/* Referencia de costos */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Costo por acción</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(MODULE_COSTS).map(([action, cost]) => (
            <div key={action} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
              <span className="text-xs text-muted">{action}</span>
              <span className="text-xs font-mono font-bold text-ink">{cost}cr</span>
            </div>
          ))}
        </div>
      </div>

      {/* Planes */}
      <div>
        <h2 className="text-sm font-semibold text-ink mb-4">Planes disponibles</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = account.subscription_plan === plan.id
            return (
              <div key={plan.id} className={`card p-5 flex flex-col border transition-colors ${
                isCurrent ? 'border-accent bg-accent-soft' : 'border-subtle'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-ink">{plan.name}</p>
                  {isCurrent && <span className="badge badge-accent">Actual</span>}
                </div>
                <p className="text-2xl font-bold text-ink mb-1">{plan.price}</p>
                <p className="text-xs text-faint mb-4">{plan.credits} créditos/mes incluidos</p>
                <ul className="space-y-1 flex-1 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs text-muted flex gap-1.5">
                      <span className="text-emerald-500 flex-shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || loading !== null}
                  className={`w-full text-sm font-semibold py-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
                    isCurrent
                      ? 'border-subtle text-faint cursor-default'
                      : 'btn-primary'
                  }`}
                >
                  {loading === plan.id ? 'Redirigiendo…' : isCurrent ? 'Plan actual' : plan.id === 'enterprise' ? 'Contactar' : 'Actualizar'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
