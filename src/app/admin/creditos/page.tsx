import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import Link from 'next/link'
import { accountToUI } from '@/lib/accounts'

export const dynamic = 'force-dynamic'

export default async function AdminCreditosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
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
          <Link href={'/admin' as any} className="text-xs text-slate-500 hover:text-slate-300">← Panel</Link>
          <h1 className="text-2xl font-bold text-white mt-1">Monitor de créditos</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-3xl font-bold text-white">{totalCredits}</p>
            <p className="text-sm text-slate-400 mt-1">Créditos totales activos</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-bold text-amber-400">{lowCredit.length}</p>
            <p className="text-sm text-slate-400 mt-1">Cuentas con &lt;20 créditos</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-bold text-white">{(accounts ?? []).length}</p>
            <p className="text-sm text-slate-400 mt-1">Consultores totales</p>
          </div>
        </div>

        {lowCredit.length > 0 && (
          <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-300 mb-2">Alertas de créditos bajos</p>
            <div className="space-y-1">
              {lowCredit.map((a: any) => (
                <p key={a.id} className="text-xs text-amber-200/70">{a.company_name} ({a.email}) — {a.credits_balance} créditos</p>
              ))}
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Consultor</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-center">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(accounts ?? []).map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{a.company_name}</p>
                    <p className="text-xs text-slate-500">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{a.subscription_plan}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${
                    (a.credits_balance ?? 0) < 10 ? 'text-red-400'
                    : (a.credits_balance ?? 0) < 20 ? 'text-amber-400'
                    : 'text-white'
                  }`}>{a.credits_balance}</td>
                  <td className="px-4 py-3 text-center">
                    {(a.credits_balance ?? 0) < 10 ? '🔴' : (a.credits_balance ?? 0) < 20 ? '🟡' : '🟢'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
