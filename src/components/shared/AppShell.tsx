'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'Panel global',     href: '/admin',                icon: '◈' },
    { label: 'Consultores',      href: '/admin/consultores',    icon: '◉' },
    { label: 'Casos',            href: '/admin/casos',          icon: '◆' },
    { label: 'Créditos',         href: '/admin/creditos',       icon: '◎' },
    { label: 'Facturación',      href: '/admin/facturacion',    icon: '◇' },
    { label: 'Premium',          href: '/admin/premium',        icon: '◈' },
  ],
  consultant: [
    { label: 'Mis casos',        href: '/dashboard',            icon: '◆' },
    { label: 'Nuevo caso',       href: '/dashboard/nuevo-caso', icon: '+' },
    { label: 'Créditos',         href: '/dashboard/creditos',   icon: '◎' },
  ],
  director: [],
  collaborator: [
    { label: 'Mis módulos',      href: '/mis-modulos',          icon: '◆' },
  ],
}

const ROLE_COLOR: Record<UserRole, string> = {
  super_admin:  'text-role-admin   border-role-admin',
  consultant:   'text-role-consultor border-role-consultor',
  director:     'text-role-directivo border-role-directivo',
  collaborator: 'text-role-colaborador border-role-colaborador',
}

const ROLE_BG: Record<UserRole, string> = {
  super_admin:  'bg-red-950/40',
  consultant:   'bg-purple-950/40',
  director:     'bg-blue-950/40',
  collaborator: 'bg-emerald-950/40',
}

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin:  'Super Admin',
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
  /** Para directivos: progreso de módulos (0-7) */
  modulesCompleted?: number
}

export default function AppShell({
  children,
  role,
  email,
  caseCompanyName,
  modulesCompleted = 0,
}: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const navItems = NAV_BY_ROLE[role]
  const showSidebar = navItems.length > 0

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">

      {/* ── Sidebar (SA, Consultor, Colaborador) ── */}
      {showSidebar && (
        <aside className={`w-56 flex-shrink-0 flex flex-col border-r border-slate-800 ${ROLE_BG[role]}`}>
          {/* Logo / marca */}
          <div className="px-5 py-5 border-b border-slate-800">
            <span className="text-lg font-bold tracking-tight text-white">RCP<span className={ROLE_COLOR[role].split(' ')[0]}>.ai</span></span>
          </div>

          {/* Rol badge */}
          <div className="px-5 py-3">
            <span className={`text-[10px] font-bold uppercase tracking-widest border-b pb-0.5 ${ROLE_COLOR[role]}`}>
              {ROLE_LABEL[role]}
            </span>
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
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer con email + logout */}
          <div className="px-4 py-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 truncate mb-2">{email}</p>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
            </button>
          </div>
        </aside>
      )}

      {/* ── Layout principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar (siempre visible) */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* En móvil o sin sidebar: muestra logo */}
            {!showSidebar && (
              <span className="text-base font-bold">RCP<span className={ROLE_COLOR[role].split(' ')[0]}>.ai</span></span>
            )}
            {caseCompanyName && (
              <span className="text-sm text-slate-400 font-medium">{caseCompanyName}</span>
            )}
            {/* Barra de progreso para directivos */}
            {role === 'director' && (
              <div className="flex items-center gap-1.5 ml-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-1.5 rounded-full transition-colors ${
                      i < modulesCompleted ? 'bg-role-directivo' : 'bg-slate-700'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-500 ml-1">{modulesCompleted}/7</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className={`text-xs font-semibold uppercase tracking-wider ${ROLE_COLOR[role].split(' ')[0]}`}>
              {ROLE_LABEL[role]}
            </span>
            {!showSidebar && (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {loggingOut ? 'Saliendo…' : 'Salir'}
              </button>
            )}
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
