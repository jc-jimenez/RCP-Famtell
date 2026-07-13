'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import BizdoctorLogo from '@/components/shared/BizdoctorLogo'
import BizdoctorIcon from '@/components/shared/BizdoctorIcon'
import BizdoctorHeroArt from '@/components/shared/BizdoctorHeroArt'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [showMicrosoftSoon, setShowMicrosoftSoon] = useState(false)

  // Lee el ?error=oauth que pone el callback si signInWithOAuth falla del
  // lado de Google/Supabase — con useEffect en vez de useSearchParams para
  // no forzar un boundary de Suspense en esta página cliente simple.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'oauth') {
      setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
    }
  }, [])

  async function handleGoogleLogin() {
    setError(null)
    setOauthLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (oauthError) {
      setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
      setOauthLoading(false)
    }
    // Si no hay error, el navegador ya está siendo redirigido a Google —
    // no hay nada más que hacer aquí.
  }

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
    <main className="min-h-screen bg-canvas flex flex-col">
    <div className="flex-1 lg:grid lg:grid-cols-2">

      {/* Panel izquierdo — solo desktop. Rayos de los 4 colores de marca
          convergiendo hacia un brillo, con el logomark grande flotando
          encima y chispas de color — reemplaza el mural de montaña/ciudad
          de los mockups usando solo vector y la paleta real, sin fotos de
          stock ni assets externos. */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden p-12 bg-surface">
        <BizdoctorHeroArt />

        <div className="relative flex items-center gap-3">
          <BizdoctorIcon size={52} />
          <div>
            <h1 className="text-2xl font-bold text-ink leading-tight"><BizdoctorLogo withWww /></h1>
            <p className="text-muted text-xs">Sistema de Transformación Empresarial con IA</p>
          </div>
        </div>

        <div className="relative max-w-xs">
          <h2 className="text-4xl font-bold text-ink leading-tight text-balance">
            Diagnostica. Analiza.<br />Transforma.<br />Crecemos <span className="text-role-colaborador">juntos.</span>
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            La plataforma inteligente que convierte datos en decisiones y estrategia en resultados.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: '🧠', badge: 'bg-role-consultor-soft text-role-consultor', title: 'Inteligencia Artificial', desc: 'que impulsa tu negocio' },
              { icon: '📈', badge: 'bg-role-directivo-soft text-role-directivo', title: 'Diagnósticos precisos', desc: 'en minutos' },
              { icon: '👥', badge: 'bg-role-colaborador-soft text-role-colaborador', title: 'Estrategia centrada', desc: 'en las personas' },
              { icon: '🎯', badge: 'bg-role-admin-soft text-role-admin', title: 'Resultados medibles', desc: 'y sostenibles' },
            ].map((item) => (
              <li key={item.title} className="flex items-center gap-3.5">
                <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-card ${item.badge}`}>
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="text-xs text-muted">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2.5 bg-surface rounded-full pl-2 pr-5 py-2 border border-subtle shadow-card">
            <span className="w-7 h-7 rounded-full bg-role-directivo-soft text-role-directivo flex items-center justify-center text-sm flex-shrink-0">✓</span>
            <span className="text-xs font-medium text-ink">Seguro. Confiable. Diseñado para crecer contigo.</span>
          </div>
        </div>
      </div>

      {/* Panel derecho — el formulario */}
      <div className="flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-md">

        {/* Logo — solo en mobile/tablet, en desktop ya está en el panel izquierdo */}
        <div className="text-center mb-8 lg:hidden">
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

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-subtle" />
            <span className="text-xs text-faint">o continúa con</span>
            <div className="h-px flex-1 bg-subtle" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={oauthLoading}
            className="btn-secondary w-full mt-4 flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
            </svg>
            {oauthLoading ? 'Conectando…' : 'Continuar con Google'}
          </button>

          <button
            type="button"
            onClick={() => setShowMicrosoftSoon(true)}
            className="btn-secondary w-full mt-3 flex items-center justify-center gap-2.5"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <rect x="1" y="1" width="6.5" height="6.5" fill="#F25022" />
              <rect x="8.5" y="1" width="6.5" height="6.5" fill="#7FBA00" />
              <rect x="1" y="8.5" width="6.5" height="6.5" fill="#00A4EF" />
              <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#FFB900" />
            </svg>
            Continuar con Microsoft
          </button>
          {showMicrosoftSoon && (
            <p className="mt-2 text-xs text-center text-faint">
              Microsoft estará disponible muy pronto.
            </p>
          )}

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
      </div>
    </div>

      {/* Franja de confianza, ancho completo, debajo de las dos columnas */}
      <div className="border-t border-subtle bg-surface-2 py-4 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {[
            { icon: '🛡️', text: 'Protegido con cifrado avanzado' },
            { icon: '🔒', text: 'Cumplimiento de estándares de seguridad' },
            { icon: '✅', text: 'Tu información siempre segura' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <span className="text-sm">{item.icon}</span>
              <span className="text-xs text-muted">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
