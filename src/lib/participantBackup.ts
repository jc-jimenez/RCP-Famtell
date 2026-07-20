import { generateParticipantBackupPdf, type ModuleSection } from './participantBackupPdf'
import { resolveCatalogScope, applyCatalogScope } from './moduleTemplates'
import { countQuestionsForPosition, getQuestionsForPosition } from './moduleQuestions'
import { getCachedAuditModuleCoverage } from './participantBackupAudit'

// Respaldo manual bajo demanda de TODO lo que un participante haya
// contestado hasta el momento — a diferencia del respaldo automático por
// módulo (moduleBackup.ts), no espera a que el módulo llegue a verde ni a
// que la sesión esté completed:true. Se genera y se transmite directo, sin
// persistir en Storage — es un respaldo bajo demanda, no un artefacto
// automático que haya que volver a servir después.
export async function buildParticipantBackupPdf(db: any, caseId: string, caseUserId: string): Promise<Buffer> {
  const { data: caseData } = await db.from('cases').select('company_name').eq('id', caseId).maybeSingle()
  const { data: caseUser } = await db
    .from('case_users')
    .select('user_id, full_name, invitation_email, job_position_id')
    .eq('id', caseUserId)
    .eq('case_id', caseId)
    .maybeSingle()

  if (!caseData || !caseUser) throw new Error('Caso o participante no encontrado')

  const { data: position } = caseUser.job_position_id
    ? await db.from('case_job_positions').select('name').eq('id', caseUser.job_position_id).maybeSingle()
    : { data: null }

  const catalogScope = await resolveCatalogScope(db, caseId)
  const templatesQuery = db.from('module_templates').select('code, name').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, caseId).order('sort_order', { ascending: true })
  const moduleNameByCode: Record<string, string> = {}
  ;(templates ?? []).forEach((t: any) => { moduleNameByCode[t.code] = t.name })

  const { data: sessions } = caseUser.user_id
    ? await db
        .from('sessions')
        .select('id, module_code, messages, completed, answered_questions')
        .eq('case_id', caseId)
        .eq('user_id', caseUser.user_id)
        .order('module_code', { ascending: true })
    : { data: [] }

  const modules: ModuleSection[] = await Promise.all(
    (sessions ?? []).map(async (s: any) => {
      const total = caseUser.job_position_id
        ? await countQuestionsForPosition(db, caseId, s.module_code, caseUser.job_position_id)
        : 0
      const messages = (s.messages ?? []).map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }))

      // Auditoría de cobertura real (pregunta del catálogo → respuesta),
      // no el contador answered_questions — ver participantBackupAudit.ts.
      let qaTable
      if (caseUser.job_position_id) {
        const catalogQuestions = await getQuestionsForPosition(db, caseId, s.module_code, caseUser.job_position_id)
        qaTable = await getCachedAuditModuleCoverage(db, s.id, catalogQuestions, messages)
      }

      return {
        moduleCode: s.module_code,
        moduleName: moduleNameByCode[s.module_code] ?? s.module_code,
        completed: !!s.completed,
        answeredQuestions: s.answered_questions ?? 0,
        totalQuestions: total,
        messages,
        qaTable,
      }
    })
  )

  return generateParticipantBackupPdf({
    companyName: caseData.company_name,
    participantName: caseUser.full_name || caseUser.invitation_email || 'Participante',
    positionName: position?.name ?? 'Sin puesto asignado',
    generatedAt: new Date().toISOString(),
    modules,
  })
}
