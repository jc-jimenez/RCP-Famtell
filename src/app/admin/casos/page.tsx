import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import AppShell from '@/components/shared/AppShell'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminCasosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin()
  const db = admin as any

  const { data: cases } = await db
    .from('cases')
    .select('id,company_name,industry,status,strategic_intent,created_at,account_id')
    .order('created_at', { ascending: false })

  const { data: accounts } = await db
    .from('accounts')
    .select('id,company_name,email')

  const accountMap: Record<string, { company_name: string; email: string }> = {}
  for (const a of accounts ?? []) accountMap[a.id] = a

  const STATUS_COLORS: Record<string, string> = {
    active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    completed: 'text-faint bg-surface-2 border-subtle',
    pending: 'text-amber-700 bg-amber-50 border-amber-200',
  }

  const INTENT_ICON: Record<string, string> = { growth: '🔵', restructure: '🟡', exit: '🔴', mixed: '⚪' }

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href={'/admin' as any} className="text-xs text-muted hover:text-ink">← Panel</Link>
          <h1 className="text-xl font-bold text-ink mt-1">Casos globales</h1>
          <p className="text-muted text-sm mt-0.5">{(cases ?? []).length} casos en la plataforma</p>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle text-xs text-faint uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Industria</th>
                <th className="px-4 py-3 text-left">Consultor</th>
                <th className="px-4 py-3 text-center">Intención</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {(cases ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-faint">Sin casos aún</td></tr>
              )}
              {(cases ?? []).map((c: any) => {
                const acc = accountMap[c.account_id]
                return (
                  <tr key={c.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{c.company_name}</td>
                    <td className="px-4 py-3 text-muted">{c.industry ?? '—'}</td>
                    <td className="px-4 py-3">
                      {acc ? (
                        <>
                          <p className="text-ink text-xs">{acc.company_name}</p>
                          <p className="text-faint text-xs">{acc.email}</p>
                        </>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-base" title={c.strategic_intent ?? 'mixed'}>
                      {INTENT_ICON[c.strategic_intent ?? 'mixed']}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.pending}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-faint text-xs">
                      {new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
