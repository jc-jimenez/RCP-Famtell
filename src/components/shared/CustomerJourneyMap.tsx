import Link from 'next/link'
import type { CustomerJourney, JourneyStageStatus } from '@/lib/customerJourney'

const STATUS_LABEL: Record<JourneyStageStatus, string> = {
  completed: 'Completado',
  active: 'En progreso',
  pending: 'Pendiente',
}

const STATUS_CIRCLE: Record<JourneyStageStatus, string> = {
  completed: 'bg-emerald-500 border-emerald-500 text-white',
  active: 'bg-accent-soft border-accent text-accent',
  pending: 'bg-surface-2 border-subtle text-faint',
}

const STATUS_BADGE: Record<JourneyStageStatus, string> = {
  completed: 'badge-success',
  active: 'badge-info',
  pending: 'badge-neutral',
}

interface Props {
  journey: CustomerJourney
  continueHref: string
  continueLabel?: string
  showFindings?: boolean
}

export default function CustomerJourneyMap({ journey, continueHref, continueLabel = 'Continuar ahora', showFindings = true }: Props) {
  const { stages, currentStageIndex, stats } = journey
  const currentStage = stages[currentStageIndex]

  if (stages.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm text-faint">No se pudo calcular el journey de este caso todavía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stepper de 7 etapas */}
      <div className="card p-5 overflow-x-auto">
        <div className="flex items-stretch gap-1 min-w-[720px]">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex-1 flex items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${STATUS_CIRCLE[stage.status]}`}>
                    {stage.status === 'completed' ? '✓' : i + 1}
                  </div>
                  <span className="text-lg">{stage.icon}</span>
                </div>
                <p className="text-xs font-semibold text-ink leading-tight mb-1 min-h-[2rem]">{stage.label}</p>
                <p className="text-xs text-faint leading-snug line-clamp-3 min-h-[2.5rem]">{stage.description}</p>
                <span className={`badge ${STATUS_BADGE[stage.status]} mt-2`}>{STATUS_LABEL[stage.status]}</span>
              </div>
              {i < stages.length - 1 && (
                <div className={`h-0.5 w-4 flex-shrink-0 mx-1 mt-4 ${stage.status === 'completed' ? 'bg-emerald-400' : 'bg-subtle'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Journey en números */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Tu journey en números</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <Stat icon="📊" value={`${stats.overallPercent}%`} label="Avance general" />
            <Stat icon="📅" value={String(stats.daysElapsed)} label="Días transcurridos" />
            <Stat icon="🧩" value={`${stats.activeModules}/${stats.totalModules}`} label="Módulos activos" />
            <Stat icon="💬" value={String(stats.questionsAnswered)} label="Preguntas respondidas" />
            {showFindings && <Stat icon="🚩" value={String(stats.findingsDetected)} label="Hallazgos detectados" />}
            <Stat icon="⚡" value={String(stats.priorityActions)} label="Acciones prioritarias" />
          </div>
        </div>

        {/* Dónde estás ahora */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-1">¿Dónde estás ahora?</h2>
          <p className="text-xs text-muted mb-3">
            Vas en el paso {currentStageIndex + 1} de {stages.length} · {currentStage?.label}
          </p>
          <div className="flex items-center gap-1.5 mb-4">
            {stages.map((s, i) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full ${
                  i < currentStageIndex ? 'bg-emerald-400' : i === currentStageIndex ? 'bg-accent' : 'bg-subtle'
                }`}
              />
            ))}
          </div>
          <Link href={continueHref as any} className="btn-primary text-sm w-full text-center block">
            {continueLabel} →
          </Link>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div>
      <p className="text-lg mb-1">{icon}</p>
      <p className="text-xl font-bold text-ink">{value}</p>
      <p className="text-xs text-faint leading-snug">{label}</p>
    </div>
  )
}
