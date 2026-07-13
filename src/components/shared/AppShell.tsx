'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import type { UserRole } from '@/types'
import NotificationsBell from './NotificationsBell'
import BizdoctorLogo from './BizdoctorLogo'
import ThemeToggle from './ThemeToggle'
import CircularProgress from './CircularProgress'

interface NavItem {
  label: string
  href: string
  icon: string
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS_BY_ROLE: Record<UserRole, NavSection[]> = {
  super_admin: [
    {
      label: 'Principal',
      items: [
        { label: 'Panel',               href: '/admin',              icon: '▦' },
        { label: 'Usuarios',            href: '/admin/usuarios',     icon: '◉' },
        { label: 'Consultores',         href: '/admin/consultores',  icon: '◎' },
        { label: 'Casos',               href: '/admin/casos',        icon: '▣' },
        { label: 'Créditos',            href: '/admin/creditos',     icon: '◍' },
        { label: 'Módulos Diagnóstico', href: '/admin/catalogo',     icon: '📋' },
        { label: 'Roles',               href: '/admin/roles',        icon: '⚑' },
      ],
    },
    { label: 'Sistema', items: [{ label: 'Configuración', href: '/settings', icon: '⚙' }] },
  ],
  consultant: [
    {
      label: 'Principal',
      items: [
        { label: 'Mis casos',  href: '/dashboard',            icon: '▤' },
        { label: 'Nuevo caso', href: '/dashboard/nuevo-caso',  icon: '＋' },
        { label: 'Agenda',     href: '/dashboard/agenda',      icon: '🗓' },
        { label: 'Biblioteca', href: '/dashboard/biblioteca',  icon: '📚' },
        { label: 'Créditos',   href: '/dashboard/creditos',    icon: '◍' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { label: 'Onboarding',    href: '/onboarding', icon: '🎓' },
        { label: 'Configuración', href: '/settings',   icon: '⚙' },
      ],
    },
  ],
  director: [
    { label: 'Principal', items: [{ label: 'Mi diagnóstico', href: '/mi-caso', icon: '▤' }] },
    { label: 'Sistema', items: [{ label: 'Onboarding', href: '/onboarding', icon: '🎓' }] },
  ],
  collaborator: [
    { label: 'Principal', items: [{ label: 'Mis módulos', href: '/mis-modulos', icon: '▤' }] },
    { label: 'Sistema', items: [{ label: 'Onboarding', href: '/onboarding', icon: '🎓' }] },
  ],
}

// Pill de rol (texto + fondo suave) — tokens con contraparte oscura, ya no
// mezcla bg-amber-50/bg-emerald-50 crudos con el token de texto.
const ROLE_PILL: Record<UserRole, string> = {
  super_admin:  'bg-role-admin-soft text-role-admin',
  consultant:   'bg-role-consultor-soft text-role-consultor',
  director:     'bg-role-directivo-soft text-role-directivo',
  collaborator: 'bg-role-colaborador-soft text-role-colaborador',
}

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin:  'Admin',
  consultant:   'Consultor',
  director:     'Directivo',
  collaborator: 'Colaborador',
}

interface AppShellProps {
  children: React.ReactNode
  role: UserRole
  email: string
  /** Para directivos/consultor viendo un caso: nombre de la empresa del caso */
  caseCompanyName?: string
  /** Para directivos: progreso de módulos */
  modulesCompleted?: number
  /** Para directivos: total de módulos del caso (default 7, catálogo global) */
  modulesTotal?: number
  /** Link de "continuar" de la tarjeta de caso actual (default: /mi-caso) */
  currentCaseHref?: string
  /**
   * Navegación secundaria de un caso específico (módulos, KPIs, brief, etc.)
   * — antes se pasaba como barra horizontal/dropdown debajo del header, pero
   * el usuario pidió que viva como sección vertical persistente del sidebar,
   * igual que el resto de la navegación (ver DirectorTabs.tsx/CasoTabs.tsx,
   * que ya renderizan como lista vertical). El nombre "tabBar" quedó de la
   * época horizontal — se mantiene para no tocar los ~18 call-sites que ya
   * lo pasan.
   */
  tabBar?: React.ReactNode
}

export default function AppShell({
  children,
  role,
  email,
  caseCompanyName,
  modulesCompleted = 0,
  modulesTotal = 7,
  currentCaseHref = '/mi-caso',
  tabBar,
}: AppShellProps) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const sections = NAV_SECTIONS_BY_ROLE[role]
  const showSidebar = sections.some(s => s.items.length > 0)
  const showCaseCard = !!caseCompanyName && (role === 'director' || role === 'consultant')
  const casePercent = modulesTotal > 0 ? Math.round((modulesCompleted / modulesTotal) * 100) : 0

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    // Recarga completa para que el middleware vea la sesión ya limpia
    window.location.assign('/login')
  }

  const initials = (email?.[0] ?? '?').toUpperCase()

  const sidebarContent = (
    <>
      {/* Logo / marca */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-brand flex items-center justify-center text-white text-sm flex-shrink-0">
          ✨
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-ink leading-tight truncate">
            <BizdoctorLogo />
          </p>
          <p className="section-label leading-none mt-0.5">AI Platform</p>
        </div>
      </div>

      {/* Nav — altura natural (ya no flex-1): con flex-1 el nav se estiraba
          para llenar todo el sidebar y empujaba "Este caso" hasta el fondo,
          donde se perdía. Ahora el menú del caso queda pegado justo debajo
          de Configuración, y un spacer aparte empuja el resto al fondo. */}
      <nav className="px-3 py-2 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-5' : ''}>
            {section.label && (
              <p className="section-label px-3 mb-1.5">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    onClick={() => setMobileNavOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:translate-x-0.5
                      ${active ? 'text-accent' : 'text-muted hover:text-ink'}
                    `}
                    style={{ transitionProperty: 'color, transform' }}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 bg-accent-soft rounded-xl"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 text-base leading-none w-4 text-center">{item.icon}</span>
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Navegación del caso (módulos, KPIs, brief, etc.) — sección propia,
          siempre visible, no un dropdown ni barra horizontal. Pegada justo
          debajo de Configuración (última sección del nav de arriba). */}
      {tabBar && (
        <div className="px-3 py-2 border-t border-subtle max-h-[45vh] overflow-y-auto">
          {tabBar}
        </div>
      )}

      {/* Spacer: empuja tema/tarjeta de caso/footer al fondo del sidebar
          sin que el nav de arriba tenga que estirarse para lograrlo. */}
      <div className="flex-1" />

      {/* Toggle de tema */}
      <div className="px-4 py-3 border-t border-subtle">
        <ThemeToggle />
      </div>

      {/* Tarjeta de caso actual */}
      {showCaseCard && (
        <div className="mx-3 mb-3 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft to-surface-2 p-4">
          <p className="section-label mb-1">Caso actual</p>
          <p className="text-sm font-semibold text-ink truncate mb-3">{caseCompanyName}</p>
          <div className="flex items-center gap-3">
            <CircularProgress percent={casePercent} size={44} strokeWidth={4}>
              <span className="text-xs font-bold text-ink">{casePercent}%</span>
            </CircularProgress>
            <Link
              href={currentCaseHref as any}
              className="btn-primary text-xs px-3 py-2 flex-1 text-center"
            >
              Continuar →
            </Link>
          </div>
        </div>
      )}

      {/* Footer con email + logout */}
      <div className="px-4 py-4 border-t border-subtle">
        <p className="text-xs text-muted truncate mb-2">{email}</p>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-xs text-faint hover:text-ink transition-colors disabled:opacity-50"
        >
          {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-canvas text-ink flex">

      {/* ── Sidebar desktop ── */}
      {showSidebar && (
        <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-subtle bg-surface">
          {sidebarContent}
        </aside>
      )}

      {/* ── Sidebar mobile (drawer) ── */}
      {showSidebar && mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-64 flex-shrink-0 flex flex-col border-r border-subtle bg-surface z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Layout principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-subtle bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {showSidebar && (
              <button
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden text-ink text-lg leading-none px-1"
                aria-label="Abrir menú"
              >
                ☰
              </button>
            )}
            {!showSidebar && (
              <span className="text-base font-bold text-ink">
                <BizdoctorLogo />
              </span>
            )}
            {caseCompanyName && (
              <>
                <span className="text-faint hidden sm:inline">·</span>
                <span className="text-sm text-ink font-semibold truncate hidden sm:inline">{caseCompanyName}</span>
              </>
            )}
            {role === 'director' && (
              <div className="items-center gap-1.5 ml-4 hidden sm:flex">
                {Array.from({ length: modulesTotal }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-1.5 rounded-full transition-colors ${
                      i < modulesCompleted ? 'bg-module-active' : 'bg-module-locked'
                    }`}
                  />
                ))}
                <span className="text-xs text-muted ml-1">{modulesCompleted}/{modulesTotal}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className={`badge ${ROLE_PILL[role]} hidden sm:inline-flex`}>{ROLE_LABEL[role]}</span>
            {(role === 'consultant' || role === 'super_admin') && <NotificationsBell />}
            <Link href="/settings" className="w-8 h-8 rounded-full bg-surface-2 border border-subtle flex items-center justify-center text-xs font-semibold text-muted hover:bg-surface-2 hover:border-accent transition-colors" title="Configuración">
              {initials}
            </Link>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {loggingOut ? 'Saliendo…' : 'Salir'}
            </button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
