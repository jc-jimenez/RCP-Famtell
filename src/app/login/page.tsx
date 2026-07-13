'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import BizdoctorLogo from '@/components/shared/BizdoctorLogo'
import BizdoctorIcon from '@/components/shared/BizdoctorIcon'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

    // signInWithPassword resuelve en cuanto Supabase responde, pero la cookie
    // de sesión que el middleware necesita se escribe en un paso aparte y a
    // veces no está lista todavía — navegar de inmediato hace que el
    // middleware no encuentre sesión y rebote a /login sin ningún error
    // visible. Se confirma con getSession() (con un par de reintentos cortos)
    // antes de navegar, para no depender de que la escritura ya haya ocurrido.
    let confirmed = false
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { confirmed = true; break }
      await new Promise(r => setTimeout(r, 150))
    }

    if (!confirmed) {
      setError('No se pudo confirmar la sesión. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // Recarga COMPLETA a la raíz (no client-side) para que el navegador
    // envíe la cookie de sesión recién escrita y el middleware detecte el rol.
    window.location.assign('/')
  }

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <BizdoctorIcon size={56} className="mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-ink">
            <BizdoctorLogo withWww />
          </h1>
          <p className="mt-2 text-muted text-sm">Sistema de Transformación Empresarial con IA</p>
        </div>

        <div className="card p-8">
          <BizdoctorIcon size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ink text-center mb-1">Iniciar sesión</h2>
          <p className="text-sm text-muted text-center mb-6">Accede a tu cuenta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label-text">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="consultor@empresa.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-ink">Contraseña</label>
                <a href="/recuperar" className="text-xs text-accent hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-ink transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-subtle space-y-3 text-center">
            <p className="text-sm text-muted">
              ¿Eres consultor nuevo?{' '}
              <a href="/registro" className="text-accent font-semibold hover:underline">
                Crear cuenta gratis →
              </a>
            </p>
            <p className="text-xs text-muted">
              ¿Tienes un link de invitación?{' '}
              <a href="/recuperar" className="text-accent font-medium hover:underline">Úsalo aquí</a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-faint mt-6">
          www.bizdoctor.site es una solución desarrollada por StartLab Global Business Competence School
        </p>
      </div>
    </main>
  )
}
