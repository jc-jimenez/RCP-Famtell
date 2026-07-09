export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import ModuleStartClient from '@/app/caso/[id]/modulo/[code]/ModuleStartClient'
import type { ModuleCode } from '@/types'
import { hasCapability } from '@/lib/permissions'
import { getModulesForPosition } from '@/lib/moduleCompletion'

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

  // Sesión existente
  const { data: existingSession } = await db
    .from('sessions')
    .select('id, messages, completed')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const MODULE_LABELS: Record<string, string> = {
    M1: 'Radiografía Comercial', M2: 'Radiografía Operativa',
    M3: 'Base de Contactos', M4: 'Radiografía Financiera',
    M5: 'Radiografía Competitiva', M6: 'Radiografía Interna', M7: 'Síntesis y Plan RCP',
  }

  return (
    <ModuleStartClient
      caseId={caseId}
      moduleCode={moduleCode}
      label={MODULE_LABELS[moduleCode] ?? `Instrumento ${code}`}
      description="Nova te hará una serie de preguntas sobre tu área de trabajo. Responde con honestidad — tu perspectiva es valiosa para el diagnóstico de la empresa."
      duration="15-25 minutos"
      isCompleted={existingSession?.completed ?? false}
      existingSessionId={existingSession?.id ?? null}
      existingMessages={existingSession?.messages ?? []}
      userEmail={session.user.email!}
      userRole="collaborator"
    />
  )
}
