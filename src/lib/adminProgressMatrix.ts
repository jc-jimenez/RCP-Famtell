import { resolveCatalogScope, applyCatalogScope } from './moduleTemplates'

export interface ParticipantModuleCell {
  moduleCode: string
  answeredQuestions: number
  totalQuestions: number
  completed: boolean
  lastActivity: string | null
}

export interface ParticipantEngagement {
  // Invitación → primer mensaje real — "qué tanto le urgió empezar".
  reactionDays: number | null
  // # de fechas de calendario distintas con actividad — un solo día
  // concentrado se ve muy distinto a varias conexiones repartidas.
  activeDays: number
  // Promedio de palabras por mensaje de usuario — proxy de profundidad de
  // respuesta, más confiable que la velocidad sola para distinguir "al
  // vapor" de "se tomó el tiempo" (alguien puede tardar días en empezar por
  // agenda, no por desinterés, pero las respuestas cortas sí son una señal).
  avgWordsPerAnswer: number | null
  totalMessages: number
  // Invitación → hoy, sigue creciendo (a diferencia de reactionDays, que se
  // congela en la primera respuesta) — es el insumo del semáforo de ritmo
  // por módulo. null si no hay fecha de invitación reconstruible.
  daysSinceInvite: number | null
}

export type ModulePace = 'atrasado' | 'proceso' | 'tiempo' | 'avanzado' | 'na'

// Semáforo de ritmo por módulo: no es solo % completado, es % completado
// CONTRA el ritmo esperado dado el plazo estándar de una semana desde la
// invitación (mismo plazo que ya usa el consultor en la práctica). "atrasado"
// se reserva para quien ya pasó la semana sin terminar — no para quien
// simplemente va lento pero sigue dentro de plazo (eso es "proceso").
const DEADLINE_DAYS = 7

export function computeModulePace(cell: ParticipantModuleCell, daysSinceInvite: number | null): ModulePace {
  if (cell.totalQuestions === 0) return 'na'
  if (daysSinceInvite === null) return 'na'
  if (cell.completed) return daysSinceInvite < DEADLINE_DAYS ? 'avanzado' : 'tiempo'
  if (daysSinceInvite > DEADLINE_DAYS) return 'atrasado'
  const actualPct = cell.answeredQuestions / cell.totalQuestions
  const expectedPct = Math.min(1, Math.max(0, daysSinceInvite) / DEADLINE_DAYS)
  return actualPct >= expectedPct ? 'tiempo' : 'proceso'
}

export interface ParticipantProgress {
  caseUserId: string
  userId: string | null
  fullName: string | null
  jobTitle: string | null
  jobPositionId: string | null
  jobPositionName: string | null
  role: string
  invited: boolean
  isTestAccount: boolean
  onboardingResistanceLevel: 'baja' | 'media' | 'alta' | null
  onboardingResistanceNote: string | null
  engagement: ParticipantEngagement
  cells: Record<string, ParticipantModuleCell>
}

function wordCount(text: unknown): number {
  if (typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Matriz Participante × Módulo para el "Avance" de modo soporte del
 * super-admin. Calcula el total de preguntas por (puesto, módulo) UNA sola
 * vez con los datos de todo el catálogo del caso, en vez de llamar
 * countQuestionsForPosition() por cada combinación (esa hace ~4 queries por
 * llamada — con 7 puestos × 7 módulos serían ~200 queries redundantes,
 * la mayoría repitiendo el mismo resolveCatalogScope/overrides/custom).
 */
export async function computeParticipantModuleMatrix(db: any, caseId: string): Promise<{
  moduleOrder: { code: string; name: string }[]
  participants: ParticipantProgress[]
  positionsCount: number
  mappedQuestionsCount: number
}> {
  const catalogScope = await resolveCatalogScope(db, caseId)
  const templatesQuery = db.from('module_templates').select('id, code, name, sort_order').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, caseId).order('sort_order', { ascending: true })
  const moduleOrder = (templates ?? []).map((t: any) => ({ code: t.code, name: t.name }))
  const moduleTemplateIds = (templates ?? []).map((t: any) => t.id)
  const moduleIdToCode: Record<string, string> = {}
  ;(templates ?? []).forEach((t: any) => { moduleIdToCode[t.id] = t.code })

  const { data: sectionsRaw } = moduleTemplateIds.length > 0
    ? await db.from('sections').select('id, module_template_id, questions ( id, is_active )').in('module_template_id', moduleTemplateIds)
    : { data: [] as any[] }

  const sectionIds: string[] = (sectionsRaw ?? []).map((s: any) => s.id)
  const sectionIdToModuleCode: Record<string, string> = {}
  ;(sectionsRaw ?? []).forEach((s: any) => { sectionIdToModuleCode[s.id] = moduleIdToCode[s.module_template_id] })

  const { data: overridesRaw } = await db
    .from('case_question_overrides')
    .select('question_id, is_active, job_position_ids')
    .eq('case_id', caseId)
  const overridesMap: Record<string, { is_active: boolean; job_position_ids: string[] }> = {}
  ;(overridesRaw ?? []).forEach((o: any) => { overridesMap[o.question_id] = { is_active: o.is_active, job_position_ids: o.job_position_ids ?? [] } })

  const { data: customRaw } = sectionIds.length > 0
    ? await db.from('case_custom_questions').select('id, section_id, is_active, job_position_ids').eq('case_id', caseId).in('section_id', sectionIds)
    : { data: [] as any[] }

  // totalByPositionModule[jobPositionId][moduleCode] = # de preguntas activas
  const totalByPositionModule: Record<string, Record<string, number>> = {}
  const mappedQuestionIds = new Set<string>()
  function addCount(jobPositionId: string, moduleCode: string | undefined, questionId: string) {
    if (!moduleCode) return
    if (!totalByPositionModule[jobPositionId]) totalByPositionModule[jobPositionId] = {}
    totalByPositionModule[jobPositionId][moduleCode] = (totalByPositionModule[jobPositionId][moduleCode] ?? 0) + 1
    mappedQuestionIds.add(questionId)
  }

  for (const sec of sectionsRaw ?? []) {
    const moduleCode = sectionIdToModuleCode[sec.id]
    for (const q of sec.questions ?? []) {
      const ov = overridesMap[q.id]
      const isActive = ov !== undefined ? ov.is_active : q.is_active
      if (!isActive) continue
      ;(ov?.job_position_ids ?? []).forEach((pid: string) => addCount(pid, moduleCode, q.id))
    }
  }
  for (const q of customRaw ?? []) {
    if (!q.is_active) continue
    const moduleCode = sectionIdToModuleCode[q.section_id]
    ;(q.job_position_ids ?? []).forEach((pid: string) => addCount(pid, moduleCode, q.id))
  }

  const { data: caseUsers } = await db
    .from('case_users')
    .select('id, user_id, job_position_id, job_title, full_name, role, invitation_email, is_test_account, invitation_expires_at, activated_at, onboarding_resistance_level, onboarding_resistance_note')
    .eq('case_id', caseId)
    .in('role', ['director', 'collaborator'])

  const { data: positions } = await db
    .from('case_job_positions')
    .select('id, name')
    .eq('case_id', caseId)
  const positionNameById: Record<string, string> = {}
  ;(positions ?? []).forEach((p: any) => { positionNameById[p.id] = p.name })

  const userIds: string[] = (caseUsers ?? []).map((u: any) => u.user_id).filter(Boolean)
  const { data: sessions } = userIds.length > 0
    ? await db.from('sessions').select('user_id, module_code, answered_questions, completed, last_message_at, created_at, messages').eq('case_id', caseId).in('user_id', userIds)
    : { data: [] as any[] }

  const sessionMap: Record<string, Record<string, { answered: number; completed: boolean; lastActivity: string | null }>> = {}
  const sessionsByUser: Record<string, any[]> = {}
  ;(sessions ?? []).forEach((s: any) => {
    if (!sessionMap[s.user_id]) sessionMap[s.user_id] = {}
    sessionMap[s.user_id][s.module_code] = {
      answered: s.answered_questions ?? 0,
      completed: !!s.completed,
      lastActivity: s.last_message_at,
    }
    ;(sessionsByUser[s.user_id] ??= []).push(s)
  })

  function computeEngagement(u: any): ParticipantEngagement {
    const userSessions = u.user_id ? (sessionsByUser[u.user_id] ?? []) : []

    // Día 0: invitación reconstruida (expires_at es siempre now()+48h al
    // crearse, así que expires_at-48h da la fecha real de invitación para
    // todo el histórico) o, si el alta fue directa con contraseña (sin
    // invitación por correo), la activación misma.
    const invitedAt: Date | null = u.invitation_expires_at
      ? new Date(new Date(u.invitation_expires_at).getTime() - 48 * 60 * 60 * 1000)
      : u.activated_at ? new Date(u.activated_at) : null

    const daysSinceInvite = invitedAt ? Math.max(0, daysBetween(invitedAt, new Date())) : null

    if (userSessions.length === 0) {
      return { reactionDays: null, activeDays: 0, avgWordsPerAnswer: null, totalMessages: 0, daysSinceInvite }
    }

    const firstSessionStart = userSessions
      .map((s: any) => new Date(s.created_at))
      .reduce((min: Date, d: Date) => d < min ? d : min)

    const reactionDays = invitedAt ? Math.max(0, daysBetween(invitedAt, firstSessionStart)) : null

    const activeDates = new Set<string>()
    let totalWords = 0
    let totalMessages = 0
    userSessions.forEach((s: any) => {
      activeDates.add(new Date(s.created_at).toISOString().slice(0, 10))
      if (s.last_message_at) activeDates.add(new Date(s.last_message_at).toISOString().slice(0, 10))
      const msgs: any[] = Array.isArray(s.messages) ? s.messages : []
      msgs.filter((m: any) => m.role === 'user').forEach((m: any) => {
        totalWords += wordCount(m.content)
        totalMessages++
      })
    })

    return {
      reactionDays,
      activeDays: activeDates.size,
      avgWordsPerAnswer: totalMessages > 0 ? Math.round(totalWords / totalMessages) : null,
      totalMessages,
      daysSinceInvite,
    }
  }

  const participants: ParticipantProgress[] = (caseUsers ?? []).map((u: any) => {
    const cells: Record<string, ParticipantModuleCell> = {}
    moduleOrder.forEach(({ code }: { code: string }) => {
      const total = u.job_position_id ? (totalByPositionModule[u.job_position_id]?.[code] ?? 0) : 0
      const sess = u.user_id ? sessionMap[u.user_id]?.[code] : undefined
      cells[code] = {
        moduleCode: code,
        totalQuestions: total,
        answeredQuestions: sess?.answered ?? 0,
        completed: sess?.completed ?? false,
        lastActivity: sess?.lastActivity ?? null,
      }
    })
    return {
      caseUserId: u.id,
      userId: u.user_id,
      fullName: u.full_name,
      jobTitle: u.job_title,
      jobPositionId: u.job_position_id,
      jobPositionName: u.job_position_id ? positionNameById[u.job_position_id] ?? null : null,
      role: u.role,
      invited: !!u.user_id,
      isTestAccount: !!u.is_test_account,
      onboardingResistanceLevel: u.onboarding_resistance_level ?? null,
      onboardingResistanceNote: u.onboarding_resistance_note ?? null,
      engagement: computeEngagement(u),
      cells,
    }
  })

  return { moduleOrder, participants, positionsCount: (positions ?? []).length, mappedQuestionsCount: mappedQuestionIds.size }
}
