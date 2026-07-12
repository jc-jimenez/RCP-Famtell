export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'

export default async function BibliotecaPage() {
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
    .order('company_name', { ascending: true })

  const caseIds = (cases ?? []).map((c: any) => c.id)

  let briefByCase: Record<string, string> = {}
  let backupsByCase: Record<string, { module_code: string; backup_pdf_path: string }[]> = {}

  if (caseIds.length > 0) {
    const [{ data: briefs }, { data: modules }] = await Promise.all([
      db.from('brief_documents').select('case_id, status').in('case_id', caseIds),
      db.from('modules').select('case_id, module_code, backup_pdf_path').in('case_id', caseIds).not('backup_pdf_path', 'is', null),
    ])
    ;(briefs ?? []).forEach((b: any) => { briefByCase[b.case_id] = b.status })
    ;(modules ?? []).forEach((m: any) => {
      if (!backupsByCase[m.case_id]) backupsByCase[m.case_id] = []
      backupsByCase[m.case_id].push(m)
    })
  }

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Biblioteca y Reportes</h1>
          <p className="text-muted text-sm mt-1">Briefs y respaldos en PDF ya generados por caso</p>
        </div>

        {(cases ?? []).length === 0 ? (
          <div className="card p-10 text-center border-dashed">
            <p className="text-muted font-medium">No tienes casos todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(cases ?? []).map((c: any) => {
              const briefStatus = briefByCase[c.id]
              const backups = backupsByCase[c.id] ?? []
              return (
                <div key={c.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-ink">{c.company_name}</p>
                    <Link href={`/caso/${c.id}/brief` as any} className="text-xs text-accent hover:underline">
                      {briefStatus === 'published' ? 'Brief publicado →' : briefStatus === 'draft' ? 'Brief en borrador →' : 'Generar brief →'}
                    </Link>
                  </div>
                  {backups.length === 0 ? (
                    <p className="text-xs text-faint">Sin PDFs de respaldo generados todavía</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {backups.map(m => (
                        <a
                          key={m.module_code}
                          href={`/api/modules/backup?caseId=${c.id}&moduleCode=${m.module_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1 rounded-lg border border-subtle bg-surface-2 text-muted hover:text-accent hover:border-accent/30 transition-colors"
                        >
                          📄 {m.module_code}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
