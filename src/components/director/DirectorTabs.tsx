'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  id: string
  label: string
  href: string
}

interface Props {
  caseId: string
}

export default function DirectorTabs({ caseId }: Props) {
  const pathname = usePathname()

  const TABS: Tab[] = [
    { id: 'modulos',   label: 'Mis Módulos', href: `/caso/${caseId}` },
    { id: 'kpis',     label: 'KPIs',         href: `/caso/${caseId}/kpis` },
    { id: 'checkin',  label: 'Check-in',     href: `/caso/${caseId}/checkin` },
    { id: 'capacidad',  label: 'Capacidad',   href: `/caso/${caseId}/capacidad` },
    { id: 'escenarios',  label: 'Escenarios',  href: `/caso/${caseId}/escenarios` },
    { id: 'competencia', label: 'Competencia', href: `/caso/${caseId}/competencia` },
    { id: 'indice',     label: 'Índice IER',  href: `/caso/${caseId}/indice` },
    { id: 'brief',      label: 'Brief M7',   href: `/caso/${caseId}/brief` },
  ]

  function isActive(tab: Tab) {
    if (tab.id === 'modulos') return pathname === `/caso/${caseId}`
    return pathname.startsWith(tab.href)
  }

  return (
    <div className="border-b border-subtle overflow-x-auto mb-6">
      <nav className="flex gap-0 min-w-max">
        {TABS.map(tab => (
          <Link
            key={tab.id}
            href={tab.href as any}
            className={`
              px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${isActive(tab)
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink hover:border-subtle'}
            `}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
