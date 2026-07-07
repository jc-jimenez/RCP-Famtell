'use client'

import Link from 'next/link'

interface Tab {
  id: string
  label: string
  external?: boolean
}

const TABS: Tab[] = [
  { id: 'diagnostico',  label: 'Diagnóstico' },
  { id: 'participantes',label: 'Participantes' },
  { id: 'plan',         label: 'Plan',        external: true },
  { id: 'agenda',       label: 'Agenda Oculta' },
  { id: 'indice',       label: 'Índice IER',   external: true },
  { id: 'crm',         label: 'CRM',          external: true },
  { id: 'radar',       label: 'Radar',        external: true },
  { id: 'propuestas',  label: 'Propuestas',   external: true },
  { id: 'tarifas',     label: 'Tarifas',      external: true },
  { id: 'capacidad',   label: 'Capacidad',    external: true },
  { id: 'escenarios',   label: 'Escenarios',    external: true },
  { id: 'comunicacion', label: 'Comunicación',  external: true },
  { id: 'competencia',  label: 'Competencia',   external: true },
  { id: 'tablas',      label: 'Tablas',       external: true },
  { id: 'kpis',        label: 'KPIs',         external: true },
  { id: 'checkin',     label: 'Check-in',     external: true },
  { id: 'brief',       label: 'Brief M7',     external: true },
  { id: 'portal',      label: 'Portal Cliente' },
]

interface Props {
  caseId: string
  activeTab: string
}

export default function CasoTabs({ caseId, activeTab }: Props) {
  return (
    <div className="overflow-x-auto pb-3">
      <nav className="flex gap-1.5 min-w-max">
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          const href = tab.id === 'plan'
            ? `/dashboard/caso/${caseId}/plan`
            : tab.external
              ? `/caso/${caseId}/${tab.id}`
              : `/dashboard/caso/${caseId}?tab=${tab.id}`

          return (
            <Link
              key={tab.id}
              href={href as any}
              className={`
                px-3.5 py-1.5 text-sm font-medium whitespace-nowrap rounded-full border transition-colors
                ${isActive
                  ? 'bg-accent text-white border-accent'
                  : 'border-subtle text-muted bg-surface hover:text-ink hover:border-accent/40 hover:bg-accent-soft'}
              `}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
