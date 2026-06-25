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
                step === s ? 'bg-role-consultor text-white' :
                step > s   ? 'bg-emerald-700 text-white' :
                'bg-slate-800 text-slate-500'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-medium ${step === s ? 'text-white' : 'text-slate-500'}`}>
                {s === 1 ? 'Datos del caso' : 'Invitar directivo'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-slate-800" />}
            </div>
          ))}
        </div>

        {/* PASO 1 */}
        {step === 1 && (
          <form onSubmit={handleCreateCase} className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
              <h1 className="text-lg font-bold text-white">Datos de la empresa</h1>

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
                          ? 'border-role-consultor bg-purple-950/40'
                          : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
                      }`}
                    >
                      <p className="text-xs font-semibold text-white">{intent.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{intent.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">{error}</p>}

            <button
              type="submit"
              disabled={loading || !form.companyName.trim()}
              className="w-full rounded-xl bg-role-consultor hover:opacity-90 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-opacity"
            >
              {loading ? 'Creando caso…' : 'Crear caso →'}
            </button>
          </form>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 flex items-center gap-3">
              <span className="text-xl">✓</span>
              <div>
                <p className="text-sm font-semibold text-white">Caso creado exitosamente</p>
                <p className="text-xs text-slate-400">Ahora invita al directivo para comenzar el diagnóstico</p>
              </div>
            </div>

            <form onSubmit={handleInviteDirector} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
              <h2 className="text-base font-bold text-white">Invitar al Directivo</h2>
              <p className="text-xs text-slate-400 -mt-3">
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

              {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSkipInvite}
                  className="flex-1 rounded-xl border border-slate-700 hover:border-slate-500 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Hacer después
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.directorEmail.trim()}
                  className="flex-1 rounded-xl bg-role-consultor hover:opacity-90 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-opacity"
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
