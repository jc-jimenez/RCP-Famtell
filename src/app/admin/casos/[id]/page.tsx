export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import AppShell from '@/components/shared/AppShell'
import ParticipantesPanel from '@/components/consultor/ParticipantesPanel'
import { computeAllModulesCompletion, getModulesForPosition } from '@/lib/moduleCompletion'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'

// Hub del caso en modo soporte del super-admin — espejo acotado del hub del
// consultor (dashboard/caso/[id]/page.tsx): resumen de diagnóstico +
// Participantes. Módulos (puestos + asignación puesto↔pregunta)
// vive en /admin/casos/[id]/plan, igual que en el consultor. Ver sección 16
// del PRD, Obs 4/5.
export default async function AdminCasoHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id: caseId } = await params
  const { tab = 'diagnostico' } = await searchParams

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) redirect('/login')

  const admin = getSupabaseAdmin()
  if (!admin) redirect('/admin/casos')
  const db = admin as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry')
    .eq('id', caseId)
    .maybeSingle()
  if (!caseData) redirect('/admin/casos')

  const catalogScope = await resolveCatalogScope(db, caseId)
  const templatesQuery = db.from('module_templates').select('code, name').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, caseId).order('sort_order', { ascending: true })
  const moduleOrder: string[] = (templates ?? []).map((t: any) => t.code)
  const moduleLabels: Record<string, string> = {}
  ;(templates ?? []).forEach((t: any) => { moduleLabels[t.code] = t.name })

  const { data: modules } = await db
    .from('modules')
    .select('module_code, status, completed_at, credits_used, backup_pdf_path')
    .eq('case_id', caseId)

  const moduleMap: Record<string, any> = {}
  ;(modules ?? []).forEach((m: any) => { moduleMap[m.module_code] = m })
  const completedCount = Object.values(moduleMap).filter((m: any) => m.status === 'completed').length

  const completionList = tab === 'diagnostico' ? await computeAllModulesCompletion(db, caseId) : []
  const completionMap: Record<string, { colorStatus: 'red' | 'amber' | 'green'; pending: { jobPositionName: string; hasOccupant: boolean }[] }> = {}
  completionList.forEach((c: any) => { completionMap[c.moduleCode] = c })

  const { data: participants } = await db
    .from('case_users')
    .select('id, role, job_title, job_position_id, business_role_id, invitation_email, full_name, permissions_json, activated_at, is_test_account')
    .eq('case_id', caseId)

  const { data: rawPositions } = await db
    .from('case_job_positions')
    .select('id, name, job_description, business_role_id')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  const positions = await Promise.all(
    (rawPositions ?? []).map(async (p: any) => ({ ...p, moduleCodes: await getModulesForPosition(db, caseId, p.id) }))
  )

  const { data: businessRoles } = await db
    .from('business_roles')
    .select('id, name')
    .order('sort_order', { ascending: true })

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <div className="max-w-5xl mx-auto space-y-4">

        <div className="flex items-start justify-between">
          <div>
            <Link href={'/admin/casos' as any} className="text-xs text-muted hover:text-ink mb-1 inline-block">
              ← Casos globales
            </Link>
            <h1 className="text-xl font-bold text-ink">{caseData.company_name}</h1>
            {caseData.industry && <p className="text-muted text-sm">{caseData.industry}</p>}
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block mt-1">
              Modo soporte — editando el caso de otro consultor
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-faint">Avance</p>
            <p className="text-2xl font-bold text-ink">{completedCount}<span className="text-faint text-lg">/{moduleOrder.length}</span></p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1.5">
          <Link
            href={`/admin/casos/${caseId}?tab=diagnostico` as any}
            className={`text-sm px-4 py-2 rounded-xl transition-colors ${tab === 'diagnostico' ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-surface-2'}`}
          >
            Diagnóstico
          </Link>
          <Link
            href={`/admin/casos/${caseId}?tab=participantes` as any}
            className={`text-sm px-4 py-2 rounded-xl transition-colors ${tab === 'participantes' ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-surface-2'}`}
          >
            Participantes
          </Link>
          <Link
            href={`/admin/casos/${caseId}/plan` as any}
            className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors"
          >
            Módulos
          </Link>
          <Link
            href={`/admin/casos/${caseId}/puestos` as any}
            className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors"
          >
            Puestos
          </Link>
          <Link
            href={`/admin/casos/${caseId}/avance` as any}
            className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors"
          >
            Avance
          </Link>
        </nav>

        {tab === 'diagnostico' && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Módulos de diagnóstico</h2>
            <div className="space-y-2">
              {moduleOrder.map((code) => {
                const m = moduleMap[code]
                const status = m?.status ?? 'locked'
                const completion = status === 'active' ? completionMap[code] : undefined
                const colorStatus = completion?.colorStatus
                return (
                  <div key={code} className={`flex items-start gap-3 p-3 rounded-xl border ${
                    status === 'completed' ? 'bg-emerald-50/50 border-emerald-100' :
                    status === 'active' && colorStatus === 'amber' ? 'bg-amber-50 border-amber-200' :
                    status === 'active' ? 'bg-rose-50 border-rose-200' :
                    'bg-surface-2 border-subtle'
                  }`}>
                    <span className={`text-xs font-bold w-7 text-center pt-0.5 ${
                      status === 'completed' ? 'text-emerald-600' :
                      status === 'active' && colorStatus === 'amber' ? 'text-amber-600' :
                      status === 'active' ? 'text-rose-600' :
                      'text-faint'
                    }`}>
                      {status === 'completed' ? '✓' : code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm block ${status === 'locked' ? 'text-faint' : 'text-ink'}`}>
                        {moduleLabels[code]}
                      </span>
                      {status === 'active' && completion && completion.pending.length > 0 && (
                        <span className={`text-xs block mt-0.5 ${colorStatus === 'amber' ? 'text-amber-700' : 'text-rose-700'}`}>
                          Falta: {completion.pending.map((p: any) => `${p.jobPositionName}${!p.hasOccupant ? ' (sin invitar)' : ''}`).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-faint">
                        {status === 'completed'
                          ? (m.completed_at ? new Date(m.completed_at).toLocaleDateString('es-MX') : '')
                          : status === 'active' ? (colorStatus === 'amber' ? 'Incompleto' : 'No iniciado') : 'Pendiente'}
                      </span>
                      {status === 'completed' && m.backup_pdf_path && (
                        <a
                          href={`/api/modules/backup?caseId=${caseId}&moduleCode=${code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          📄 PDF de respaldo
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'participantes' && (
          <ParticipantesPanel caseId={caseId} initialParticipants={participants ?? []} initialPositions={positions} businessRoles={businessRoles ?? []} />
        )}

      </div>
    </AppShell>
  )
}
