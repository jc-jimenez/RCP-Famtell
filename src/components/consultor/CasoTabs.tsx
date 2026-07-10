'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Tab {
  id: string
  label: string
  external?: boolean
}

// Radar (/caso/[id]/radar) se saca del menú a propósito: quedó fuera de
// alcance y nunca se configuró DENUE_TOKEN, así que solo mostraba una
// pantalla pidiendo setup técnico. La ruta y el código siguen intactos por
// si se retoma más adelante.
const TABS: Tab[] = [
  { id: 'diagnostico',  label: 'Diagnóstico' },
  { id: 'participantes',label: 'Participantes' },
  { id: 'plan',         label: 'Módulos',     external: true },
  { id: 'puestos',      label: 'Puestos',     external: true },
  { id: 'agenda',       label: 'Agenda Oculta' },
  { id: 'indice',       label: 'Índice IER',   external: true },
  { id: 'crm',         label: 'CRM',          external: true },
  { id: 'propuestas',  label: 'Propuestas',   external: true },
  { id: 'tarifas',     label: 'Tarifas',      external: true },
  { id: 'capacidad',   label: 'Capacidad',    external: true },
  { id: 'escenarios',   label: 'Escenarios',    external: true },
  { id: 'comunicacion', label: 'Comunicación',  external: true },
  { id: 'competencia',  label: 'Competencia',   external: true },
  { id: 'tablas',      label: 'Tablas',       external: true },
  { id: 'clima',       label: 'Clima',        external: true },
  { id: 'kpis',        label: 'KPIs',         external: true },
  { id: 'checkin',     label: 'Check-in',     external: true },
  { id: 'brief',       label: 'Brief M7',     external: true },
  { id: 'portal',      label: 'Portal Cliente' },
]

// Agrupación tipo árbol para el menú vertical del caso (sección 16, Obs 6) —
// reemplaza la barra horizontal de 19 pestañas, difícil de escanear.
interface Group { label: string; tabIds: string[] }
const GROUPS: Group[] = [
  { label: 'Preparación', tabIds: ['puestos', 'participantes', 'plan'] },
  { label: 'Agenda y análisis', tabIds: ['agenda', 'indice', 'clima', 'competencia'] },
  { label: 'Comercial', tabIds: ['crm', 'propuestas', 'tarifas', 'capacidad', 'escenarios', 'comunicacion'] },
  { label: 'Resultados', tabIds: ['tablas', 'kpis', 'checkin', 'brief'] },
  { label: 'Cliente', tabIds: ['portal'] },
]

function tabHref(caseId: string, tab: Tab): string {
  return tab.id === 'plan' || tab.id === 'puestos'
    ? `/dashboard/caso/${caseId}/${tab.id}`
    : tab.external
      ? `/caso/${caseId}/${tab.id}`
      : `/dashboard/caso/${caseId}?tab=${tab.id}`
}

interface Props {
  caseId: string
  activeTab: string
}

export default function CasoTabs({ caseId, activeTab }: Props) {
  const activeGroupLabel = GROUPS.find(g => g.tabIds.includes(activeTab))?.label ?? null
  const [open, setOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupLabel)
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab)

  // Al cambiar de pestaña (navegación), reabre el grupo correspondiente y
  // cierra el menú — ajuste de estado durante el render en vez de un efecto,
  // siguiendo el patrón recomendado por React para sincronizar con props.
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab)
    setOpenGroup(activeGroupLabel)
    setOpen(false)
  }

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label ?? 'Menú'

  return (
    <div className="relative mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-medium text-ink px-3.5 py-1.5 rounded-xl border border-subtle bg-surface hover:border-accent/40 transition-colors"
      >
        <span className="text-faint">Menú</span>
        <span className="text-faint">›</span>
        <span>{activeTabLabel}</span>
        <span className={`text-faint text-xs transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-72 max-h-[70vh] overflow-y-auto card p-2 z-50 shadow-lg">
            {(() => {
              const homeTab = TABS.find(t => t.id === 'diagnostico')
              if (!homeTab) return null
              const isActive = homeTab.id === activeTab
              return (
                <Link
                  href={tabHref(caseId, homeTab) as any}
                  onClick={() => setOpen(false)}
                  className={`block text-sm px-3 py-1.5 rounded-lg mb-1.5 transition-colors ${
                    isActive ? 'bg-accent text-white font-medium' : 'text-muted hover:bg-accent-soft hover:text-ink'
                  }`}
                >
                  {homeTab.label}
                </Link>
              )
            })()}
            {GROUPS.map(group => {
              const isGroupOpen = openGroup === group.label
              return (
                <div key={group.label} className="mb-1">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(g => (g === group.label ? null : group.label))}
                    className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-faint px-2 py-1.5 rounded-lg hover:bg-surface-2"
                  >
                    {group.label}
                    <span className={`transition-transform ${isGroupOpen ? 'rotate-180' : ''}`}>⌄</span>
                  </button>
                  {isGroupOpen && (
                    <div className="pl-2 space-y-0.5 mt-0.5">
                      {group.tabIds.map(id => {
                        const tab = TABS.find(t => t.id === id)
                        if (!tab) return null
                        const isActive = tab.id === activeTab
                        return (
                          <Link
                            key={tab.id}
                            href={tabHref(caseId, tab) as any}
                            onClick={() => setOpen(false)}
                            className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                              isActive ? 'bg-accent text-white font-medium' : 'text-muted hover:bg-accent-soft hover:text-ink'
                            }`}
                          >
                            {tab.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
