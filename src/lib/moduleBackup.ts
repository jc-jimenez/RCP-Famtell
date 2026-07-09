import { generateModuleBackupPdf, type BackupParticipant } from './moduleBackupPdf'
import type { ModuleCode } from '@/types'

// Genera el PDF de respaldo de un módulo recién completado y lo sube al
// bucket privado `module-backups`. Se llama en segundo plano (best-effort,
// no bloquea la respuesta de /api/modules) desde el mismo punto donde el
// módulo pasa a 'completed' — ver sección 16 del PRD, Obs 9.
export async function generateAndStoreModuleBackup(db: any, caseId: string, moduleCode: ModuleCode): Promise<void> {
  const [{ data: caseData }, { data: template }] = await Promise.all([
    db.from('cases').select('company_name').eq('id', caseId).maybeSingle(),
    db.from('module_templates').select('name').eq('code', moduleCode).maybeSingle(),
  ])
  if (!caseData) return

  const { data: sessions } = await db
    .from('sessions')
    .select('user_id, messages, last_message_at')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('completed', true)

  const userIds = [...new Set((sessions ?? []).map((s: any) => s.user_id))]

  const { data: caseUsers } = userIds.length > 0
    ? await db.from('case_users').select('user_id, full_name, invitation_email, job_position_id').eq('case_id', caseId).in('user_id', userIds)
    : { data: [] }

  const positionIds = [...new Set((caseUsers ?? []).map((u: any) => u.job_position_id).filter(Boolean))]
  const { data: positions } = positionIds.length > 0
    ? await db.from('case_job_positions').select('id, name').in('id', positionIds)
    : { data: [] }

  const positionNameById: Record<string, string> = {}
  ;(positions ?? []).forEach((p: any) => { positionNameById[p.id] = p.name })

  const userInfoById: Record<string, { name: string; positionName: string }> = {}
  ;(caseUsers ?? []).forEach((u: any) => {
    userInfoById[u.user_id] = {
      name: u.full_name || u.invitation_email || 'Participante',
      positionName: u.job_position_id ? (positionNameById[u.job_position_id] ?? 'Sin puesto') : 'Sin puesto',
    }
  })

  const participants: BackupParticipant[] = (sessions ?? []).map((s: any) => ({
    name: userInfoById[s.user_id]?.name ?? 'Participante',
    positionName: userInfoById[s.user_id]?.positionName ?? 'Sin puesto',
    messages: (s.messages ?? []).map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })),
  }))

  const pdfBuffer = await generateModuleBackupPdf({
    companyName: caseData.company_name,
    moduleCode,
    moduleName: template?.name ?? moduleCode,
    completedAt: new Date().toISOString(),
    participants,
  })

  const path = `${caseId}/${moduleCode}.pdf`
  const { error: uploadError } = await db.storage
    .from('module-backups')
    .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('[moduleBackup] Error al subir PDF de respaldo:', uploadError.message)
    return
  }

  await db.from('modules').update({ backup_pdf_path: path }).eq('case_id', caseId).eq('module_code', moduleCode)
}
