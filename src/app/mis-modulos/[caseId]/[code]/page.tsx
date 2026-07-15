export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import ModuleStartClient from '@/app/caso/[id]/modulo/[code]/ModuleStartClient'
import type { ModuleCode } from '@/types'
import { hasCapability } from '@/lib/permissions'
import { getModulesForPosition } from '@/lib/moduleCompletion'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import { countQuestionsForPosition } from '@/lib/moduleQuestions'

const ALL_MODULE_CODES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

// Los colaboradores usan el mismo componente de chat que el directivo
// pero con el moduleCode de su instrumento asignado

export default async function ColaboradorModuloPage({
  params,
}: {
  params: Promise<{ caseId: string; code: string }>
}) {
  const { caseId, code } = await params
  const moduleCode = code.toUpperCase() as ModuleCode

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Verificar acceso del colaborador al instrumento
  const { data: caseUser } = await db
    .from('case_users')
    .select('role, job_position_id, job_title')
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!caseUser || !hasCapability(caseUser.role, 'access_collaborator_workspace')) redirect('/mis-modulos')

  // Se recalcula en cada carga a partir del mapeo vigente en Plan de
  // Diagnóstico (no un snapshot guardado al invitar) — ver mis-modulos/page.tsx
  const derivedModules = caseUser.job_position_id
    ? await getModulesForPosition(db, caseId, caseUser.job_position_id)
    : []
  const assignedModules = !caseUser.job_position_id
    ? []
    : derivedModules.length > 0 ? derivedModules : ALL_MODULE_CODES
  if (!assignedModules.includes(moduleCode)) redirect('/mis-modulos')

  // Sesión existente. No se usa .maybeSingle(): si hay más de una fila (p.ej.
  // datos históricos de prueba) esa llamada falla en silencio y el
  // colaborador nunca retoma su conversación — se toma la más reciente.
  const { data: existingSessionRows } = await db
    .from('sessions')
    .select('id, messages, completed, answered_questions')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('user_id', session.user.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
  const existingSession = existingSessionRows?.[0] ?? null

  const catalogScope = await resolveCatalogScope(db, caseId)
  const templateQuery = db.from('module_templates').select('name').eq('code', moduleCode)
  const { data: template } = await applyCatalogScope(templateQuery, catalogScope, caseId).maybeSingle()

  const totalQuestions = await countQuestionsForPosition(db, caseId, moduleCode, caseUser.job_position_id)

  return (
    <ModuleStartClient
      caseId={caseId}
      moduleCode={moduleCode}
      label={template?.name ?? `Instrumento ${code}`}
      description="Nova te hará una serie de preguntas sobre tu área de trabajo. Responde con honestidad — tu perspectiva es valiosa para el diagnóstico de la empresa."
      duration="15-25 minutos"
      isCompleted={existingSession?.completed ?? false}
      existingSessionId={existingSession?.id ?? null}
      existingMessages={existingSession?.messages ?? []}
      totalQuestions={totalQuestions}
      initialAnsweredQuestions={existingSession?.answered_questions ?? 0}
      userEmail={session.user.email!}
      userRole="collaborator"
    />
  )
}
