'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    // Usar el origin actual del navegador en vez de una env var (que en
    // producción puede faltar o apuntar a localhost).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink">www.bizdoctor<span className="text-accent">.site</span></h1>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-4">✉️</p>
              <h2 className="text-lg font-semibold text-ink mb-2">Revisa tu correo</h2>
              <p className="text-muted text-sm">
                Si <span className="text-ink font-medium">{email}</span> tiene una cuenta activa,
                recibirás un enlace para restablecer tu contraseña.
              </p>
              <a href="/login" className="inline-block mt-6 text-accent text-sm hover:underline">
                ← Volver al login
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-ink mb-2">Recuperar contraseña</h2>
              <p className="text-muted text-sm mb-6">
                Ingresa tu correo y te enviamos un enlace para crear una nueva contraseña.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-text">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <a href="/login" className="text-xs text-faint hover:text-muted">
                  ← Volver al login
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
