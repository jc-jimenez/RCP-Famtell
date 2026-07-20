import { getQuestionsForPosition } from './moduleQuestions'
import { getCachedAuditModuleCoverage } from './participantBackupAudit'

// Universo de respuestas del caso completo (todos los participantes, todos
// los módulos con sesión), con referencia exacta (participante, módulo,
// #pregunta) — reutiliza el mismo mecanismo de auditoría ya construido para
// el respaldo PDF por participante (auditModuleCoverage), en vez de
// duplicar la lógica de mapeo pregunta↔respuesta. Es el insumo determinista
// para citar hipótesis estilo referencia bibliográfica, ej. (David, M1, P4)
// — el índice de pregunta sale del mismo orden de catálogo que ya usa el
// respaldo, no de que la IA lo adivine leyendo la transcripción.

export interface AnsweredItem {
  participantName: string
  moduleCode: string
  questionIndex: number // 1-based, orden del catálogo para el puesto de este participante
  questionText: string
  answer: string
}

export async function buildCaseAnswerUniverse(db: any, caseId: string): Promise<AnsweredItem[]> {
  const { data: caseUsersRaw } = await db
    .from('case_users')
    .select('user_id, full_name, invitation_email, job_position_id, is_test_account')
    .eq('case_id', caseId)
    .in('role', ['director', 'collaborator'])
    .not('user_id', 'is', null)

  // Cuentas de prueba no deben generar hipótesis sobre el negocio real —
  // mismo criterio que computeModuleCompletion (moduleCompletion.ts).
  const caseUsers = (caseUsersRaw ?? []).filter((u: any) => !u.is_test_account)

  const userIds: string[] = (caseUsers ?? []).map((u: any) => u.user_id).filter(Boolean)
  if (userIds.length === 0) return []

  const { data: sessions } = await db
    .from('sessions')
    .select('id, user_id, module_code, messages')
    .eq('case_id', caseId)
    .in('user_id', userIds)

  const caseUserByUserId: Record<string, any> = {}
  ;(caseUsers ?? []).forEach((u: any) => { caseUserByUserId[u.user_id] = u })

  const items: AnsweredItem[] = []

  await Promise.all(
    (sessions ?? []).map(async (s: any) => {
      const cu = caseUserByUserId[s.user_id]
      if (!cu?.job_position_id) return

      const catalogQuestions = await getQuestionsForPosition(db, caseId, s.module_code, cu.job_position_id)
      if (catalogQuestions.length === 0) return

      const messages = (s.messages ?? []).map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }))

      const coverage = await getCachedAuditModuleCoverage(db, s.id, catalogQuestions, messages)
      const participantName = cu.full_name || cu.invitation_email || 'Participante'

      coverage.forEach((row, idx) => {
        if (row.covered && row.answer) {
          items.push({
            participantName,
            moduleCode: s.module_code,
            questionIndex: idx + 1,
            questionText: row.question,
            answer: row.answer,
          })
        }
      })
    })
  )

  return items
}
