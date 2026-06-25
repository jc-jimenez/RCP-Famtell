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
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

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

    // Auto-login
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signInWithPassword({
      email: invitation!.email,
      password,
    })

    setStep('success')
    setTimeout(() => router.push('/'), 2000)
  }

  if (step === 'validating') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Validando enlace de invitación…</p>
        </div>
      </main>
    )
  }

  if (step === 'error') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-900/50 bg-red-950/20 p-8 text-center">
          <p className="text-3xl mb-4">⚠️</p>
          <h1 className="text-xl font-semibold text-white mb-2">Enlace inválido</h1>
          <p className="text-slate-400 text-sm">{error}</p>
          <a href="/login" className="inline-block mt-6 text-sky-400 text-sm hover:text-sky-300">
            Ir al login →
          </a>
        </div>
      </main>
    )
  }

  if (step === 'success') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-emerald-900/50 bg-emerald-950/20 p-8 text-center">
          <p className="text-4xl mb-4">✓</p>
          <h1 className="text-xl font-semibold text-white mb-2">¡Cuenta activada!</h1>
          <p className="text-slate-400 text-sm">Entrando a la plataforma…</p>
        </div>
      </main>
    )
  }

  const roleLabel = invitation?.role === 'director' ? 'Directivo' : 'Colaborador'

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">RCP<span className="text-sky-400">.ai</span></h1>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <div className="mb-6">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{roleLabel}</span>
            <h2 className="text-xl font-semibold text-white mt-1">Activar tu cuenta</h2>
            <p className="text-slate-400 text-sm mt-1">
              Caso: <span className="text-slate-200 font-medium">{invitation?.caseCompanyName}</span>
            </p>
            <p className="text-slate-500 text-sm">{invitation?.email}</p>
          </div>

          <form onSubmit={handleActivate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Crea tu contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirma tu contraseña
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-slate-950 transition-colors"
            >
              {loading ? 'Activando…' : 'Activar cuenta'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
