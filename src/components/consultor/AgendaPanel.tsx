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
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-900/40',
    description: 'Escalar, invertir, consolidar',
  },
  yellow: {
    label: 'Redimensionamiento',
    emoji: '🟡',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-900/40',
    description: 'Simplificar, reducir, reiniciar',
  },
  red: {
    label: 'Salida',
    emoji: '🔴',
    textColor: 'text-red-400',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-900/40',
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-300">Agenda Oculta</h2>
        <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">Solo visible para ti</span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">
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
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        type === 'blue' ? 'bg-blue-500' :
                        type === 'yellow' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-4 text-right">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Intención dominante */}
          {dominantType && (
            <div className={`rounded-xl border p-3 ${SIGNAL_CONFIG[dominantType].bgColor} ${SIGNAL_CONFIG[dominantType].borderColor}`}>
              <p className="text-xs font-semibold text-slate-300 mb-0.5">Intención dominante</p>
              <p className={`text-sm font-bold ${SIGNAL_CONFIG[dominantType].textColor}`}>
                {SIGNAL_CONFIG[dominantType].emoji} {SIGNAL_CONFIG[dominantType].label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{SIGNAL_CONFIG[dominantType].description}</p>
            </div>
          )}

          {/* Recomendación Módulo D */}
          {recommendD && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-3">
              <p className="text-xs font-semibold text-red-400">⚠️ Activar Módulo D</p>
              <p className="text-xs text-slate-400 mt-1">
                ≥4 señales de salida detectadas. Se recomienda activar el módulo de Fusiones y Adquisiciones (M&A).
              </p>
            </div>
          )}

          {/* Últimas señales */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Últimas señales</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {signals.slice(-6).reverse().map((s, i) => {
                const cfg = SIGNAL_CONFIG[s.signal_type]
                return (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-slate-400 leading-snug line-clamp-2">&ldquo;{s.signal_text}&rdquo;</p>
                      <p className="text-slate-600 mt-0.5">{s.module_code}</p>
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
