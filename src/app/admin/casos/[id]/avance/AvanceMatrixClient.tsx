'use client'

import { useState } from 'react'
import type { ParticipantProgress } from '@/lib/adminProgressMatrix'

interface Props {
  moduleOrder: { code: string; name: string }[]
  participants: ParticipantProgress[]
}

type ResistanceLevel = 'baja' | 'media' | 'alta'
const RESISTANCE_LEVELS: ResistanceLevel[] = ['baja', 'media', 'alta']
const RESISTANCE_COLOR: Record<ResistanceLevel, string> = {
  baja: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  alta: 'bg-rose-50 text-rose-700 border-rose-200',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Sin actividad'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function cellPercent(answered: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((answered / total) * 100))
}

function cellStatus(answered: number, total: number, completed: boolean) {
  if (total === 0) return { bg: 'bg-surface-2', text: 'text-faint', label: '—' }
  if (completed) return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '100%' }
  const pct = cellPercent(answered, total)
  if (pct > 0) return { bg: 'bg-amber-50', text: 'text-amber-700', label: `${pct}%` }
  return { bg: 'bg-surface-2', text: 'text-faint', label: '0%' }
}

export default function AvanceMatrixClient({ moduleOrder, participants: initialParticipants }: Props) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingResistanceId, setSavingResistanceId] = useState<string | null>(null)

  async function setResistance(caseUserId: string, level: ResistanceLevel | null, note?: string) {
    setSavingResistanceId(caseUserId)
    const res = await fetch('/api/case-users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseUserId,
        onboardingResistanceLevel: level,
        ...(note !== undefined ? { onboardingResistanceNote: note } : {}),
      }),
    })
    if (res.ok) {
      setParticipants(prev => prev.map(p => p.caseUserId === caseUserId
        ? { ...p, onboardingResistanceLevel: level, onboardingResistanceNote: note !== undefined ? (note || null) : p.onboardingResistanceNote }
        : p))
    }
    setSavingResistanceId(null)
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Avance por participante y módulo</h2>
        <p className="text-xs text-muted mt-0.5">Haz clic en un participante para ver el detalle por módulo (% y última actividad) y su perfil de compromiso.</p>
      </div>

      <div className="flex gap-4 text-xs text-muted flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Completo</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />En progreso</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-surface-2 border border-subtle inline-block" />Sin iniciar / no aplica</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm border border-dashed border-subtle inline-block" />Sin invitar</span>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">Este caso todavía no tiene participantes con puesto asignado.</p>
      ) : (
        <div className="space-y-1.5">
          {participants.map(p => {
            const applicableModules = moduleOrder.filter(m => p.cells[m.code]?.totalQuestions > 0)
            const completedCount = applicableModules.filter(m => p.cells[m.code]?.completed).length
            const isExpanded = expandedId === p.caseUserId
            const { engagement: eng } = p

            return (
              <div key={p.caseUserId} className={`rounded-xl border transition-colors ${isExpanded ? 'border-accent/30 bg-accent-soft/20' : 'border-subtle'}`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.caseUserId)}
                  className="w-full flex items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {!p.invited && (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-dashed border-subtle text-faint flex-shrink-0">sin invitar</span>
                    )}
                    {p.isTestAccount && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 border border-subtle text-faint flex-shrink-0">prueba</span>
                    )}
                    {p.onboardingResistanceLevel && (
                      <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ${RESISTANCE_COLOR[p.onboardingResistanceLevel]}`}>
                        resistencia {p.onboardingResistanceLevel}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{p.fullName || p.jobTitle || 'Sin nombre'}</p>
                      <p className="text-xs text-muted truncate">{p.jobPositionName ?? 'Sin puesto asignado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-medium ${completedCount === applicableModules.length && applicableModules.length > 0 ? 'text-emerald-600' : 'text-muted'}`}>
                      {applicableModules.length > 0 ? `${completedCount}/${applicableModules.length} módulos` : 'Sin módulos mapeados'}
                    </span>
                    <span className="text-xs text-faint">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-subtle/60 space-y-4">

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      {moduleOrder.map(m => {
                        const cell = p.cells[m.code]
                        const s = cellStatus(cell.answeredQuestions, cell.totalQuestions, cell.completed)
                        return (
                          <div key={m.code} className={`rounded-lg p-2.5 ${s.bg}`}>
                            <p className="text-xs font-semibold text-ink truncate" title={m.name}>{m.code}</p>
                            <p className={`text-sm font-bold ${s.text}`}>{s.label}</p>
                            {cell.totalQuestions > 0 && (
                              <p className="text-[10px] text-faint mt-0.5">{formatDate(cell.lastActivity)}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Perfil de compromiso — reacción, ritmo y profundidad, no
                        solo tiempo transcurrido (ver [[scope-cut-round2-gnos-modules]]
                        para por qué días solos no distinguen "al vapor" de
                        "se tomó su tiempo"). */}
                    <div>
                      <p className="text-xs font-semibold text-ink mb-1.5">Perfil de compromiso</p>
                      {eng.totalMessages === 0 ? (
                        <p className="text-xs text-muted">Todavía no ha escrito ninguna respuesta.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-surface-2 rounded-lg p-2.5">
                            <p className="text-[10px] text-faint">Reacción</p>
                            <p className="text-sm font-bold text-ink">{eng.reactionDays === null ? '—' : `${eng.reactionDays}d`}</p>
                            <p className="text-[10px] text-faint">invitación → 1ra respuesta</p>
                          </div>
                          <div className="bg-surface-2 rounded-lg p-2.5">
                            <p className="text-[10px] text-faint">Ritmo</p>
                            <p className="text-sm font-bold text-ink">{eng.activeDays} día{eng.activeDays !== 1 ? 's' : ''}</p>
                            <p className="text-[10px] text-faint">con actividad</p>
                          </div>
                          <div className="bg-surface-2 rounded-lg p-2.5">
                            <p className="text-[10px] text-faint">Profundidad</p>
                            <p className="text-sm font-bold text-ink">{eng.avgWordsPerAnswer ?? '—'} pal.</p>
                            <p className="text-[10px] text-faint">promedio por respuesta</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Distintivo subjetivo del onboarding — para comparar
                        después contra el perfil de compromiso real de arriba. */}
                    <div>
                      <p className="text-xs font-semibold text-ink mb-1.5">Resistencia percibida en onboarding</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {RESISTANCE_LEVELS.map(level => (
                          <button
                            key={level}
                            onClick={() => setResistance(p.caseUserId, p.onboardingResistanceLevel === level ? null : level)}
                            disabled={savingResistanceId === p.caseUserId}
                            className={`text-xs px-2.5 py-1 rounded-lg border capitalize transition-colors disabled:opacity-50 ${
                              p.onboardingResistanceLevel === level ? RESISTANCE_COLOR[level] : 'border-subtle text-muted hover:bg-surface-2'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <textarea
                        placeholder="Nota corta (opcional) — ej. quería solo la entrevista comercial"
                        defaultValue={p.onboardingResistanceNote ?? ''}
                        onBlur={e => {
                          if (e.target.value !== (p.onboardingResistanceNote ?? '')) {
                            setResistance(p.caseUserId, p.onboardingResistanceLevel, e.target.value)
                          }
                        }}
                        rows={2}
                        className="input-field text-xs w-full mt-2 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
