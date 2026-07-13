'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import BizdoctorLogo from '@/components/shared/BizdoctorLogo'
import BizdoctorIcon from '@/components/shared/BizdoctorIcon'
import BizdoctorProductPreview from '@/components/shared/BizdoctorProductPreview'

const VALUE_PROPS = [
  { icon: '🎯', title: 'Diagnóstico en menos de 60 minutos', desc: 'Entrevistas inteligentes con IA' },
  { icon: '🛡️', title: 'Índice de Salud Empresarial', desc: 'Conoce tu estado real, con datos propios' },
  { icon: '📈', title: 'Plan de Transformación a 90 días', desc: 'Acciones claras, prioridades y responsables' },
  { icon: '📊', title: 'Decisiones basadas en datos', desc: 'No en corazonadas' },
]

// Franja inferior tipo "prueba social" — a propósito NO lleva cifras
// inventadas (empresas evaluadas, % de satisfacción, etc.): nadie ha
// iniciado sesión todavía en esta pantalla, no hay ningún dato real que
// respaldarían esos números. Mismo formato visual, contenido honesto.
const VALUE_BAR = [
  { icon: '🧭', text: 'Metodología de diagnóstico probada' },
  { icon: '🤖', text: 'Impulsado por IA de última generación' },
  { icon: '🔒', text: 'Tus datos, siempre protegidos' },
  { icon: '⚡', text: 'De la entrevista al plan de acción' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null)

  // Lee el ?error=oauth que pone el callback si signInWithOAuth falla del
  // lado del proveedor/Supabase — con useEffect en vez de useSearchParams
  // para no forzar un boundary de Suspense en esta página cliente simple.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'oauth') {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
    }
  }, [])

  async function handleOAuthLogin(provider: 'google' | 'azure') {
    setError(null)
    setOauthLoading(provider)
    const supabase = createSupabaseBrowserClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (oauthError) {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
      setOauthLoading(null)
    }
    // Si no hay error, el navegador ya está siendo redirigido al proveedor —
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
    <main className="min-h-screen bg-canvas">
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,460px)]">

        {/* Columna 1 — propuesta de valor */}
        <div className="hidden xl:flex flex-col justify-between p-10 bg-surface">
          <div>
            <div className="flex items-center gap-3">
              <BizdoctorIcon size={44} />
              <div>
                <h1 className="text-xl font-bold text-ink leading-tight"><BizdoctorLogo withWww /></h1>
                <p className="text-muted text-xs">Sistema de Transformación Empresarial con IA</p>
              </div>
            </div>

            <h2 className="mt-10 text-4xl font-extrabold text-ink leading-tight text-balance">
              Hoy conocerás la empresa que <span className="text-accent">realmente tienes.</span>
            </h2>
            <p className="mt-4 text-muted leading-relaxed max-w-sm">
              Descubre riesgos antes de que se conviertan en problemas y recibe un plan estratégico generado por Inteligencia Artificial.
            </p>

            <ul className="mt-8 space-y-4 max-w-sm">
              {VALUE_PROPS.map((item) => (
                <li key={item.title} className="flex items-start gap-3.5">
                  <span className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center text-lg">
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

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-subtle bg-surface-2 p-4">
            {VALUE_BAR.map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <span className="text-sm flex-shrink-0">{item.icon}</span>
                <span className="text-xs text-muted leading-tight">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 2 — vista previa del producto, sobre una cuadrícula de
            puntos muy sutil (sin fotos de stock, solo CSS) */}
        <div
          className="hidden xl:flex items-center justify-center p-10 relative overflow-hidden bg-canvas"
          style={{ backgroundImage: 'radial-gradient(rgb(var(--color-subtle)) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        >
          <div className="pointer-events-none absolute w-[420px] h-[420px] rounded-full bg-accent opacity-[0.08] blur-3xl" />
          <BizdoctorProductPreview />
        </div>

        {/* Columna 3 — el formulario */}
        <div className="flex items-center justify-center p-6 xl:p-10 bg-surface xl:border-l border-subtle">
        <div className="w-full max-w-md">

          {/* Logo — solo en pantallas angostas, en xl+ ya está en la columna 1 */}
          <div className="text-center mb-8 xl:hidden">
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

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={oauthLoading !== null}
                className="btn-secondary w-full flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
                </svg>
                {oauthLoading === 'google' ? 'Conectando…' : 'Continuar con Google'}
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin('azure')}
                disabled={oauthLoading !== null}
                className="btn-secondary w-full flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                  <rect x="1" y="1" width="6.5" height="6.5" fill="#F25022" />
                  <rect x="8.5" y="1" width="6.5" height="6.5" fill="#7FBA00" />
                  <rect x="1" y="8.5" width="6.5" height="6.5" fill="#00A4EF" />
                  <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#FFB900" />
                </svg>
                {oauthLoading === 'azure' ? 'Conectando…' : 'Continuar con Microsoft'}
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-subtle" />
              <span className="text-xs text-faint">o continúa con</span>
              <div className="h-px flex-1 bg-subtle" />
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div>
                <label htmlFor="email" className="label-text">Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
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
        </div>
      </div>

      {/* Franja de confianza, ancho completo — visible también donde las
          3 columnas se colapsan (xl es angosto para caber todas juntas) */}
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
