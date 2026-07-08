'use client'

import { useState } from 'react'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import CasoTabs from '@/components/consultor/CasoTabs'
import type { UserRole } from '@/types'

interface Checkin {
  id: string
  week_number: number
  contacts_made: number
  new_clients: boolean
  new_clients_detail: string | null
  obstacles: string | null
  warehouse_occupancy: number
  progress_score: number
  ai_analysis: string | null
  submitted_at: string
}

interface Props {
  caseId: string
  companyName: string
  role: 'director' | 'collaborator' | 'consultant'
  email: string
  initialCheckins: Checkin[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CheckinClient({ caseId, companyName, role, email, initialCheckins }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'
  const isDirector = role === 'director'

  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins)
  const [showForm, setShowForm] = useState(checkins.length === 0 && isDirector)

  const nextWeek = checkins.length === 0 ? 1 : Math.max(...checkins.map(c => c.week_number)) + 1

  const [form, setForm] = useState({
    weekNumber: nextWeek,
    contactsMade: 0,
    newClients: false,
    newClientsDetail: '',
    obstacles: '',
    warehouseOccupancy: 0,
    progressScore: 5,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState<Checkin | null>(null)

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
    const saved: Checkin = data.checkin
    setCheckins(prev => [saved, ...prev.filter(c => c.week_number !== saved.week_number)].sort((a, b) => b.week_number - a.week_number))
    setJustSaved(saved)
    setShowForm(false)
    setForm({ weekNumber: saved.week_number + 1, contactsMade: 0, newClients: false, newClientsDetail: '', obstacles: '', warehouseOccupancy: 0, progressScore: 5 })
  }

  const tabBar = role === 'director'
    ? <DirectorTabs caseId={caseId} />
    : role === 'consultant'
      ? <CasoTabs caseId={caseId} activeTab="checkin" />
      : undefined

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName} tabBar={tabBar}>
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-ink">Check-in semanal</h1>
            <p className="text-muted text-sm mt-1">
              {isDirector ? 'Registra el avance de esta semana. Nova analizará los resultados.' : 'Avance semanal reportado por el directivo.'}
            </p>
          </div>
          {isDirector && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2">
              + Registrar semana {nextWeek}
            </button>
          )}
        </div>

        {justSaved && (
          <div className="card p-5 bg-emerald-50 border-emerald-200 space-y-2">
            <p className="text-sm font-semibold text-emerald-800">✓ Check-in semana {justSaved.week_number} registrado</p>
            {justSaved.ai_analysis && (
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">N</div>
                  <span className="text-xs font-semibold text-accent">Análisis de Nova</span>
                </div>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{justSaved.ai_analysis}</p>
              </div>
            )}
            <button onClick={() => setJustSaved(null)} className="text-xs text-emerald-700 underline">Cerrar</button>
          </div>
        )}

        {isDirector && showForm && (
          <form onSubmit={handleSubmit} className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Nuevo check-in</h2>
              {checkins.length > 0 && (
                <button type="button" onClick={() => setShowForm(false)} className="text-xs text-muted hover:text-ink">Cancelar</button>
              )}
            </div>

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
                      form.newClients === v ? 'border-accent bg-accent-soft text-ink' : 'border-subtle text-muted hover:border-accent/30'
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
                  <span className="text-xs text-faint">1</span>
                  <input type="range" min={1} max={10} value={form.progressScore}
                    onChange={e => set('progressScore', Number(e.target.value))} className="flex-1 accent-accent" />
                  <span className="text-xs text-faint">10</span>
                  <span className="text-sm font-bold text-ink w-5 text-center">{form.progressScore}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Nova está analizando…
                </span>
              ) : 'Registrar check-in'}
            </button>
          </form>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Historial</h2>
          {checkins.length === 0 ? (
            <div className="card p-8 text-center border-dashed">
              <p className="text-sm text-muted">Todavía no hay check-ins registrados para este caso.</p>
            </div>
          ) : (
            checkins.map(c => (
              <div key={c.id} className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Semana {c.week_number}</h3>
                  <span className="text-xs text-faint">{formatDate(c.submitted_at)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-surface-2 rounded-lg p-2.5">
                    <p className="text-xs text-faint">Contactos</p>
                    <p className="text-base font-bold text-ink">{c.contacts_made}</p>
                  </div>
                  <div className="bg-surface-2 rounded-lg p-2.5">
                    <p className="text-xs text-faint">Clientes nuevos</p>
                    <p className="text-base font-bold text-ink">{c.new_clients ? 'Sí' : 'No'}</p>
                  </div>
                  <div className="bg-surface-2 rounded-lg p-2.5">
                    <p className="text-xs text-faint">Ocupación</p>
                    <p className="text-base font-bold text-ink">{c.warehouse_occupancy}%</p>
                  </div>
                  <div className="bg-surface-2 rounded-lg p-2.5">
                    <p className="text-xs text-faint">Progreso</p>
                    <p className="text-base font-bold text-ink">{c.progress_score}/10</p>
                  </div>
                </div>

                {c.new_clients && c.new_clients_detail && (
                  <p className="text-xs text-muted"><span className="font-medium text-ink">Clientes nuevos:</span> {c.new_clients_detail}</p>
                )}
                {c.obstacles && (
                  <p className="text-xs text-muted"><span className="font-medium text-ink">Obstáculos:</span> {c.obstacles}</p>
                )}

                {c.ai_analysis && (
                  <div className="bg-accent-soft rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">N</div>
                      <span className="text-xs font-semibold text-accent">Análisis de Nova</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{c.ai_analysis}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
