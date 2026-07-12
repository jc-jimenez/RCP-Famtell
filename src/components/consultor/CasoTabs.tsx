'use client'

import Link from 'next/link'

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
// vive en el sidebar como sección persistente, no como dropdown flotante.
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

// Todos los grupos van siempre expandidos — el usuario pidió explícitamente
// que este menú no requiera clics para revelar sus opciones, a diferencia
// del acordeón anterior que solo abría el grupo activo.
export default function CasoTabs({ caseId, activeTab }: Props) {
  const homeTab = TABS.find(t => t.id === 'diagnostico')

  return (
    <nav>
      <p className="section-label px-3 mb-1.5">Este caso</p>

      {homeTab && (
        <Link
          href={tabHref(caseId, homeTab) as any}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium mb-1 transition-colors ${
            homeTab.id === activeTab ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink hover:bg-surface-2'
          }`}
        >
          <span className="text-base leading-none w-4 text-center">🩺</span>
          {homeTab.label}
        </Link>
      )}

      {GROUPS.map(group => (
        <div key={group.label} className="mb-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint px-3 py-1">{group.label}</p>
          <div className="pl-2 space-y-0.5">
            {group.tabIds.map(id => {
              const tab = TABS.find(t => t.id === id)
              if (!tab) return null
              const isActive = tab.id === activeTab
              return (
                <Link
                  key={tab.id}
                  href={tabHref(caseId, tab) as any}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
