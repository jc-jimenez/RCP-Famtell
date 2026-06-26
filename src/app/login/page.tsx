'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Recarga COMPLETA a la raíz (no client-side) para que el navegador
    // envíe la cookie de sesión recién escrita y el middleware detecte el rol.
    window.location.assign('/')
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            RCP<span className="text-sky-400">.ai</span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm">Diagnóstico empresarial con inteligencia artificial</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/40">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Contraseña
                </label>
                <a href="/recuperar" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          ¿No tienes cuenta? Accede con el enlace de invitación que recibiste por correo.
        </p>
      </div>
    </main>
  )
}
