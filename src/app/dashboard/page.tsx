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
            <h1 className="text-xl font-bold text-ink">Mis casos activos</h1>
            <p className="text-muted text-sm mt-1">
              {activeCases.length} activo{activeCases.length !== 1 ? 's' : ''} · {allCases.length} en total
            </p>
          </div>
          <Link href="/dashboard/nuevo-caso" className="btn-primary text-sm">
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
          <div className="rounded-2xl border border-dashed border-subtle bg-surface-2 p-12 text-center">
            <p className="text-ink font-medium mb-2">Aún no tienes casos</p>
            <p className="text-faint text-sm mb-6">Crea tu primer caso de diagnóstico para comenzar</p>
            <Link href="/dashboard/nuevo-caso" className="btn-primary inline-flex text-sm">
              Crear primer caso
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {allCases.map((caso: any) => (
              <Link
                key={caso.id}
                href={`/dashboard/caso/${caso.id}`}
                className="card p-5 hover:shadow-card-hover transition-shadow group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink group-hover:text-accent transition-colors truncate">
                      {caso.company_name}
                    </h3>
                    {caso.industry && (
                      <p className="text-faint text-xs mt-0.5">{caso.industry}</p>
                    )}
                  </div>
                  <StatusBadge status={caso.status} />
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-faint">
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
    active:    'badge-success',
    completed: 'badge-info',
    archived:  'badge-neutral',
  }
  const labels: Record<string, string> = {
    active:    'Activo',
    completed: 'Completado',
    archived:  'Archivado',
  }
  return (
    <span className={`badge ${styles[status] ?? styles.archived}`}>
      {labels[status] ?? status}
    </span>
  )
}
