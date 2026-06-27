'use client'

import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import CasoTabs from '@/components/consultor/CasoTabs'
import type { UserRole } from '@/types'

interface Signal {
  module_code: string
  signal_type: 'blue' | 'yellow' | 'red'
  signal_text: string
  created_at: string
}

interface Props {
  caseId: string
  companyName: string
  role: string
  email: string
  signals: Signal[]
  byModule: Record<string, { blue: number; yellow: number; red: number }>
  dominant: 'growth' | 'restructure' | 'exit' | 'mixed'
  score: number | null
}

const MODULE_NAMES: Record<string, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
}

const INTENT_CONFIG = {
  growth: {
    label: 'Crecimiento',
    emoji: '🔵',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    bar: 'bg-blue-500',
    desc: 'El directivo muestra señales claras de querer crecer el negocio — nuevas instalaciones, más clientes, expansión geográfica o nuevos servicios.',
    recomendacion: 'Enfocar el Plan RCP en estrategias de crecimiento: captación de nuevos clientes, expansión de capacidad y apertura de nuevos mercados.',
  },
  restructure: {
    label: 'Redimensionamiento',
    emoji: '🟡',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
    desc: 'Las señales apuntan a un deseo de simplificar, ordenar o enfocar el negocio antes de crecer. El directivo busca eficiencia sobre expansión.',
    recomendacion: 'Enfocar el Plan RCP en eficiencia operativa: reducción de costos fijos, optimización de procesos y consolidación de la base de clientes actuales.',
  },
  exit: {
    label: 'Salida / Fusión',
    emoji: '🔴',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    bar: 'bg-rose-500',
    desc: 'Hay señales significativas de apertura a una salida, fusión o incorporación de un socio estratégico. El directivo menciona inversionistas, socios o descansar del negocio.',
    recomendacion: 'Conversar directamente sobre opciones de estructura de negocio. El diagnóstico puede posicionarse como preparación para una eventual transición o atracción de inversión.',
  },
  mixed: {
    label: 'Intención mixta',
    emoji: '⚪',
    color: 'text-muted',
    bg: 'bg-surface-2',
    border: 'border-subtle',
    bar: 'bg-muted',
    desc: 'Las señales detectadas son mixtas o insuficientes para determinar una intención estratégica clara. Se recomienda profundizar en los módulos de Agenda Oculta.',
    recomendacion: 'Completar los módulos restantes y revisar manualmente las transcripciones de Nova para identificar el patrón dominante.',
  },
}

const SIGNAL_COLOR = {
  blue:   { dot: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   label: 'Crecimiento' },
  yellow: { dot: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50',  label: 'Redimensionamiento' },
  red:    { dot: 'bg-rose-500',   text: 'text-rose-700',   bg: 'bg-rose-50',   label: 'Salida' },
}

export default function IndiceClient({ caseId, companyName, role, email, signals, byModule, dominant, score }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'
  const isDirector = role === 'director'
  const intent = INTENT_CONFIG[dominant]

  const totalBlue   = signals.filter(s => s.signal_type === 'blue').length
  const totalYellow = signals.filter(s => s.signal_type === 'yellow').length
  const totalRed    = signals.filter(s => s.signal_type === 'red').length
  const totalSignals = signals.length

  // Posición del marcador en el gradiente (0=crecimiento izq, 100=salida der)
  const gaugePos = score ?? 50

  const tabBar = isDirector
    ? <DirectorTabs caseId={caseId} />
    : <CasoTabs caseId={caseId} activeTab="indice" />

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName} tabBar={tabBar}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <h1 className="text-xl font-bold text-ink">Índice de Intención Estratégica</h1>
          <p className="text-sm text-muted mt-1">
            Análisis de señales detectadas por Nova durante los módulos de Agenda Oculta
          </p>
        </div>

        {totalSignals === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <p className="text-3xl">⚪</p>
            <p className="text-sm font-medium text-ink">Sin señales detectadas aún</p>
            <p className="text-xs text-muted max-w-xs mx-auto">
              Las señales se detectan automáticamente cuando Nova conduce los módulos de Agenda Oculta (secciones 1.A a 6.A).
              Completa al menos un módulo con un directivo para ver el índice.
            </p>
          </div>
        ) : (
          <>
            {/* ── Medidor principal ── */}
            <div className={`card p-6 border ${intent.border} space-y-5`}>
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl ${intent.bg} flex items-center justify-center text-3xl flex-shrink-0`}>
                  {intent.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Intención estratégica detectada</p>
                  <h2 className={`text-2xl font-bold ${intent.color}`}>{intent.label}</h2>
                  <p className="text-sm text-muted mt-1">{intent.desc}</p>
                </div>
              </div>

              {/* Gradiente 🔵 → 🟡 → 🔴 */}
              <div>
                <div className="relative h-4 rounded-full overflow-hidden"
                  style={{ background: 'linear-gradient(to right, #3b82f6, #f59e0b, #ef4444)' }}>
                  <div
                    className="absolute top-0 w-4 h-4 bg-white border-2 border-ink rounded-full -translate-x-1/2 shadow"
                    style={{ left: `${gaugePos}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>🔵 Crecimiento</span>
                  <span>🟡 Redimensionamiento</span>
                  <span>🔴 Salida</span>
                </div>
              </div>

              {/* Conteo de señales */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-subtle">
                {(['blue', 'yellow', 'red'] as const).map(type => {
                  const c = SIGNAL_COLOR[type]
                  const count = type === 'blue' ? totalBlue : type === 'yellow' ? totalYellow : totalRed
                  const pct = totalSignals > 0 ? Math.round((count / totalSignals) * 100) : 0
                  return (
                    <div key={type} className={`rounded-xl p-3 ${c.bg} text-center`}>
                      <p className={`text-2xl font-bold ${c.text}`}>{count}</p>
                      <p className={`text-xs font-medium ${c.text}`}>{c.label}</p>
                      <p className="text-xs text-muted mt-0.5">{pct}% del total</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Recomendación del consultor ── */}
            <div className="card p-5 bg-accent-soft border-accent/20 space-y-2">
              <p className="text-xs font-semibold text-accent uppercase tracking-wide">Recomendación para el consultor</p>
              <p className="text-sm text-ink">{intent.recomendacion}</p>
            </div>

            {/* ── Señales por módulo ── */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-ink">Señales por módulo</h2>
              <div className="space-y-3">
                {Object.entries(byModule).sort().map(([mod, counts]) => {
                  const total = counts.blue + counts.yellow + counts.red
                  const isM6 = mod === 'M6'
                  return (
                    <div key={mod}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-faint bg-surface-2 px-2 py-0.5 rounded">{mod}</span>
                        <span className="text-xs text-muted">{MODULE_NAMES[mod]}</span>
                        {isM6 && <span className="text-xs text-accent ml-auto">×2 peso</span>}
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                        {counts.blue > 0 && (
                          <div className="bg-blue-500 h-full" style={{ width: `${(counts.blue / total) * 100}%` }} />
                        )}
                        {counts.yellow > 0 && (
                          <div className="bg-amber-400 h-full" style={{ width: `${(counts.yellow / total) * 100}%` }} />
                        )}
                        {counts.red > 0 && (
                          <div className="bg-rose-500 h-full" style={{ width: `${(counts.red / total) * 100}%` }} />
                        )}
                      </div>
                      <div className="flex gap-3 mt-1">
                        {counts.blue > 0 && <span className="text-[10px] text-blue-600">🔵 {counts.blue}</span>}
                        {counts.yellow > 0 && <span className="text-[10px] text-amber-600">🟡 {counts.yellow}</span>}
                        {counts.red > 0 && <span className="text-[10px] text-rose-600">🔴 {counts.red}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Bitácora de señales ── */}
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-ink">Bitácora de señales detectadas</h2>
              <div className="space-y-2">
                {signals.map((s, i) => {
                  const c = SIGNAL_COLOR[s.signal_type]
                  return (
                    <div key={i} className={`rounded-xl px-4 py-3 ${c.bg} flex items-start gap-3`}>
                      <div className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
                          <span className="text-xs text-faint font-mono">{s.module_code}</span>
                          <span className="text-xs text-faint ml-auto">
                            {new Date(s.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-ink leading-relaxed">{s.signal_text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
