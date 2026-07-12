'use client'

import Link from 'next/link'

interface Account {
  id: string
  email: string
  company_name: string
  credits_balance: number
  subscription_plan: string
  status: string
  created_at: string
}

interface Case {
  id: string
  company_name: string
  status: string
  created_at: string
}

interface Props {
  totalConsultants: number
  totalCases: number
  recentAccounts: Account[]
  recentCases: Case[]
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'badge-warning',
  pro: 'badge-info',
  enterprise: 'badge-neutral',
  free: 'badge-neutral',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  suspended: 'badge-danger',
  trial: 'badge-warning',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Al corriente',
  suspended: 'Por vencer',
  trial: 'Trial',
}

export default function AdminMetricsClient({ totalConsultants, totalCases, recentAccounts, recentCases }: Props) {
  const activos = recentAccounts.filter(a => a.status === 'active').length
  const suspendidos = recentAccounts.filter(a => a.status === 'suspended').length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Panel de control</h1>
          <p className="text-muted text-sm mt-0.5">Vista global de toda la plataforma</p>
        </div>
        <Link href={'/admin/consultores' as any} className="btn-primary text-sm">
          + Nuevo consultor
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Consultores activos', value: totalConsultants, sub: 'cuentas registradas', icon: '👤', accent: 'bg-role-consultor-soft text-role-consultor' },
          { label: 'Casos totales', value: totalCases, sub: 'en la plataforma', icon: '📁', accent: 'bg-accent-soft text-accent' },
          { label: 'Planes activos', value: activos, sub: 'al corriente', icon: '✅', accent: 'bg-badge-success-bg text-badge-success-text' },
          { label: 'Por atender', value: suspendidos, sub: 'suspendidos', icon: '⚠️', accent: 'bg-badge-warning-bg text-badge-warning-text' },
        ].map((m) => (
          <div key={m.label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm mb-3 ${m.accent}`}>
              {m.icon}
            </div>
            <p className="text-3xl font-bold text-ink">{m.value}</p>
            <p className="text-sm font-semibold text-ink mt-1">{m.label}</p>
            <p className="text-xs text-faint mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Nav rápida */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Consultores', href: '/admin/consultores', desc: 'Crear y gestionar cuentas' },
          { label: 'Casos globales', href: '/admin/casos', desc: 'Ver todos los casos' },
          { label: 'Créditos', href: '/admin/creditos', desc: 'Monitor de tokens' },
        ].map((nav) => (
          <Link key={nav.href} href={nav.href as any}
            className="card p-4 hover:shadow-card-hover transition-shadow group">
            <p className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">{nav.label}</p>
            <p className="text-xs text-faint mt-0.5">{nav.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Recent accounts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">Últimos consultores</h2>
            <Link href={'/admin/consultores' as any} className="text-xs text-accent hover:underline">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {recentAccounts.length === 0 && <p className="text-xs text-faint">Sin consultores aún</p>}
            {recentAccounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink truncate font-medium">{a.company_name || a.email}</p>
                  <p className="text-xs text-faint truncate">{a.email}</p>
                </div>
                <span className={`badge ${PLAN_BADGE[a.subscription_plan] ?? 'badge-neutral'}`}>
                  {a.subscription_plan}
                </span>
                <span className="text-xs text-muted w-12 text-right">{a.credits_balance}cr</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent cases */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">Casos recientes</h2>
            <Link href={'/admin/casos' as any} className="text-xs text-accent hover:underline">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {recentCases.length === 0 && <p className="text-xs text-faint">Sin casos aún</p>}
            {recentCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <p className="text-sm text-ink truncate flex-1">{c.company_name}</p>
                <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-warning'}`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
