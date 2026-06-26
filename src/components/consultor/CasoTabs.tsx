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
  { id: 'agenda',       label: 'Agenda Oculta' },
  { id: 'crm',         label: 'CRM',        external: true },
  { id: 'propuestas',  label: 'Propuestas',  external: true },
  { id: 'tarifas',     label: 'Tarifas',     external: true },
  { id: 'kpis',        label: 'KPIs',        external: true },
  { id: 'checkin',     label: 'Check-in',    external: true },
  { id: 'brief',       label: 'Brief M7',    external: true },
]

interface Props {
  caseId: string
  activeTab: string
}

export default function CasoTabs({ caseId, activeTab }: Props) {
  return (
    <div className="border-b border-subtle overflow-x-auto">
      <nav className="flex gap-0 min-w-max">
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          const href = tab.external
            ? `/caso/${caseId}/${tab.id}`
            : `/dashboard/caso/${caseId}?tab=${tab.id}`

          return (
            <Link
              key={tab.id}
              href={href as any}
              className={`
                px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink hover:border-subtle'}
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
