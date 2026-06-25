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
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/nueva-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">RCP<span className="text-sky-400">.ai</span></h1>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-4">✉️</p>
              <h2 className="text-lg font-semibold text-white mb-2">Revisa tu correo</h2>
              <p className="text-slate-400 text-sm">
                Si <span className="text-white">{email}</span> tiene una cuenta activa,
                recibirás un enlace para restablecer tu contraseña.
              </p>
              <a href="/login" className="inline-block mt-6 text-sky-400 text-sm hover:text-sky-300">
                ← Volver al login
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Recuperar contraseña</h2>
              <p className="text-slate-400 text-sm mb-6">
                Ingresa tu correo y te enviamos un enlace para crear una nueva contraseña.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors"
                >
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <a href="/login" className="text-xs text-slate-500 hover:text-slate-300">
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
