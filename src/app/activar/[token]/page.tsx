'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

type Step = 'validating' | 'form' | 'success' | 'error'

export default function ActivatePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [step, setStep] = useState<Step>('validating')
  const [invitation, setInvitation] = useState<{
    email: string
    role: string
    caseCompanyName: string
  } | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function validateToken() {
      const res = await fetch(`/api/auth/activate?token=${token}`)
      const data = await res.json()
      if (!res.ok) {
        setStep('error')
        setError(data.error ?? 'Enlace inválido o expirado')
        return
      }
      setInvitation(data)
      setStep('form')
    }
    validateToken()
  }, [token])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    if (password !== passwordConfirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Error al activar la cuenta')
      setLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signInWithPassword({ email: invitation!.email, password })

    setStep('success')
    setTimeout(() => router.push('/mis-modulos'), 2000)
  }

  if (step === 'validating') {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">Validando enlace de invitación…</p>
        </div>
      </main>
    )
  }

  if (step === 'error') {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="card w-full max-w-md p-8 text-center">
          <p className="text-3xl mb-4">⚠️</p>
          <h1 className="text-xl font-semibold text-ink mb-2">Enlace inválido</h1>
          <p className="text-muted text-sm">{error}</p>
          <a href="/login" className="inline-block mt-6 text-accent text-sm hover:underline">
            Ir al login →
          </a>
        </div>
      </main>
    )
  }

  if (step === 'success') {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="card w-full max-w-md p-8 text-center border-emerald-200 bg-emerald-50/50">
          <p className="text-4xl mb-4">✓</p>
          <h1 className="text-xl font-semibold text-ink mb-2">¡Cuenta activada!</h1>
          <p className="text-muted text-sm">Entrando a la plataforma…</p>
        </div>
      </main>
    )
  }

  const roleLabel = invitation?.role === 'director' ? 'Directivo' : 'Colaborador'

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink">RCP<span className="text-accent">.ai</span></h1>
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <span className="text-xs font-bold text-accent uppercase tracking-wider">{roleLabel}</span>
            <h2 className="text-xl font-semibold text-ink mt-1">Activar tu cuenta</h2>
            <p className="text-muted text-sm mt-1">
              Caso: <span className="text-ink font-medium">{invitation?.caseCompanyName}</span>
            </p>
            <p className="text-faint text-sm">{invitation?.email}</p>
          </div>

          <form onSubmit={handleActivate} className="space-y-5">
            <div>
              <label className="label-text">Crea tu contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text">Confirma tu contraseña</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="input-field"
              />
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Activando…' : 'Activar cuenta'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
