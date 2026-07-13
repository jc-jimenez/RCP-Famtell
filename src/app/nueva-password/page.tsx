'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import BizdoctorLogo from '@/components/shared/BizdoctorLogo'
import BizdoctorIcon from '@/components/shared/BizdoctorIcon'

type SessionState = 'checking' | 'ready' | 'invalid'

export default function NuevaPasswordPage() {
  const [sessionState, setSessionState] = useState<SessionState>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function establishSession() {
      const supabase = createSupabaseBrowserClient()

      // Flujo PKCE (?code=...) usado por @supabase/ssr
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        setSessionState(exchangeError ? 'invalid' : 'ready')
        return
      }

      // Flujo legado con tokens en el hash (#access_token=...&type=recovery)
      if (window.location.hash.includes('access_token')) {
        const params = new URLSearchParams(window.location.hash.slice(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error: setError } = await supabase.auth.setSession({ access_token, refresh_token })
          setSessionState(setError ? 'invalid' : 'ready')
          return
        }
      }

      // Si ya hay una sesión activa (p.ej. el usuario recargó la página)
      const { data: { session } } = await supabase.auth.getSession()
      setSessionState(session ? 'ready' : 'invalid')
    }

    establishSession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setDone(true)
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BizdoctorIcon size={48} className="mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-ink"><BizdoctorLogo withWww /></h1>
        </div>

        <div className="card p-8">
          {sessionState === 'checking' && (
            <p className="text-center text-muted text-sm py-4">Verificando enlace…</p>
          )}

          {sessionState === 'invalid' && (
            <div className="text-center py-4">
              <p className="text-3xl mb-4">⚠️</p>
              <h2 className="text-lg font-semibold text-ink mb-2">Enlace inválido o expirado</h2>
              <p className="text-muted text-sm mb-6">
                Solicita un nuevo enlace para restablecer tu contraseña.
              </p>
              <a href="/recuperar" className="btn-primary inline-block px-8">
                Solicitar nuevo enlace
              </a>
            </div>
          )}

          {sessionState === 'ready' && done && (
            <div className="text-center py-4">
              <p className="text-3xl mb-4">✅</p>
              <h2 className="text-lg font-semibold text-ink mb-2">Contraseña actualizada</h2>
              <p className="text-muted text-sm mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <a href="/login" className="btn-primary inline-block px-8">
                Iniciar sesión
              </a>
            </div>
          )}

          {sessionState === 'ready' && !done && (
            <>
              <h2 className="text-xl font-semibold text-ink mb-2">Crea tu nueva contraseña</h2>
              <p className="text-muted text-sm mb-6">Ingresa y confirma tu nueva contraseña.</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-text">Nueva contraseña</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text">Confirmar contraseña</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
                  {loading ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
