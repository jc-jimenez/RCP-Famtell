import { resolveCatalogScope, applyCatalogScope } from './moduleTemplates'

/**
 * Cuenta cuántas preguntas activas le tocan a un puesto específico dentro de
 * un módulo — el mismo criterio de fusión (catálogo base + overrides del
 * caso + preguntas personalizadas) que ya arma el prompt de Nova en
 * src/app/api/ai/chat/route.ts y filtra src/lib/anthropic/prompts/build-from-catalog.ts
 * línea ~73, pero aquí solo se necesita el conteo, no el texto del prompt.
 * Una pregunta base sin override para este caso no tiene job_position_ids,
 * así que nunca cuenta para nadie — mismo comportamiento que el guion real.
 */
export async function countQuestionsForPosition(
  db: any,
  caseId: string,
  moduleCode: string,
  jobPositionId: string | null,
): Promise<number> {
  if (!jobPositionId) return 0

  const scope = await resolveCatalogScope(db, caseId)
  const moduleTemplateQuery = db.from('module_templates').select('id').eq('code', moduleCode).eq('is_active', true)
  const { data: moduleTemplate } = await applyCatalogScope(moduleTemplateQuery, scope, caseId).maybeSingle()
  if (!moduleTemplate) return 0

  const { data: sectionsRaw } = await db
    .from('sections')
    .select('id, questions ( id, is_active )')
    .eq('module_template_id', moduleTemplate.id)

  const sectionIds: string[] = (sectionsRaw ?? []).map((s: any) => s.id)
  if (sectionIds.length === 0) return 0

  const { data: overridesRaw } = await db
    .from('case_question_overrides')
    .select('question_id, is_active, job_position_ids')
    .eq('case_id', caseId)

  const overridesMap: Record<string, { is_active: boolean; job_position_ids: string[] }> = {}
  ;(overridesRaw ?? []).forEach((o: any) => {
    overridesMap[o.question_id] = { is_active: o.is_active, job_position_ids: o.job_position_ids ?? [] }
  })

  const { data: customRaw } = await db
    .from('case_custom_questions')
    .select('id, section_id, is_active, job_position_ids')
    .eq('case_id', caseId)
    .in('section_id', sectionIds)

  let total = 0

  for (const sec of sectionsRaw ?? []) {
    for (const q of sec.questions ?? []) {
      const ov = overridesMap[q.id]
      const isActive = ov !== undefined ? ov.is_active : q.is_active
      if (!isActive) continue
      const jobPositionIds = ov?.job_position_ids ?? []
      if (jobPositionIds.includes(jobPositionId)) total++
    }
  }

  for (const q of customRaw ?? []) {
    if (!q.is_active) continue
    if ((q.job_position_ids ?? []).includes(jobPositionId)) total++
  }

  return total
}

/**
 * Aproxima cuántas preguntas ya se contestaron en una sesión: cuenta
 * mensajes de rol 'user' — el mismo criterio que ya usa el botón "Marcar
 * módulo como completado" en NovaChat.tsx (mensajes de usuario >= 3).
 */
export function countAnsweredMessages(messages: { role: string }[] | null | undefined): number {
  return (messages ?? []).filter(m => m.role === 'user').length
}
