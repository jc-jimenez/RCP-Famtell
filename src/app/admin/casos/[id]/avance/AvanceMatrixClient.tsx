'use client'

import { useState } from 'react'
import type { ParticipantProgress } from '@/lib/adminProgressMatrix'

interface Props {
  moduleOrder: { code: string; name: string }[]
  participants: ParticipantProgress[]
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

export default function AvanceMatrixClient({ moduleOrder, participants }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="card p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Avance por participante y módulo</h2>
        <p className="text-xs text-muted mt-0.5">Haz clic en un participante para ver el detalle por módulo (% y última actividad).</p>
      </div>

      <div className="flex gap-4 text-xs text-muted">
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
                  <div className="px-3 pb-3 pt-1 border-t border-subtle/60">
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
