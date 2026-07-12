'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  id: string
  label: string
  href: string
  icon: string
}

interface Props {
  caseId: string
}

export default function DirectorTabs({ caseId }: Props) {
  const pathname = usePathname()

  const TABS: Tab[] = [
    { id: 'modulos',    label: 'Mis Módulos', href: `/caso/${caseId}`,             icon: '🧭' },
    { id: 'kpis',       label: 'KPIs',        href: `/caso/${caseId}/kpis`,        icon: '📊' },
    { id: 'checkin',    label: 'Check-in',    href: `/caso/${caseId}/checkin`,     icon: '✅' },
    { id: 'capacidad',  label: 'Capacidad',   href: `/caso/${caseId}/capacidad`,   icon: '🏗' },
    { id: 'escenarios', label: 'Escenarios',  href: `/caso/${caseId}/escenarios`,  icon: '🔀' },
    { id: 'competencia',label: 'Competencia', href: `/caso/${caseId}/competencia`, icon: '🎯' },
    { id: 'tablas',     label: 'Tablas',      href: `/caso/${caseId}/tablas`,      icon: '📋' },
    { id: 'indice',     label: 'Índice IER',  href: `/caso/${caseId}/indice`,      icon: '📈' },
    { id: 'brief',      label: 'Brief M7',    href: `/caso/${caseId}/brief`,       icon: '📄' },
  ]

  function isActive(tab: Tab) {
    if (tab.id === 'modulos') return pathname === `/caso/${caseId}`
    return pathname.startsWith(tab.href)
  }

  return (
    <nav>
      <p className="section-label px-3 mb-1.5">Este caso</p>
      <div className="space-y-0.5">
        {TABS.map(tab => {
          const active = isActive(tab)
          return (
            <Link
              key={tab.id}
              href={tab.href as any}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              <span className="text-base leading-none w-4 text-center">{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
