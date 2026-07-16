import { resolveCatalogScope, applyCatalogScope } from './moduleTemplates'

// Respaldo manual general del caso — snapshot completo en JSON de todo lo
// relacionado al diagnóstico: caso, puestos, participantes, módulos,
// catálogo de preguntas EFECTIVO de este caso (no solo el catálogo global,
// que puede seguir cambiando después) y las entrevistas aplicadas completas
// (mensajes tal cual, no solo metadata) — pedido explícito del consultor
// tras notar que no había ninguna forma de respaldar el trabajo ya hecho
// antes de que un módulo completo llegara a verde.
export async function buildCaseBackup(db: any, caseId: string) {
  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, description, status, strategic_intent, credits_pool, credits_used, created_at, completed_at')
    .eq('id', caseId)
    .maybeSingle()
  if (!caseData) throw new Error('Caso no encontrado')

  const { data: positions } = await db
    .from('case_job_positions')
    .select('id, name, description, job_description, business_role_id, created_at')
    .eq('case_id', caseId)

  // Sin invitation_token — es una credencial de activación, aunque haya
  // expirado no debe salir en un archivo de respaldo descargable.
  const { data: participants } = await db
    .from('case_users')
    .select('id, user_id, role, job_title, job_position_id, business_role_id, full_name, invitation_email, whatsapp_phone, landline_phone, seniority, activated_at, is_test_account, onboarding_resistance_level, onboarding_resistance_note')
    .eq('case_id', caseId)

  const { data: modules } = await db
    .from('modules')
    .select('module_code, status, completed_at, credits_used')
    .eq('case_id', caseId)

  // Catálogo EFECTIVO de este caso: propio (v2 generado por IA) si existe,
  // si no el global M1-M7 — igual criterio que usa toda la app
  // (resolveCatalogScope). Se guarda tal cual como filas, no expandido por
  // puesto — la combinatoria puesto×pregunta ya se puede reconstruir con
  // job_position_ids si algún día hace falta, no vale la pena precalcularla
  // aquí y que el respaldo mienta si el mapeo cambia después.
  const catalogScope = await resolveCatalogScope(db, caseId)
  const templatesQuery = db.from('module_templates').select('id, code, name, description, sort_order, credit_cost').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, caseId).order('sort_order', { ascending: true })
  const templateIds = (templates ?? []).map((t: any) => t.id)

  const { data: sections } = templateIds.length > 0
    ? await db.from('sections').select('id, module_template_id, name, sort_order, questions ( id, text, is_active, sort_order )').in('module_template_id', templateIds)
    : { data: [] }

  const { data: overrides } = await db
    .from('case_question_overrides')
    .select('question_id, is_active, job_position_ids')
    .eq('case_id', caseId)

  const { data: customQuestions } = await db
    .from('case_custom_questions')
    .select('id, section_id, text, is_active, sort_order, job_position_ids')
    .eq('case_id', caseId)

  const userIds: string[] = (participants ?? []).map((p: any) => p.user_id).filter(Boolean)
  const { data: sessions } = userIds.length > 0
    ? await db
        .from('sessions')
        .select('id, user_id, module_code, messages, completed, answered_questions, created_at, last_message_at')
        .eq('case_id', caseId)
        .in('user_id', userIds)
    : { data: [] }

  return {
    generatedAt: new Date().toISOString(),
    catalogScope,
    case: caseData,
    positions: positions ?? [],
    participants: participants ?? [],
    modules: modules ?? [],
    catalog: {
      moduleTemplates: templates ?? [],
      sections: sections ?? [],
      questionOverrides: overrides ?? [],
      customQuestions: customQuestions ?? [],
    },
    sessions: sessions ?? [],
  }
}
