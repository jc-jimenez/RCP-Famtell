'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppShell from '@/components/shared/AppShell'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export default function CheckinPage() {
  const { id: caseId } = useParams<{ id: string }>()
  const router = useRouter()
  const { email } = useSupabaseUser()

  const [form, setForm] = useState({
    weekNumber: 1,
    contactsMade: 0,
    newClients: false,
    newClientsDetail: '',
    obstacles: '',
    warehouseOccupancy: 0,
    progressScore: 5,
  })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ aiAnalysis: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, ...form }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setResult({ aiAnalysis: data.checkin.ai_analysis })
  }

  if (result) {
    return (
      <AppShell role="director" email={email ?? ''}>
        <div className="max-w-lg mx-auto py-12 space-y-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center text-2xl mx-auto">✓</div>
          <h1 className="text-xl font-bold text-white">Check-in semana {form.weekNumber} registrado</h1>

          {result.aiAnalysis && (
            <div className="card p-5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">N</div>
                <span className="text-sm font-semibold text-sky-400">Análisis de Nova</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{result.aiAnalysis}</p>
            </div>
          )}

          <button onClick={() => router.push(`/caso/${caseId}` as any)} className="rounded-xl bg-role-directivo hover:opacity-90 px-6 py-3 text-sm font-semibold text-white transition-opacity">
            Volver a mi caso
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell role="director" email={email ?? ''}>
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">Check-in semanal</h1>
          <p className="text-slate-400 text-sm mt-1">Registra el avance de esta semana. Nova analizará los resultados.</p>
        </div>

        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Semana #</label>
              <input type="number" min={1} max={12} value={form.weekNumber}
                onChange={e => set('weekNumber', Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="label-text">Contactos realizados</label>
              <input type="number" min={0} value={form.contactsMade}
                onChange={e => set('contactsMade', Number(e.target.value))} className="input-field" />
            </div>
          </div>

          <div>
            <label className="label-text">¿Conseguiste clientes nuevos esta semana?</label>
            <div className="flex gap-3 mt-1">
              {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }].map(({ v, l }) => (
                <button key={l} type="button" onClick={() => set('newClients', v)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    form.newClients === v ? 'border-role-directivo bg-blue-950/40 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>{l}</button>
              ))}
            </div>
            {form.newClients && (
              <input value={form.newClientsDetail} onChange={e => set('newClientsDetail', e.target.value)}
                placeholder="¿Quiénes? ¿De qué sector?" className="input-field mt-2" />
            )}
          </div>

          <div>
            <label className="label-text">Obstáculos o bloqueos esta semana</label>
            <textarea value={form.obstacles} onChange={e => set('obstacles', e.target.value)}
              rows={2} placeholder="¿Qué te impidió avanzar más?" className="input-field resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Ocupación almacén (%)</label>
              <input type="number" min={0} max={100} value={form.warehouseOccupancy}
                onChange={e => set('warehouseOccupancy', Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="label-text">Tu progreso esta semana</label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">1</span>
                <input type="range" min={1} max={10} value={form.progressScore}
                  onChange={e => set('progressScore', Number(e.target.value))} className="flex-1" />
                <span className="text-xs text-slate-500">10</span>
                <span className="text-sm font-bold text-white w-5 text-center">{form.progressScore}</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full rounded-xl bg-role-directivo hover:opacity-90 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-opacity">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Nova está analizando…
            </span>
          ) : 'Registrar check-in'}
        </button>
      </form>
    </AppShell>
  )
}
