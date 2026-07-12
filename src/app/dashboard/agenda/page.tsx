export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'

export default async function AgendaPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/dashboard')

  const { data: cases } = await db
    .from('cases')
    .select('id, company_name')
    .eq('account_id', account.id)

  const caseIds = (cases ?? []).map((c: any) => c.id)
  const caseNameById: Record<string, string> = {}
  ;(cases ?? []).forEach((c: any) => { caseNameById[c.id] = c.company_name })

  let checkinsByCase: Record<string, { week_number: number; submitted_at: string | null }> = {}
  let recentSignals: any[] = []

  if (caseIds.length > 0) {
    const [{ data: checkins }, { data: signals }] = await Promise.all([
      db.from('check_ins').select('case_id, week_number, submitted_at').in('case_id', caseIds).order('week_number', { ascending: false }),
      db.from('agenda_signals').select('case_id, signal_type, signal_text, module_code, detected_at').in('case_id', caseIds).order('detected_at', { ascending: false }).limit(15),
    ])
    ;(checkins ?? []).forEach((c: any) => {
      if (!checkinsByCase[c.case_id]) checkinsByCase[c.case_id] = c
    })
    recentSignals = signals ?? []
  }

  interface PendingCheckin {
    caseId: string
    companyName: string
    nextWeek: number
    lastSubmittedAt: string | null
  }

  const pendingCheckins: PendingCheckin[] = (cases ?? [])
    .map((c: any) => {
      const last = checkinsByCase[c.id]
      const nextWeek = (last?.week_number ?? 0) + 1
      return { caseId: c.id, companyName: c.company_name, nextWeek, lastSubmittedAt: last?.submitted_at ?? null }
    })
    .sort((a: PendingCheckin, b: PendingCheckin) => a.companyName.localeCompare(b.companyName))

  const SIGNAL_ICON: Record<string, string> = { blue: '🔵', yellow: '🟡', red: '🔴' }

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Agenda</h1>
          <p className="text-muted text-sm mt-1">Check-ins pendientes y señales recientes de tus casos</p>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Check-ins</h2>
          {pendingCheckins.length === 0 ? (
            <p className="text-xs text-faint">No tienes casos todavía</p>
          ) : (
            <div className="space-y-2">
              {pendingCheckins.map((c: PendingCheckin) => (
                <div key={c.caseId} className="flex items-center justify-between p-3 rounded-xl border border-subtle bg-surface-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{c.companyName}</p>
                    <p className="text-xs text-faint mt-0.5">
                      {c.lastSubmittedAt
                        ? `Último check-in: semana ${c.nextWeek - 1} · ${new Date(c.lastSubmittedAt).toLocaleDateString('es-MX')}`
                        : 'Sin check-ins todavía'}
                    </p>
                  </div>
                  <Link href={`/caso/${c.caseId}/checkin` as any} className="text-xs text-accent hover:underline flex-shrink-0">
                    Ver →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Señales recientes</h2>
          {recentSignals.length === 0 ? (
            <p className="text-xs text-faint">Sin señales detectadas todavía</p>
          ) : (
            <ul className="space-y-2">
              {recentSignals.map((s: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span>{SIGNAL_ICON[s.signal_type] ?? '⚪'}</span>
                  <div className="min-w-0">
                    <p className="text-ink/80 line-clamp-2">{s.signal_text}</p>
                    <p className="text-faint mt-0.5">
                      {caseNameById[s.case_id] ?? '—'} · {s.module_code} · {new Date(s.detected_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
