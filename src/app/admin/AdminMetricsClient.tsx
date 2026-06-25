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

const PLAN_COLORS: Record<string, string> = {
  starter: 'text-slate-400 bg-slate-800 border-slate-700',
  pro: 'text-purple-300 bg-purple-950/60 border-purple-800/60',
  enterprise: 'text-amber-300 bg-amber-950/60 border-amber-800/60',
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-400',
  suspended: 'bg-red-400',
  trial: 'bg-amber-400',
}

export default function AdminMetricsClient({ totalConsultants, totalCases, recentAccounts, recentCases }: Props) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel Super Admin</h1>
          <p className="text-slate-400 text-sm mt-0.5">Vista global de toda la plataforma</p>
        </div>
        <Link href={'/admin/consultores' as any} className="btn-primary text-sm bg-role-admin">
          + Nuevo consultor
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Consultores', value: totalConsultants, sub: 'cuentas activas' },
          { label: 'Casos totales', value: totalCases, sub: 'en toda la plataforma' },
          { label: 'Planes activos', value: recentAccounts.filter(a => a.status === 'active').length, sub: 'de los últimos consultores' },
          { label: 'Suspendidos', value: recentAccounts.filter(a => a.status === 'suspended').length, sub: 'requieren atención' },
        ].map((m) => (
          <div key={m.label} className="card p-5">
            <p className="text-3xl font-bold text-white">{m.value}</p>
            <p className="text-sm font-semibold text-slate-300 mt-1">{m.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Nav links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Consultores', href: '/admin/consultores', desc: 'Crear y gestionar cuentas' },
          { label: 'Casos globales', href: '/admin/casos', desc: 'Ver todos los casos' },
          { label: 'Créditos', href: '/admin/creditos', desc: 'Monitor de tokens' },
          { label: 'Premium', href: '/admin/premium', desc: 'Activar módulos A-G' },
        ].map((nav) => (
          <Link key={nav.href} href={nav.href as any}
            className="card p-4 hover:border-slate-600 transition-colors group">
            <p className="text-sm font-semibold text-white group-hover:text-role-admin transition-colors">{nav.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{nav.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Recent accounts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Últimos consultores</h2>
            <Link href={'/admin/consultores' as any} className="text-xs text-slate-500 hover:text-slate-300">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {recentAccounts.length === 0 && <p className="text-xs text-slate-500">Sin consultores aún</p>}
            {recentAccounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[a.status] ?? 'bg-slate-600'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{a.company_name}</p>
                  <p className="text-xs text-slate-500 truncate">{a.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${PLAN_COLORS[a.subscription_plan] ?? PLAN_COLORS.starter}`}>
                  {a.subscription_plan}
                </span>
                <span className="text-xs text-slate-400 w-10 text-right">{a.credits_balance}cr</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent cases */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Casos recientes</h2>
            <Link href={'/admin/casos' as any} className="text-xs text-slate-500 hover:text-slate-300">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {recentCases.length === 0 && <p className="text-xs text-slate-500">Sin casos aún</p>}
            {recentCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <p className="text-sm text-white truncate flex-1">{c.company_name}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  c.status === 'active' ? 'text-emerald-300 bg-emerald-950/40 border-emerald-900/40'
                  : c.status === 'completed' ? 'text-slate-400 bg-slate-800 border-slate-700'
                  : 'text-amber-300 bg-amber-950/40 border-amber-900/40'
                }`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
