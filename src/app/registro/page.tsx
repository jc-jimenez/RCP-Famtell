'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import BizdoctorLogo from '@/components/shared/BizdoctorLogo'

type Step = 'datos' | 'codigo' | 'listo'

const PRIVACY_TEXT = `GoNextSales S.A. de C.V. ("www.bizdoctor.site") recopila tu nombre, correo electrónico, teléfono y empresa para brindar el servicio de diagnóstico empresarial con IA, enviarte comunicaciones relacionadas con tu cuenta y —con tu consentimiento— información comercial y campañas de marketing del producto por correo electrónico y WhatsApp. Puedes cancelar estas comunicaciones en cualquier momento. Tus datos se almacenan en servidores seguros y no se comparten con terceros sin tu consentimiento, salvo obligación legal. Al registrarte aceptas estos términos.`

export default function RegistroPage() {
  const [step, setStep] = useState<string>('datos')

  // Paso 1 — datos
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Paso 2 — WhatsApp
  const [code, setCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Paso 1: enviar código WhatsApp ──────────────────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
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
    if (!acceptPrivacy) {
      setError('Debes aceptar el aviso de privacidad para continuar')
      return
    }

    setLoading(true)
    const res = await fetch('/api/registro/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, nombre, empresa, password }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Error al enviar el código')
      return
    }

    setStep('codigo')
  }

  // ── Paso 2: verificar código + crear cuenta ──────────────────────────────────
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/registro/verify-and-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Error al verificar el código')
      setLoading(false)
      return
    }

    // Cuenta creada → iniciar sesión
    const supabase = createSupabaseBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      setError('Tu cuenta se activó pero no pudimos iniciar sesión automáticamente. Ve a "Iniciar sesión" e ingresa con tu correo y contraseña.')
      return
    }

    setStep('listo')
  }

  async function handleResend() {
    setError(null)
    setLoading(true)
    await fetch('/api/registro/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, nombre, empresa, password }),
    })
    setLoading(false)
    setCode('')
    setError('Código reenviado. Revisa tu correo.')
  }

  // ── Paso 3: listo ───────────────────────────────────────────────────────────
  if (step === 'listo') {
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-ink mb-2">¡Bienvenido a www.bizdoctor.site!</h1>
          <p className="text-muted mb-2">Tu cuenta ha sido activada con</p>
          <p className="text-3xl font-bold text-accent mb-6">100 créditos</p>
          <p className="text-sm text-muted mb-8">Ya puedes iniciar tu primer diagnóstico empresarial.</p>
          <Link href="/" className="btn-primary inline-block px-8">
            Ir al dashboard →
          </Link>
          <p className="text-xs text-faint mt-8">
            www.bizdoctor.site es una solución desarrollada por StartLab Global Business Competence School
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink">
            <BizdoctorLogo withWww />
          </h1>
          <p className="mt-2 text-muted text-sm">Diagnóstico empresarial con inteligencia artificial</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepDot active={step === 'datos'} done={step === 'codigo' || step === 'listo'} label="1" />
          <div className="h-px w-8 bg-subtle" />
          <StepDot active={step === 'codigo'} done={step === 'listo'} label="2" />
        </div>

        <div className="card p-8">

          {/* ── Paso 1: Datos ── */}
          {step === 'datos' && (
            <>
              <h2 className="text-xl font-semibold text-ink mb-1">Crear cuenta</h2>
              <p className="text-sm text-muted mb-6">Recibirás un código de verificación por correo electrónico</p>

              <form onSubmit={handleSendCode} className="space-y-4">
                <Field label="Nombre completo">
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Juan Carlos Jiménez"
                    required
                    className="input-field"
                  />
                </Field>

                <Field label="Correo electrónico">
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="consultor@empresa.com"
                    required
                    className="input-field"
                  />
                </Field>

                <Field label="WhatsApp (10 dígitos)">
                  <input
                    type="tel"
                    name="tel"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="5512345678"
                    required
                    className="input-field"
                  />
                </Field>

                <Field label="Empresa o despacho">
                  <input
                    type="text"
                    name="organization"
                    autoComplete="organization"
                    value={empresa}
                    onChange={e => setEmpresa(e.target.value)}
                    placeholder="Mi Consultoría S.C."
                    required
                    className="input-field"
                  />
                </Field>

                <Field label="Contraseña">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new-password"
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="input-field pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-ink"
                    >
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </Field>

                <Field label="Confirmar contraseña">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="input-field"
                  />
                </Field>

                {/* Aviso de privacidad */}
                <div className="pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptPrivacy}
                      onChange={e => setAcceptPrivacy(e.target.checked)}
                      className="mt-0.5 accent-accent w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-xs text-muted leading-relaxed">
                      Acepto el{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacy(v => !v)}
                        className="text-accent underline hover:no-underline"
                      >
                        Aviso de Privacidad
                      </button>
                      , incluyendo el uso de mis datos para comunicaciones comerciales y marketing del producto.
                    </span>
                  </label>

                  {showPrivacy && (
                    <div className="mt-3 p-4 bg-canvas border border-subtle rounded-xl text-xs text-muted leading-relaxed max-h-40 overflow-y-auto">
                      {PRIVACY_TEXT}
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Enviando código…' : 'Continuar →'}
                </button>
              </form>
            </>
          )}

          {/* ── Paso 2: Verificar correo ── */}
          {step === 'codigo' && (
            <>
              <h2 className="text-xl font-semibold text-ink mb-1">Verifica tu correo</h2>
              <p className="text-sm text-muted mb-6">
                Enviamos un código de 6 dígitos a{' '}
                <span className="text-ink font-medium">{email}</span>
              </p>

              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <label className="label-text">Código de verificación</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    required
                    maxLength={6}
                    className="input-field text-center text-2xl tracking-widest font-mono"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="btn-primary w-full"
                >
                  {loading ? 'Verificando…' : 'Activar cuenta'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-xs text-accent hover:underline"
                  >
                    ¿No recibiste el código? Reenviar
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-accent font-medium hover:underline">
            Iniciar sesión
          </a>
        </p>
      </div>
    </main>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
      done ? 'bg-accent text-white' : active ? 'bg-accent/20 text-accent border-2 border-accent' : 'bg-subtle text-muted'
    }`}>
      {done ? '✓' : label}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-text">{label}</label>
      {children}
    </div>
  )
}
