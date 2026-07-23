export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import AppShell from '@/components/shared/AppShell'
import { computeParticipantModuleMatrix } from '@/lib/adminProgressMatrix'
import AvanceMatrixClient from './AvanceMatrixClient'

// Modo soporte del super-admin: matriz de avance real por participante y
// módulo — a diferencia del tab "Diagnóstico" (que solo dice qué PUESTOS
// faltan por módulo), aquí se ve el % real de cada PERSONA, con fecha de
// última actividad. Pedido explícito del usuario tras ver un caso con varios
// participantes atorados y no poder saber quién específicamente iba atrasado.
export default async function AdminCasoAvancePage({
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

  const { moduleOrder, participants, positionsCount, mappedQuestionsCount, deadlineDays } = await computeParticipantModuleMatrix(db, caseId)

  const activatedCount = participants.filter(p => p.invited).length

  const { data: modulesRows } = await db
    .from('modules')
    .select('status')
    .eq('case_id', caseId)
  const completedModulesCount = (modulesRows ?? []).filter((m: any) => m.status === 'completed').length

  const { data: briefRow } = await db
    .from('brief_documents')
    .select('status')
    .eq('case_id', caseId)
    .maybeSingle()
  const briefStatus: 'not_created' | 'draft' | 'published' = briefRow?.status ?? 'not_created'

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
          <Link href={`/admin/casos/${caseId}/avance` as any} className="text-sm px-4 py-2 rounded-xl bg-accent-soft text-accent font-medium transition-colors">
            Avance
          </Link>
          <Link href={`/admin/casos/${caseId}/respaldos` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">
            Respaldos
          </Link>
          <Link href={`/admin/casos/${caseId}/brief` as any} className="text-sm px-4 py-2 rounded-xl text-muted hover:bg-surface-2 transition-colors">
            Brief
          </Link>
        </nav>

        {/* Ribbon de etapas — resumen de todo el proceso, de Preparación a
            Brief. La matriz de abajo es donde vive el detalle real; esto es
            deliberadamente compacto (números, no prosa). */}
        <div className="card p-4 flex items-center gap-1">
          {[
            {
              label: 'Preparación',
              sub: `${positionsCount} puesto${positionsCount !== 1 ? 's' : ''}, ${mappedQuestionsCount} pregunta${mappedQuestionsCount !== 1 ? 's' : ''}`,
              tone: positionsCount > 0 && mappedQuestionsCount > 0 ? 'green' : 'amber',
              badge: positionsCount > 0 && mappedQuestionsCount > 0 ? '✓' : '!',
            },
            {
              label: 'Participantes',
              sub: participants.length > 0 ? `${participants.length - activatedCount} sin invitar` : 'Sin puestos con dueño',
              tone: participants.length > 0 && activatedCount === participants.length ? 'green' : activatedCount > 0 ? 'amber' : 'red',
              badge: `${activatedCount}/${participants.length}`,
            },
            {
              label: 'Módulos',
              sub: completedModulesCount === moduleOrder.length ? 'Diagnóstico completo' : `${moduleOrder.length - completedModulesCount} en curso o pendientes`,
              tone: completedModulesCount === moduleOrder.length && moduleOrder.length > 0 ? 'green' : completedModulesCount > 0 ? 'amber' : 'red',
              badge: `${completedModulesCount}/${moduleOrder.length}`,
            },
            {
              label: 'Brief',
              sub: briefStatus === 'published' ? 'Publicado al directivo' : briefStatus === 'draft' ? 'En edición' : 'Sin generar',
              tone: briefStatus === 'published' ? 'green' : briefStatus === 'draft' ? 'amber' : 'gray',
              badge: briefStatus === 'published' ? '✓' : briefStatus === 'draft' ? '…' : '🔒',
            },
          ].map((stage, i, arr) => {
            const stageContent = (
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  stage.tone === 'green' ? 'bg-emerald-100 text-emerald-700' :
                  stage.tone === 'amber' ? 'bg-amber-100 text-amber-700' :
                  stage.tone === 'red' ? 'bg-rose-100 text-rose-700' :
                  'bg-surface-2 text-faint'
                }`}>
                  {stage.badge}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{stage.label}</p>
                  <p className="text-[11px] text-muted truncate">{stage.sub}</p>
                </div>
              </div>
            )
            return (
              <div key={stage.label} className="flex items-center gap-1 flex-1">
                {stage.label === 'Brief' ? (
                  <Link href={`/admin/casos/${caseId}/brief` as any} className="hover:opacity-70 transition-opacity min-w-0">
                    {stageContent}
                  </Link>
                ) : stageContent}
                {i < arr.length - 1 && <div className="w-4 h-px bg-subtle flex-shrink-0 mx-1" />}
              </div>
            )
          })}
        </div>

        <AvanceMatrixClient caseId={caseId} moduleOrder={moduleOrder} participants={participants} initialDeadlineDays={deadlineDays} />
      </div>
    </AppShell>
  )
}
