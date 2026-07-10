'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface OnboardingStep {
  title: string
  body: ReactNode
}

interface Props {
  steps: OnboardingStep[]
  dismissEndpoint: string
  dismissBody?: Record<string, string>
  /** Si se da, navega ahí al terminar en vez de refrescar la página actual — para la relectura voluntaria desde el menú. */
  redirectTo?: string
}

export default function OnboardingWizard({ steps, dismissEndpoint, dismissBody, redirectTo }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const isLast = step === steps.length - 1
  const current = steps[step]

  async function handleNext() {
    if (!isLast) {
      setStep((s) => s + 1)
      return
    }
    setSaving(true)
    await fetch(dismissEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dismissBody ?? {}),
    })
    if (redirectTo) {
      router.push(redirectTo as any)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="max-w-lg mx-auto py-10">
      <div className="card p-6">
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-2'}`} />
          ))}
        </div>
        <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">
          Paso {step + 1} de {steps.length}
        </p>
        <h2 className="text-lg font-bold text-ink mb-3">{current.title}</h2>
        <div className="text-sm text-muted space-y-2 mb-8">{current.body}</div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm text-muted hover:text-ink disabled:opacity-0 transition-colors"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="btn-primary text-sm px-5 py-2"
          >
            {saving ? 'Guardando…' : isLast ? 'Comenzar' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}
