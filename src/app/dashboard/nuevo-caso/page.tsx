'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

const INDUSTRIES = [
  'Logística / 3PL',
  'Manufactura',
  'Comercio y distribución',
  'Servicios profesionales',
  'Tecnología',
  'Alimentos y bebidas',
  'Construcción',
  'Salud',
  'Retail',
  'Otro',
]

const INTENTS = [
  { value: 'growth',      label: '🔵 Crecimiento',          desc: 'Escalar, nuevos clientes, expansión' },
  { value: 'restructure', label: '🟡 Redimensionamiento',    desc: 'Optimizar, reducir costos, estabilizar' },
  { value: 'exit',        label: '🔴 Salida / Asociación',   desc: 'Socio estratégico, fusión o venta' },
  { value: 'mixed',       label: '⬜ Sin definir aún',       desc: 'Lo determinaremos en el diagnóstico' },
]

export default function NuevoCasoPage() {
  const router = useRouter()
  const { email } = useSupabaseUser()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)

  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    description: '',
    intent: 'mixed',
    directorEmail: '',
    directorJobTitle: 'Director General',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: form.companyName,
        industry: form.industry,
        description: form.description,
        strategicIntent: form.intent,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setCaseId(data.case.id)
    setStep(2)
    setLoading(false)
  }

  async function handleInviteDirector(e: React.FormEvent) {
    e.preventDefault()
    if (!form.directorEmail.trim() || !caseId) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        email: form.directorEmail,
        role: 'director',
        jobTitle: form.directorJobTitle,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.push(`/dashboard/caso/${caseId}` as any)
  }

  async function handleSkipInvite() {
    if (caseId) router.push(`/dashboard/caso/${caseId}` as any)
  }

  return (
    <AppShell role="consultant" email={email ?? ''}>
      <div className="max-w-xl mx-auto py-4 space-y-6">

        {/* Pasos */}
        <div className="flex items-center gap-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-accent text-white' :
                step > s   ? 'bg-emerald-500 text-white' :
                'bg-surface-2 text-faint'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-medium ${step === s ? 'text-ink' : 'text-faint'}`}>
                {s === 1 ? 'Datos del caso' : 'Invitar directivo'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-subtle" />}
            </div>
          ))}
        </div>

        {/* PASO 1 */}
        {step === 1 && (
          <form onSubmit={handleCreateCase} className="space-y-5">
            <div className="card p-6 space-y-5">
              <h1 className="text-lg font-bold text-ink">Datos de la empresa</h1>

              <div>
                <label className="label-text">Nombre de la empresa *</label>
                <input
                  value={form.companyName}
                  onChange={e => set('companyName', e.target.value)}
                  placeholder="Ej. Famtell S.A. de C.V."
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-text">Industria</label>
                <select value={form.industry} onChange={e => set('industry', e.target.value)} className="input-field">
                  <option value="">Seleccionar…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div>
                <label className="label-text">Descripción breve</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={2}
                  placeholder="Contexto inicial del caso"
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="label-text">Intención estratégica inicial</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {INTENTS.map(intent => (
                    <button
                      key={intent.value}
                      type="button"
                      onClick={() => set('intent', intent.value)}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        form.intent === intent.value
                          ? 'border-accent bg-accent-soft'
                          : 'border-subtle bg-surface-2 hover:border-accent/30'
                      }`}
                    >
                      <p className="text-xs font-semibold text-ink">{intent.label}</p>
                      <p className="text-xs text-faint mt-0.5">{intent.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

            <button
              type="submit"
              disabled={loading || !form.companyName.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Creando caso…' : 'Crear caso →'}
            </button>
          </form>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center gap-3">
              <span className="text-xl">✓</span>
              <div>
                <p className="text-sm font-semibold text-ink">Caso creado exitosamente</p>
                <p className="text-xs text-muted">Ahora invita al directivo para comenzar el diagnóstico</p>
              </div>
            </div>

            <form onSubmit={handleInviteDirector} className="card p-6 space-y-5">
              <h2 className="text-base font-bold text-ink">Invitar al Directivo</h2>
              <p className="text-xs text-muted -mt-3">
                Recibirá un email con un enlace de activación. Caduca en 48 horas.
              </p>

              <div>
                <label className="label-text">Correo del directivo *</label>
                <input
                  type="email"
                  value={form.directorEmail}
                  onChange={e => set('directorEmail', e.target.value)}
                  placeholder="director@empresa.com"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-text">Puesto</label>
                <input
                  value={form.directorJobTitle}
                  onChange={e => set('directorJobTitle', e.target.value)}
                  placeholder="Director General"
                  className="input-field"
                />
              </div>

              {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={handleSkipInvite} className="btn-secondary flex-1">
                  Hacer después
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.directorEmail.trim()}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Enviando…' : 'Enviar invitación ✉️'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}
