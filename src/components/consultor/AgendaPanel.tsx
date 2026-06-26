'use client'

import type { AgendaSignalType } from '@/types'
import { getDominantIntent } from '@/lib/anthropic/agenda-detector'

interface Signal {
  signal_type: AgendaSignalType
  signal_text: string
  module_code: string
  detected_at: string
}

const SIGNAL_CONFIG = {
  blue: {
    label: 'Crecimiento',
    emoji: '🔵',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    description: 'Escalar, invertir, consolidar',
  },
  yellow: {
    label: 'Redimensionamiento',
    emoji: '🟡',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    description: 'Simplificar, reducir, reiniciar',
  },
  red: {
    label: 'Salida',
    emoji: '🔴',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    description: 'Fusión, venta, socio estratégico',
  },
} as const

export default function AgendaPanel({ signals }: { signals: Signal[] }) {
  const counts = { blue: 0, yellow: 0, red: 0 }
  signals.forEach((s) => counts[s.signal_type]++)

  const total = signals.length
  const dominantRaw = getDominantIntent(signals)
  const recommendD = counts.red >= 4

  const dominantType: AgendaSignalType | null =
    dominantRaw === 'growth'      ? 'blue' :
    dominantRaw === 'restructure' ? 'yellow' :
    dominantRaw === 'exit'        ? 'red' :
    null

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Agenda Oculta</h2>
        <span className="badge badge-danger">Confidencial</span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-faint py-4 text-center">
          Las señales aparecerán conforme el directivo complete los módulos
        </p>
      ) : (
        <>
          {/* Termómetro */}
          <div className="space-y-2">
            {(['blue', 'yellow', 'red'] as const).map((type) => {
              const cfg = SIGNAL_CONFIG[type]
              const count = counts[type]
              const pct = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-sm w-5">{cfg.emoji}</span>
                  <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        type === 'blue' ? 'bg-blue-500' :
                        type === 'yellow' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-4 text-right">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Intención dominante */}
          {dominantType && (
            <div className={`rounded-xl border p-3 ${SIGNAL_CONFIG[dominantType].bgColor} ${SIGNAL_CONFIG[dominantType].borderColor}`}>
              <p className="text-xs font-semibold text-ink mb-0.5">Intención dominante</p>
              <p className={`text-sm font-bold ${SIGNAL_CONFIG[dominantType].textColor}`}>
                {SIGNAL_CONFIG[dominantType].emoji} {SIGNAL_CONFIG[dominantType].label}
              </p>
              <p className="text-xs text-muted mt-0.5">{SIGNAL_CONFIG[dominantType].description}</p>
            </div>
          )}

          {/* Recomendación Módulo D */}
          {recommendD && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">⚠️ Activar Módulo D</p>
              <p className="text-xs text-muted mt-1">
                ≥4 señales de salida detectadas. Se recomienda activar el módulo de Fusiones y Adquisiciones (M&A).
              </p>
            </div>
          )}

          {/* Últimas señales */}
          <div>
            <p className="section-label mb-2">Últimas señales</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {signals.slice(-6).reverse().map((s, i) => {
                const cfg = SIGNAL_CONFIG[s.signal_type]
                return (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-muted leading-snug line-clamp-2">&ldquo;{s.signal_text}&rdquo;</p>
                      <p className="text-faint mt-0.5">{s.module_code}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
