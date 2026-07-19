import { anthropic, NOVA_MODEL } from './anthropic/client'
import { computeModuleCompletion, type ModuleCompletion } from './moduleCompletion'
import { generateAndStoreModuleBackup } from './moduleBackup'
import { deductCredits } from './credits'
import { resolveCatalogScope, applyCatalogScope } from './moduleTemplates'
import type { ModuleCode } from '@/types'

// Catálogo de módulos activos del caso, en orden — fuente de verdad en
// module_templates (sort_order, credit_cost), no un array hardcoded.
export async function getActiveModuleTemplates(
  db: any,
  caseId: string,
): Promise<{ code: ModuleCode; name: string; credit_cost: number }[]> {
  const scope = await resolveCatalogScope(db, caseId)
  const query = db.from('module_templates').select('code, name, credit_cost').eq('is_active', true)
  const { data } = await applyCatalogScope(query, scope, caseId).order('sort_order', { ascending: true })
  return data ?? []
}

async function extractAndSaveContacts(db: any, caseId: string, sessionId: string) {
  const { data: sess } = await db.from('sessions').select('messages').eq('id', sessionId).single()
  if (!sess?.messages?.length) return

  const transcript = (sess.messages as any[])
    .map((m: any) => `[${m.role === 'user' ? 'Directivo' : 'Nova'}]: ${m.content}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: NOVA_MODEL,
    max_tokens: 2000,
    system: `Eres un asistente que extrae contactos clave de transcripciones de entrevistas empresariales.

Analiza la transcripción del módulo M3 (Base de Contactos) y extrae hasta 30 contactos mencionados.
Para cada contacto incluye toda la información disponible en la conversación.

Tipos: cliente_actual, cliente_potencial, proveedor, aliado, competidor, referido, otro

Responde ÚNICAMENTE con JSON array:
[{
  "name": "Nombre completo o empresa",
  "email": null,
  "phone": null,
  "company": "Empresa donde trabaja (si es persona)",
  "job_title": "Cargo",
  "contact_type": "cliente_actual",
  "notes": "Contexto mencionado en la entrevista",
  "priority": "alta|media|baja",
  "pipeline_stage": "lead"
}]`,
    messages: [{ role: 'user', content: `Transcripción M3:\n\n${transcript}` }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return

  const contacts = JSON.parse(match[0]) as any[]
  if (!contacts.length) return

  // Evitar duplicados: sólo insertar si no hay contactos ya
  const { count } = await db.from('contacts').select('id', { count: 'exact', head: true }).eq('case_id', caseId)
  if ((count ?? 0) > 0) return

  const TYPE_MAP: Record<string, string> = {
    cliente_actual: 'client', cliente_potencial: 'prospect',
    proveedor: 'supplier', aliado: 'partner',
    competidor: 'other', referido: 'prospect', otro: 'other',
  }
  const PROB_MAP: Record<string, string> = { alta: 'high', media: 'medium', baja: 'low' }

  const toInsert = contacts.map((c: any) => ({
    case_id: caseId,
    name: c.name ?? 'Sin nombre',
    email: c.email ?? null,
    phone: c.phone ?? null,
    company: c.company ?? null,
    role: c.job_title ?? null,
    relationship_type: TYPE_MAP[c.contact_type] ?? 'other',
    notes: c.notes ?? null,
    close_probability: PROB_MAP[c.priority] ?? 'medium',
    pipeline_stage: 'pending',
  }))

  await db.from('contacts').insert(toInsert)
}

export interface ModuleCompleteResult {
  ok: true
  moduleCompleted: boolean
  unlockedNext: boolean
  completion: ModuleCompletion
  nextModuleCode: string | null
  nextModuleName: string | null
}

/**
 * Marca la sesión de este participante como completada y, si con ella el
 * módulo queda en verde (todos los puestos requeridos ya contestaron),
 * marca el módulo del caso como completado y desbloquea el siguiente.
 * Es el único lugar que hace esta escritura — tanto el botón manual
 * ("Marcar módulo como completado") como la confirmación por chat
 * (tag [MODULE_CLOSE_CONFIRM]) llaman a esta misma función, para que el
 * resultado sea siempre real y no algo que la IA describa por su cuenta.
 *
 * Idempotente: si la sesión ya estaba marcada completada, no vuelve a
 * descontar créditos ni a regenerar el PDF de respaldo — solo recalcula y
 * devuelve el estado actual.
 */
export async function completeModuleSession(
  db: any,
  admin: any,
  params: { caseId: string; moduleCode: ModuleCode; sessionId: string },
): Promise<ModuleCompleteResult> {
  const { caseId, moduleCode, sessionId } = params

  const { data: caseData } = await db
    .from('cases')
    .select('account_id, credits_used')
    .eq('id', caseId)
    .single()

  const { data: sessionRow } = await db
    .from('sessions')
    .select('completed')
    .eq('id', sessionId)
    .single()

  const alreadyCompleted = !!sessionRow?.completed

  if (!alreadyCompleted) {
    await db.from('sessions').update({ completed: true }).eq('id', sessionId)
  }

  const templates = await getActiveModuleTemplates(db, caseId)
  const currentIndex = templates.findIndex(t => t.code === moduleCode)
  const creditsUsed = templates[currentIndex]?.credit_cost ?? 10

  const completion = await computeModuleCompletion(db, caseId, moduleCode)
  const moduleCompleted = completion.colorStatus === 'green'
  const nextTemplate = currentIndex >= 0 && currentIndex < templates.length - 1 ? templates[currentIndex + 1] : null

  if (!alreadyCompleted && moduleCompleted) {
    await db.from('modules')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        session_id: sessionId,
        credits_used: creditsUsed,
      })
      .eq('case_id', caseId)
      .eq('module_code', moduleCode)

    // Desbloquear el siguiente módulo — pero solo si no está ya completado
    // por su cuenta. Los módulos no siempre se terminan en orden estricto
    // (distintos puestos avanzan a ritmos distintos: un módulo "de adelante"
    // puede quedar en verde antes que uno "de atrás"). Sin este chequeo, el
    // módulo siguiente que ya estaba completed se regresa silenciosamente a
    // 'active' cuando el módulo actual lo termina de desbloquear tarde — bug
    // real encontrado en el caso Famtell: M4 se completó el 17 de julio, y
    // el 19 de julio, al completarse M3 (más lento por otro puesto), este
    // mismo código pisó el status de M4 de 'completed' de vuelta a 'active'.
    if (nextTemplate) {
      const { data: nextModuleRow } = await db
        .from('modules')
        .select('status')
        .eq('case_id', caseId)
        .eq('module_code', nextTemplate.code)
        .maybeSingle()

      if (nextModuleRow?.status !== 'completed') {
        await db.from('modules')
          .update({ status: 'active', unlocked_at: new Date().toISOString() })
          .eq('case_id', caseId)
          .eq('module_code', nextTemplate.code)
      }
    }

    // Respaldo en PDF de la transcripción del módulo — requiere service role,
    // si no está configurado se omite en vez de tronar la respuesta.
    if (admin) {
      generateAndStoreModuleBackup(admin, caseId, moduleCode).catch(err => {
        console.error('[moduleCompleteAction] Error al generar el PDF de respaldo:', err)
      })
    }
  }

  // Los créditos se descuentan por la conversación de ESTE participante,
  // independientemente de si el módulo ya quedó verde para todo el caso.
  // Solo la primera vez que esta sesión se completa.
  if (!alreadyCompleted && caseData?.account_id) {
    const credit = await deductCredits(db, caseData.account_id, creditsUsed)
    if (!credit.success) {
      console.error('[moduleCompleteAction] No se pudieron descontar créditos:', credit.error)
    }

    await db.from('cases')
      .update({ credits_used: (caseData.credits_used ?? 0) + creditsUsed })
      .eq('id', caseId)
  }

  // M3: extraer contactos de la transcripción y poblar el CRM
  if (!alreadyCompleted && moduleCode === 'M3' && sessionId) {
    extractAndSaveContacts(db, caseId, sessionId).catch(() => {})
  }

  return {
    ok: true,
    // moduleCompleted/unlockedNext son del CASO completo (todos los puestos
    // requeridos ya contestaron) — informativo, ya no bloquean nada.
    moduleCompleted,
    unlockedNext: moduleCompleted && !!nextTemplate,
    completion,
    // nextModuleCode/Name son para ESTE participante: el desbloqueo de
    // navegación es por participante, no depende de que el resto del caso
    // haya terminado — ver [[feedback_module_unlock_per_participant]].
    nextModuleCode: nextTemplate ? nextTemplate.code : null,
    nextModuleName: nextTemplate ? nextTemplate.name : null,
  }
}
