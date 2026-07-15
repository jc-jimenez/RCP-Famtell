import { getSupabaseAdmin } from './supabaseAdmin'

export type JourneyStageStatus = 'completed' | 'active' | 'pending'

export interface JourneyStage {
  id: string
  label: string
  description: string
  icon: string
  status: JourneyStageStatus
}

export interface JourneyStats {
  overallPercent: number
  daysElapsed: number
  activeModules: number
  totalModules: number
  questionsAnswered: number
  findingsDetected: number
  priorityActions: number
}

export interface CustomerJourney {
  stages: JourneyStage[]
  currentStageIndex: number
  stats: JourneyStats
}

const EMPTY_JOURNEY: CustomerJourney = {
  stages: [],
  currentStageIndex: 0,
  stats: { overallPercent: 0, daysElapsed: 0, activeModules: 0, totalModules: 0, questionsAnswered: 0, findingsDetected: 0, priorityActions: 0 },
}

/**
 * Calcula las 7 etapas del Customer Journey del diagnóstico a partir de datos
 * que YA existen — no hay ningún score inventado ni fecha ficticia:
 *
 * 1. Preparación            → hay puestos + participantes dados de alta
 * 2. Captura de Información → % real de módulos M1-M7 completados
 * 3. Análisis Inteligente   → brief_documents.module_findings ya se generó
 * 4. Diagnóstico Empresarial→ brief_documents.executive_summary ya se generó
 * 5. Prioridades Estratégicas → brief_documents.priorities tiene contenido
 * 6. Plan de Acción Inteligente → brief_documents.plan_90d tiene contenido
 * 7. Implementación y Seguimiento → hay check-ins registrados (o brief publicado) —
 *    esta etapa nunca se marca "completada": es seguimiento continuo, no un
 *    paso que termine.
 *
 * Usa el cliente admin (service role) a propósito: el estado de cada etapa
 * (¿ya se generaron prioridades? ¿ya hay señales?) debe ser el mismo sin
 * importar si lo pide el consultor o el directivo, aunque el DETALLE de
 * agenda_signals siga siendo solo-consultor por RLS en otras pantallas.
 */
export async function computeCustomerJourney(caseId: string): Promise<CustomerJourney> {
  const admin = getSupabaseAdmin()
  if (!admin) return EMPTY_JOURNEY
  const db = admin as any

  const [
    { data: caseRow },
    { data: positions },
    { data: participants },
    { data: modules },
    { data: sessions },
    { data: signals },
    { data: checkins },
    { data: brief },
  ] = await Promise.all([
    db.from('cases').select('created_at').eq('id', caseId).maybeSingle(),
    db.from('case_job_positions').select('id').eq('case_id', caseId),
    db.from('case_users').select('id').eq('case_id', caseId),
    db.from('modules').select('module_code, status').eq('case_id', caseId),
    db.from('sessions').select('answered_questions').eq('case_id', caseId),
    db.from('agenda_signals').select('id').eq('case_id', caseId),
    db.from('check_ins').select('id').eq('case_id', caseId),
    db.from('brief_documents').select('module_findings, executive_summary, ier_snapshot, priorities, plan_90d, status').eq('case_id', caseId).maybeSingle(),
  ])

  const totalModules = (modules ?? []).length
  const completedModules = (modules ?? []).filter((m: any) => m.status === 'completed').length
  const activeModules = (modules ?? []).filter((m: any) => m.status !== 'locked').length
  const questionsAnswered = (sessions ?? []).reduce((sum: number, s: any) => sum + (s.answered_questions ?? 0), 0)
  const findingsDetected = (signals ?? []).length
  const priorityActions = Array.isArray(brief?.priorities) ? brief.priorities.length : 0
  const planActions = Array.isArray(brief?.plan_90d) ? brief.plan_90d.length : 0

  const stage1Done = (positions ?? []).length > 0 && (participants ?? []).length > 0
  const stage2Done = totalModules > 0 && completedModules === totalModules
  const stage2Started = (sessions ?? []).length > 0
  const stage3Done = !!brief?.module_findings && Object.keys(brief.module_findings).length > 0
  const stage3Started = findingsDetected > 0
  const stage4Done = !!brief?.executive_summary?.trim() || (!!brief?.ier_snapshot && Object.keys(brief.ier_snapshot).length > 0)
  const stage5Done = priorityActions > 0
  const stage6Done = planActions > 0
  const stage7Started = (checkins ?? []).length > 0 || brief?.status === 'published'

  function statusFor(done: boolean, unlockedByPrevious: boolean, started = false): JourneyStageStatus {
    if (done) return 'completed'
    if (started || unlockedByPrevious) return 'active'
    return 'pending'
  }

  const rawStages: JourneyStage[] = [
    { id: 'preparacion', label: 'Preparación', description: 'Definimos el alcance del diagnóstico y preparamos la información inicial.', icon: '📋', status: statusFor(stage1Done, true) },
    { id: 'captura', label: 'Captura de Información', description: 'Recopilamos datos clave de todas las áreas de tu empresa.', icon: '📥', status: statusFor(stage2Done, stage1Done, stage2Started) },
    { id: 'analisis', label: 'Análisis Inteligente', description: 'Nuestra IA analiza la información y detecta patrones, riesgos y oportunidades.', icon: '🧠', status: statusFor(stage3Done, stage2Done, stage3Started) },
    { id: 'diagnostico', label: 'Diagnóstico Empresarial', description: 'Generamos un diagnóstico integral con hallazgos prioritarios y nivel de madurez.', icon: '🩺', status: statusFor(stage4Done, stage3Done) },
    { id: 'prioridades', label: 'Prioridades Estratégicas', description: 'Priorizamos oportunidades de mejora según impacto, esfuerzo y urgencia.', icon: '🚩', status: statusFor(stage5Done, stage4Done) },
    { id: 'plan', label: 'Plan de Acción Inteligente', description: 'Diseñamos un plan estratégico con acciones concretas y medibles.', icon: '🗺️', status: statusFor(stage6Done, stage5Done) },
    { id: 'implementacion', label: 'Implementación y Seguimiento', description: 'Acompañamos la ejecución del plan y medimos resultados continuamente.', icon: '🚀', status: statusFor(false, stage6Done, stage7Started) },
  ]

  // Orden lógico forzado: una etapa no puede verse "Completada" si alguna
  // anterior no lo está — puede pasar en la práctica si el consultor edita
  // el Brief fuera de orden (ej. captura prioridades antes de terminar el
  // resumen ejecutivo). Sin este ajuste el journey se ve incoherente
  // ("Prioridades: Completado" con "Diagnóstico: En progreso" arriba).
  let priorStagesComplete = true
  const stages: JourneyStage[] = rawStages.map(stage => {
    if (stage.status === 'completed' && !priorStagesComplete) {
      return { ...stage, status: 'active' as JourneyStageStatus }
    }
    if (stage.status !== 'completed') priorStagesComplete = false
    return stage
  })

  const currentStageIndex = Math.max(0, stages.findIndex(s => s.status !== 'completed'))
  const daysElapsed = caseRow?.created_at ? Math.max(0, Math.floor((Date.now() - new Date(caseRow.created_at).getTime()) / 86400000)) : 0
  const overallPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

  return {
    stages,
    currentStageIndex,
    stats: { overallPercent, daysElapsed, activeModules, totalModules, questionsAnswered, findingsDetected, priorityActions },
  }
}
