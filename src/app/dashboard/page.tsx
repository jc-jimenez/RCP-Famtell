export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import CreditsBadge from '@/components/shared/CreditsBadge'
import CasesPanel from '@/components/dashboard/CasesPanel'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const db = supabase as any

  // Datos del consultor
  const { data: account } = await db
    .from('accounts')
    .select('id, credits_total, credits_used, plan_id, status')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/login')

  // Casos del consultor
  const { data: cases } = await db
    .from('cases')
    .select('id, company_name, industry, status, created_at, credits_used')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })

  const activeCases = cases?.filter((c: any) => c.status === 'active') ?? []
  const allCases = cases ?? []

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis casos</h1>
            <p className="text-slate-400 text-sm mt-1">
              {activeCases.length} activo{activeCases.length !== 1 ? 's' : ''} · {allCases.length} en total
            </p>
          </div>
          <Link
            href="/dashboard/nuevo-caso"
            className="rounded-xl bg-role-consultor hover:opacity-90 transition-opacity px-5 py-2.5 text-sm font-semibold text-white"
          >
            + Nuevo caso
          </Link>
        </div>

        {/* Créditos */}
        <CreditsBadge
          total={account.credits_total}
          used={account.credits_used}
        />

        {/* Lista de casos */}
        {allCases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
            <p className="text-slate-400 font-medium mb-2">Aún no tienes casos</p>
            <p className="text-slate-600 text-sm mb-6">Crea tu primer caso de diagnóstico para comenzar</p>
            <Link
              href="/dashboard/nuevo-caso"
              className="inline-flex rounded-xl bg-role-consultor hover:opacity-90 transition-opacity px-6 py-2.5 text-sm font-semibold text-white"
            >
              Crear primer caso
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {allCases.map((caso: any) => (
              <Link
                key={caso.id}
                href={`/dashboard/caso/${caso.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900 transition-all p-5 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                      {caso.company_name}
                    </h3>
                    {caso.industry && (
                      <p className="text-slate-500 text-xs mt-0.5">{caso.industry}</p>
                    )}
                  </div>
                  <StatusBadge status={caso.status} />
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-600">
                  <span>{new Date(caso.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {caso.credits_used > 0 && (
                    <span>{caso.credits_used} créditos usados</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'bg-emerald-950/60 text-emerald-400 border-emerald-900/50',
    completed: 'bg-blue-950/60 text-blue-400 border-blue-900/50',
    archived:  'bg-slate-800 text-slate-500 border-slate-700',
  }
  const labels: Record<string, string> = {
    active:    'Activo',
    completed: 'Completado',
    archived:  'Archivado',
  }
  return (
    <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${styles[status] ?? styles.archived}`}>
      {labels[status] ?? status}
    </span>
  )
}
