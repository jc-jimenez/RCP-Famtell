import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import Link from 'next/link'
import { accountToUI } from '@/lib/accounts'
import { isSuperAdminEmail } from '@/lib/permissions'
import CreditosAdminClient from './CreditosAdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminCreditosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || !isSuperAdminEmail(session.user.email)) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin()
  const db = admin as any

  const { data: rawAccounts } = await db
    .from('accounts')
    .select('id,email,company_name,credits_total,credits_used,plan_id,status,created_at')

  const accounts = (rawAccounts ?? [])
    .map(accountToUI)
    .sort((a: any, b: any) => a.credits_balance - b.credits_balance)

  const totalCredits = (accounts ?? []).reduce((s: number, a: any) => s + (a.credits_balance ?? 0), 0)
  const lowCredit = (accounts ?? []).filter((a: any) => (a.credits_balance ?? 0) < 20)

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
          <h1 className="text-xl font-bold text-ink mt-1">Monitor de créditos</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-3xl font-bold text-ink">{totalCredits}</p>
            <p className="text-sm text-muted mt-1">Créditos totales activos</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-bold text-amber-500">{lowCredit.length}</p>
            <p className="text-sm text-muted mt-1">Cuentas con &lt;20 créditos</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-bold text-ink">{(accounts ?? []).length}</p>
            <p className="text-sm text-muted mt-1">Consultores totales</p>
          </div>
        </div>

        {lowCredit.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700 mb-2">Alertas de créditos bajos</p>
            <div className="space-y-1">
              {lowCredit.map((a: any) => (
                <p key={a.id} className="text-xs text-amber-600">{a.company_name} ({a.email}) — {a.credits_balance} créditos</p>
              ))}
            </div>
          </div>
        )}

        <CreditosAdminClient initialAccounts={accounts} />
      </div>
    </AppShell>
  )
}
