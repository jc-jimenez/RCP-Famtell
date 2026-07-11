'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import type { UserRole } from '@/types'
import NotificationsBell from './NotificationsBell'
import BizdoctorLogo from './BizdoctorLogo'

interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'Panel',          href: '/admin',                icon: '▦' },
    { label: 'Usuarios',       href: '/admin/usuarios',       icon: '◉' },
    { label: 'Consultores',    href: '/admin/consultores',    icon: '◎' },
    { label: 'Casos',          href: '/admin/casos',          icon: '▣' },
    { label: 'Créditos',       href: '/admin/creditos',       icon: '◍' },
    { label: 'Módulos Diagnóstico', href: '/admin/catalogo', icon: '📋' },
    { label: 'Roles',          href: '/admin/roles',          icon: '⚑' },
    { label: 'Configuración',  href: '/settings',             icon: '⚙' },
  ],
  consultant: [
    { label: 'Mis casos',      href: '/dashboard',            icon: '▤' },
    { label: 'Nuevo caso',     href: '/dashboard/nuevo-caso', icon: '＋' },
    { label: 'Créditos',       href: '/dashboard/creditos',   icon: '◍' },
    { label: 'Onboarding',     href: '/onboarding',           icon: '🎓' },
    { label: 'Configuración',  href: '/settings',             icon: '⚙' },
  ],
  director: [
    { label: 'Mi diagnóstico', href: '/mi-caso',  icon: '▤' },
    { label: 'Onboarding',     href: '/onboarding', icon: '🎓' },
  ],
  collaborator: [
    { label: 'Mis módulos',    href: '/mis-modulos',          icon: '▤' },
    { label: 'Onboarding',     href: '/onboarding',           icon: '🎓' },
  ],
}

// Pill de rol (texto + fondo) — tema claro
const ROLE_PILL: Record<UserRole, string> = {
  super_admin:  'bg-amber-50 text-role-admin',
  consultant:   'bg-accent-soft text-role-consultor',
  director:     'bg-accent-soft text-role-directivo',
  collaborator: 'bg-emerald-50 text-role-colaborador',
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
  /** Para directivos: nombre de la empresa del caso */
  caseCompanyName?: string
  /** Para directivos: progreso de módulos */
  modulesCompleted?: number
  /** Para directivos: total de módulos del caso (default 7, catálogo global) */
  modulesTotal?: number
  /** Barra de tabs que aparece justo debajo del header */
  tabBar?: React.ReactNode
}

export default function AppShell({
  children,
  role,
  email,
  caseCompanyName,
  modulesCompleted = 0,
  modulesTotal = 7,
  tabBar,
}: AppShellProps) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const navItems = NAV_BY_ROLE[role]
  const showSidebar = navItems.length > 0

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    // Recarga completa para que el middleware vea la sesión ya limpia
    window.location.assign('/login')
  }

  const initials = (email?.[0] ?? '?').toUpperCase()

  return (
    <div className="min-h-screen bg-canvas text-ink flex">

      {/* ── Sidebar (SA, Consultor, Colaborador) ── */}
      {showSidebar && (
        <aside className="w-56 flex-shrink-0 flex flex-col border-r border-subtle bg-surface">
          {/* Logo / marca */}
          <div className="px-5 py-5 flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-ink">
              <BizdoctorLogo />
            </span>
            <span className={`badge ${ROLE_PILL[role]} ml-auto`}>{ROLE_LABEL[role]}</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2 space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                    ${active
                      ? 'bg-accent-soft text-accent'
                      : 'text-muted hover:text-ink hover:bg-surface-2'
                    }`}
                >
                  <span className="text-base leading-none w-4 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

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
        </aside>
      )}

      {/* ── Layout principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-subtle bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <span className="text-base font-bold text-ink">
                <BizdoctorLogo />
              </span>
            )}
            {caseCompanyName && (
              <>
                <span className="text-faint">·</span>
                <span className="text-sm text-ink font-semibold">{caseCompanyName}</span>
              </>
            )}
            {role === 'director' && (
              <div className="flex items-center gap-1.5 ml-4">
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

          <div className="flex items-center gap-3">
            <span className={`badge ${ROLE_PILL[role]}`}>{ROLE_LABEL[role]}</span>
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

        {/* Tabs opcionales (sub-páginas de caso) */}
        {tabBar && (
          <div className="border-b border-subtle bg-surface px-6 pt-3">
            {tabBar}
          </div>
        )}

        {/* Contenido */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
