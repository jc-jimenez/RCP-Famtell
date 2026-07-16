export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import AppShell from '@/components/shared/AppShell'

// Respaldo manual del caso, pedido explícito del consultor: quiere una
// copia de lo ya contestado sin depender de que un módulo entero llegue a
// verde (el único respaldo automático que existía antes, moduleBackup.ts,
// solo se dispara en ese momento y solo cubre sesiones completed:true).
export default async function AdminCasoRespaldosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: caseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) redirect('/login')

  const admin = getSupabaseAdmin()
  if (!admin) redirect('/admin/casos')
  const db = admin as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', caseId)
    .maybeSingle()
  if (!caseData) redirect('/admin/casos')

  const { data: participants } = await db
    .from('case_users')
    .select('id, user_id, full_name, invitation_email, job_position_id, role')
    .eq('case_id', caseId)
    .in('role', ['director', 'collaborator'])

  const positionIds = [...new Set((participants ?? []).map((p: any) => p.job_position_id).filter(Boolean))]
  const { data: positions } = positionIds.length > 0
    ? await db.from('case_job_positions').select('id, name').in('id', positionIds)
    : { data: [] }
  const positionNameById: Record<string, string> = {}
  ;(positions ?? []).forEach((p: any) => { positionNameById[p.id] = p.name })

  const { data: sessionCounts } = await db
    .from('sessions')
    .select('user_id')
    .eq('case_id', caseId)
  const userIdsWithSessions = new Set((sessionCounts ?? []).map((s: any) => s.user_id))

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <Link href={`/admin/casos/${caseId}` as any} className="text-xs text-muted hover:text-ink mb-1 inline-block">
            ← {caseData.company_name}
          </Link>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block">
            Modo soporte — editando el caso de otro consultor
          </p>
        </div>

        <nav className="flex gap-1.5">
          <Link href={`/admin/casos/${caseId}?tab=diagnostico` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">
            Diagnóstico
          </Link>
          <Link href={`/admin/casos/${caseId}?tab=participantes` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">
            Participantes
          </Link>
          <Link href={`/admin/casos/${caseId}/plan` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">
            Módulos
          </Link>
          <Link href={`/admin/casos/${caseId}/puestos` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">
            Puestos
          </Link>
          <Link href={`/admin/casos/${caseId}/avance` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">
            Avance
          </Link>
          <Link href={`/admin/casos/${caseId}/respaldos` as any} className="text-sm px-4 py-2 rounded-xl bg-accent-soft text-accent font-medium transition-colors">
            Respaldos
          </Link>
        </nav>

        <div className="card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-ink">Respaldo general del caso</h2>
          <p className="text-xs text-muted">
            Snapshot completo en JSON: datos del caso, puestos, participantes, módulos, catálogo de preguntas
            efectivo de este caso y todas las entrevistas aplicadas (mensajes completos, no solo metadata).
          </p>
          <a
            href={`/api/admin/backup/case?caseId=${caseId}`}
            className="btn-primary text-sm px-4 py-2 inline-block"
          >
            ⬇ Descargar respaldo general (JSON)
          </a>
        </div>

        <div className="card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Respaldo por participante</h2>
            <p className="text-xs text-muted mt-0.5">
              PDF con todo lo que cada participante haya contestado hasta el momento — completado o no,
              sin esperar a que el módulo entero llegue a verde.
            </p>
          </div>

          {(participants ?? []).length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">Este caso todavía no tiene participantes.</p>
          ) : (
            <div className="space-y-1.5">
              {(participants ?? []).map((p: any) => {
                const hasActivity = p.user_id && userIdsWithSessions.has(p.user_id)
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-subtle">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{p.full_name || p.invitation_email || 'Sin nombre'}</p>
                      <p className="text-xs text-muted truncate">{p.job_position_id ? (positionNameById[p.job_position_id] ?? 'Sin puesto') : 'Sin puesto asignado'}</p>
                    </div>
                    {hasActivity ? (
                      <a
                        href={`/api/admin/backup/participante?caseId=${caseId}&caseUserId=${p.id}`}
                        className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap flex-shrink-0"
                      >
                        ⬇ Descargar PDF
                      </a>
                    ) : (
                      <span className="text-xs text-faint flex-shrink-0">Sin actividad</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
