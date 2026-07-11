// Cálculo de avance REAL por módulo: cuántos de los puestos que tienen
// preguntas mapeadas en este módulo ya completaron su entrevista.
// Reemplaza la lógica anterior donde `modules.status` se marcaba
// 'completed' con el primer participante que terminaba, sin importar
// si había otros puestos con preguntas propias todavía sin contestar.
// Ver docs/PRD_RCPFAMTELL3PL.md sección 7.1.

import { resolveCatalogScope, applyCatalogScope } from './moduleTemplates'

export type ModuleColorStatus = 'red' | 'amber' | 'green'

export interface PendingPosition {
  jobPositionId: string
  jobPositionName: string
  hasOccupant: boolean
}

export interface ModuleCompletion {
  moduleCode: string
  colorStatus: ModuleColorStatus
  requiredTotal: number
  completedTotal: number
  pending: PendingPosition[]
}

// Puestos que tienen al menos una pregunta activa mapeada en este módulo.
// Una pregunta (base o personalizada) sin ningún puesto mapeado en el caso
// no cuenta para nadie (regla "sin puesto mapeado = oculta", sección 7).
async function getRequiredPositionIds(db: any, caseId: string, moduleCode: string): Promise<string[]> {
  const scope = await resolveCatalogScope(db, caseId)
  const moduleTemplateQuery = db.from('module_templates').select('id').eq('code', moduleCode)
  const { data: moduleTemplate } = await applyCatalogScope(moduleTemplateQuery, scope, caseId).maybeSingle()

  if (!moduleTemplate) return []

  const { data: sections } = await db
    .from('sections')
    .select('id, questions (id, is_active)')
    .eq('module_template_id', moduleTemplate.id)

  const sectionIds: string[] = (sections ?? []).map((s: any) => s.id)
  const questionIds: string[] = (sections ?? []).flatMap((s: any) => (s.questions ?? []).map((q: any) => q.id))

  const positionIds = new Set<string>()

  if (questionIds.length > 0) {
    const { data: overrides } = await db
      .from('case_question_overrides')
      .select('question_id, is_active, job_position_ids')
      .eq('case_id', caseId)
      .in('question_id', questionIds)

    const overrideMap: Record<string, { is_active: boolean; job_position_ids: string[] }> = {}
    ;(overrides ?? []).forEach((o: any) => {
      overrideMap[o.question_id] = { is_active: o.is_active, job_position_ids: o.job_position_ids ?? [] }
    })

    ;(sections ?? []).forEach((s: any) => {
      ;(s.questions ?? []).forEach((q: any) => {
        const ov = overrideMap[q.id]
        const isActive = ov !== undefined ? ov.is_active : q.is_active
        if (!isActive) return
        const jobPositionIds = ov?.job_position_ids ?? []
        jobPositionIds.forEach((id: string) => positionIds.add(id))
      })
    })
  }

  if (sectionIds.length > 0) {
    const { data: customQuestions } = await db
      .from('case_custom_questions')
      .select('job_position_ids, is_active')
      .eq('case_id', caseId)
      .in('section_id', sectionIds)
      .eq('is_active', true)

    ;(customQuestions ?? []).forEach((q: any) => {
      ;(q.job_position_ids ?? []).forEach((id: string) => positionIds.add(id))
    })
  }

  return [...positionIds]
}

export async function computeModuleCompletion(db: any, caseId: string, moduleCode: string): Promise<ModuleCompletion> {
  const requiredPositionIds = await getRequiredPositionIds(db, caseId, moduleCode)

  if (requiredPositionIds.length === 0) {
    // Un módulo sin ningún puesto mapeado no es "nada que contestar" — es
    // una configuración incompleta (nadie recibiría preguntas de este módulo
    // en absoluto). Bloquea igual que un puesto pendiente, no se da por bueno.
    return {
      moduleCode, colorStatus: 'red', requiredTotal: 0, completedTotal: 0,
      pending: [{ jobPositionId: '', jobPositionName: 'Sin preguntas mapeadas a ningún puesto en este módulo — falta configurar en Módulos', hasOccupant: false }],
    }
  }

  const { data: positions } = await db
    .from('case_job_positions')
    .select('id, name')
    .in('id', requiredPositionIds)

  const positionNameMap: Record<string, string> = {}
  ;(positions ?? []).forEach((p: any) => { positionNameMap[p.id] = p.name })

  const { data: caseUsers } = await db
    .from('case_users')
    .select('user_id, job_position_id')
    .eq('case_id', caseId)
    .in('job_position_id', requiredPositionIds)

  const { data: completedSessions } = await db
    .from('sessions')
    .select('user_id')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('completed', true)

  const completedUserIds = new Set((completedSessions ?? []).map((s: any) => s.user_id))

  const pending: PendingPosition[] = []
  let completedTotal = 0

  requiredPositionIds.forEach(posId => {
    const occupants = (caseUsers ?? []).filter((u: any) => u.job_position_id === posId && u.user_id)
    const hasOccupant = occupants.length > 0
    const isComplete = occupants.some((o: any) => completedUserIds.has(o.user_id))
    if (isComplete) {
      completedTotal++
    } else {
      pending.push({ jobPositionId: posId, jobPositionName: positionNameMap[posId] ?? 'Puesto sin nombre', hasOccupant })
    }
  })

  const colorStatus: ModuleColorStatus =
    completedTotal === 0 ? 'red' :
    completedTotal === requiredPositionIds.length ? 'green' :
    'amber'

  return { moduleCode, colorStatus, requiredTotal: requiredPositionIds.length, completedTotal, pending }
}

// Inverso de getRequiredPositionIds: dado un puesto, qué módulos tienen al
// menos una pregunta activa mapeada a él. Se usa para auto-derivar los
// módulos de un participante a partir de su puesto (sección 16, Obs 7) — ya
// no se le pide al consultor seleccionarlos a mano.
export async function getModulesForPosition(db: any, caseId: string, jobPositionId: string): Promise<string[]> {
  const scope = await resolveCatalogScope(db, caseId)
  const templatesQuery = db.from('module_templates').select('id, code, sections (id, questions (id, is_active))').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, scope, caseId).order('sort_order', { ascending: true })

  const allQuestionIds: string[] = (templates ?? []).flatMap((t: any) =>
    (t.sections ?? []).flatMap((s: any) => (s.questions ?? []).map((q: any) => q.id))
  )
  const allSectionIds: string[] = (templates ?? []).flatMap((t: any) => (t.sections ?? []).map((s: any) => s.id))

  const [{ data: overrides }, { data: customQuestions }] = await Promise.all([
    allQuestionIds.length > 0
      ? db.from('case_question_overrides').select('question_id, is_active, job_position_ids').eq('case_id', caseId).in('question_id', allQuestionIds)
      : Promise.resolve({ data: [] }),
    allSectionIds.length > 0
      ? db.from('case_custom_questions').select('section_id, job_position_ids, is_active').eq('case_id', caseId).in('section_id', allSectionIds).eq('is_active', true)
      : Promise.resolve({ data: [] }),
  ])

  const overrideMap: Record<string, { is_active: boolean; job_position_ids: string[] }> = {}
  ;(overrides ?? []).forEach((o: any) => { overrideMap[o.question_id] = { is_active: o.is_active, job_position_ids: o.job_position_ids ?? [] } })

  const customBySection: Record<string, any[]> = {}
  ;(customQuestions ?? []).forEach((q: any) => {
    if (!customBySection[q.section_id]) customBySection[q.section_id] = []
    customBySection[q.section_id].push(q)
  })

  const codes: string[] = []
  ;(templates ?? []).forEach((t: any) => {
    const hasMatch = (t.sections ?? []).some((s: any) => {
      const baseMatch = (s.questions ?? []).some((q: any) => {
        const ov = overrideMap[q.id]
        const isActive = ov !== undefined ? ov.is_active : q.is_active
        if (!isActive) return false
        return (ov?.job_position_ids ?? []).includes(jobPositionId)
      })
      if (baseMatch) return true
      return (customBySection[s.id] ?? []).some((q: any) => (q.job_position_ids ?? []).includes(jobPositionId))
    })
    if (hasMatch) codes.push(t.code)
  })

  return codes
}

export async function computeAllModulesCompletion(db: any, caseId: string): Promise<ModuleCompletion[]> {
  const scope = await resolveCatalogScope(db, caseId)
  const templatesQuery = db.from('module_templates').select('code').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, scope, caseId).order('sort_order', { ascending: true })

  const codes: string[] = (templates ?? []).map((t: any) => t.code)
  return Promise.all(codes.map(code => computeModuleCompletion(db, caseId, code)))
}

export async function isCaseFullyComplete(db: any, caseId: string): Promise<{ complete: boolean; incomplete: ModuleCompletion[] }> {
  const all = await computeAllModulesCompletion(db, caseId)
  const incomplete = all.filter(m => m.colorStatus !== 'green')
  return { complete: incomplete.length === 0, incomplete }
}
