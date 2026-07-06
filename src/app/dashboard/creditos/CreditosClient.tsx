'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

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
    highlight: true,
    features: ['500 créditos/mes', 'Casos ilimitados', 'Módulos M1–M7', 'Soporte prioritario', 'Brief PDF incluido'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Contactar',
    credits: 2000,
    features: ['2000 créditos/mes', 'Multi-consultor', 'Todos los módulos', 'Onboarding dedicado', 'API access'],
  },
]

const CREDIT_COSTS: Record<string, number> = {
  'Módulo M1-M6': 10, 'Módulo M7': 15, 'Brief sección': 2,
  'Propuesta IA': 5, 'Check-in': 3, 'Documento PDF': 5,
}

const PLAN_MAX: Record<string, number> = { free: 100, starter: 100, pro: 500, enterprise: 2000 }

export default function CreditosClient({ account }: { account: Account }) {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [banner, setBanner] = useState<'success' | 'canceled' | null>(null)

  useEffect(() => {
    if (searchParams.get('success') === '1') setBanner('success')
    if (searchParams.get('canceled') === '1') setBanner('canceled')
  }, [searchParams])

  const planMax = PLAN_MAX[account.subscription_plan] ?? 100
  const balancePct = Math.min(100, (account.credits_balance / planMax) * 100)
  const barColor = balancePct > 40 ? 'bg-emerald-500' : balancePct > 15 ? 'bg-amber-400' : 'bg-red-500'
  const isSuspended = account.status === 'suspended'

  async function handleUpgrade(planId: string) {
    if (planId === 'enterprise') {
      window.open('mailto:hola@rcp.ai?subject=Enterprise Plan - RCP.ai', '_blank')
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
    else if (data.error) alert(data.error)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Créditos y plan</h1>
        <p className="text-muted text-sm mt-0.5">{account.company_name}</p>
      </div>

      {/* Banners de resultado Stripe */}
      {banner === 'success' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Pago procesado exitosamente</p>
            <p className="text-xs text-emerald-700 mt-0.5">Tu plan y créditos se actualizarán en unos segundos vía webhook.</p>
          </div>
          <button onClick={() => setBanner(null)} className="ml-auto text-faint hover:text-ink text-sm">✕</button>
        </div>
      )}
      {banner === 'canceled' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Pago cancelado</p>
            <p className="text-xs text-amber-700 mt-0.5">No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.</p>
          </div>
          <button onClick={() => setBanner(null)} className="ml-auto text-faint hover:text-ink text-sm">✕</button>
        </div>
      )}

      {/* Cuenta suspendida */}
      {isSuspended && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-center gap-3">
          <span className="text-xl">🚫</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Cuenta suspendida</p>
            <p className="text-xs text-red-700 mt-0.5">Renueva tu suscripción para seguir usando RCP.ai.</p>
          </div>
        </div>
      )}

      {/* Balance */}
      <div className="card p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm text-muted font-medium">Créditos disponibles</p>
            <p className={`text-4xl font-bold mt-1 ${
              account.credits_balance === 0 ? 'text-red-600' :
              account.credits_balance < 20 ? 'text-amber-600' : 'text-ink'
            }`}>{account.credits_balance}</p>
            <p className="text-xs text-faint mt-1">de {planMax} créditos del plan</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            account.subscription_plan === 'pro'        ? 'text-purple-700 bg-purple-50 border-purple-200' :
            account.subscription_plan === 'enterprise' ? 'text-amber-700 bg-amber-50 border-amber-200' :
            isSuspended                                ? 'text-red-700 bg-red-50 border-red-200' :
            'text-muted bg-surface-2 border-subtle'
          }`}>
            {isSuspended ? 'SUSPENDIDA' : account.subscription_plan.toUpperCase()}
          </span>
        </div>
        <div className="w-full bg-surface-2 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${balancePct}%` }} />
        </div>
        {account.credits_balance < 20 && !isSuspended && (
          <p className="text-xs text-amber-700 mt-2">⚠️ Créditos bajos — considera hacer upgrade antes de continuar</p>
        )}
        {account.credits_balance === 0 && (
          <p className="text-xs text-red-700 mt-2">Sin créditos — no podrás iniciar nuevos módulos hasta recargar</p>
        )}
      </div>

      {/* Referencia de costos */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Costo por acción</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(CREDIT_COSTS).map(([action, cost]) => (
            <div key={action} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
              <span className="text-xs text-muted">{action}</span>
              <span className="text-xs font-mono font-bold text-ink">{cost} cr</span>
            </div>
          ))}
        </div>
      </div>

      {/* Planes */}
      <div>
        <h2 className="text-sm font-semibold text-ink mb-4">Planes</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = account.subscription_plan === plan.id
            return (
              <div key={plan.id} className={`card p-5 flex flex-col border transition-colors ${
                isCurrent           ? 'border-accent bg-accent-soft' :
                (plan as any).highlight ? 'border-accent/40' : 'border-subtle'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-ink">{plan.name}</p>
                  {isCurrent && <span className="badge text-xs bg-accent-soft text-accent border-accent/20">Actual</span>}
                  {(plan as any).highlight && !isCurrent && <span className="badge text-xs bg-purple-50 text-purple-700 border-purple-200">Popular</span>}
                </div>
                <p className="text-2xl font-bold text-ink mb-0.5">{plan.price}</p>
                <p className="text-xs text-faint mb-4">{plan.credits} créditos/mes</p>
                <ul className="space-y-1.5 flex-1 mb-5">
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
                    isCurrent ? 'border-subtle text-faint cursor-default' : 'btn-primary'
                  }`}
                >
                  {loading === plan.id ? 'Redirigiendo…' :
                   isCurrent ? 'Plan actual' :
                   plan.id === 'enterprise' ? 'Contactar ventas' :
                   account.subscription_plan === 'pro' && plan.id === 'starter' ? 'Bajar a Starter' :
                   'Actualizar plan'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
