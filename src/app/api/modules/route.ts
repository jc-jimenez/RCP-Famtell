import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { deductCredits } from '@/lib/credits'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import type { ModuleCode } from '@/types'

export const runtime = 'nodejs'

// Catálogo de módulos activos del caso, en orden — fuente de verdad en
// module_templates (sort_order, credit_cost), no un array hardcoded.
// Ver docs/PRD_RCPFAMTELL3PL.md sección 9.2.
async function getActiveModuleTemplates(db: any): Promise<{ code: ModuleCode; credit_cost: number }[]> {
  const { data } = await db
    .from('module_templates')
    .select('code, credit_cost')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
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

// GET /api/modules?caseId=xxx — listar módulos del caso con estado
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any

  const { data: modules, error } = await db
    .from('modules')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si no hay módulos creados para el caso, inicializarlos
  if (!modules || modules.length === 0) {
    const templates = await getActiveModuleTemplates(db)
    const toInsert = templates.map((t, i) => ({
      case_id: caseId,
      module_code: t.code,
      status: i === 0 ? 'active' : 'locked',
    }))

    const { data: created, error: insertError } = await db
      .from('modules')
      .insert(toInsert)
      .select()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ modules: created })
  }

  return NextResponse.json({ modules })
}

// POST /api/modules/complete — marcar módulo como completado y desbloquear el siguiente
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, moduleCode, sessionId } = await request.json() as {
    caseId: string
    moduleCode: ModuleCode
    sessionId: string
  }

  // Las escrituras tocan el account del CONSULTOR y tablas del caso por cuenta
  // de directivos/colaboradores, que por RLS no pueden modificarlas. Se usa el
  // admin client (service role) tras validar que el usuario tiene acceso al caso.
  const admin = getSupabaseAdmin()
  const db = (admin ?? supabase) as any

  // Datos del caso + validación de acceso
  const { data: caseData } = await db
    .from('cases')
    .select('account_id, credits_used')
    .eq('id', caseId)
    .single()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  // El usuario debe ser miembro del caso (case_users) o el consultor dueño
  const { data: membership } = await db
    .from('case_users')
    .select('id')
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  let hasAccess = !!membership
  if (!hasAccess && caseData.account_id) {
    const { data: ownerAccount } = await db
      .from('accounts')
      .select('email')
      .eq('id', caseData.account_id)
      .single()
    hasAccess = ownerAccount?.email === session.user.email
  }

  if (!hasAccess) return NextResponse.json({ error: 'Acceso denegado al caso' }, { status: 403 })

  // Marcar sesión como completada
  await db.from('sessions').update({ completed: true }).eq('id', sessionId)

  // Orden y costo vienen del catálogo (module_templates), no de un array fijo
  const templates = await getActiveModuleTemplates(db)
  const currentIndex = templates.findIndex(t => t.code === moduleCode)
  const creditsUsed = templates[currentIndex]?.credit_cost ?? 10

  // Marcar módulo como completado
  await db.from('modules')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      session_id: sessionId,
      credits_used: creditsUsed,
    })
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)

  // Desbloquear el siguiente módulo
  if (currentIndex >= 0 && currentIndex < templates.length - 1) {
    const nextModule = templates[currentIndex + 1].code
    await db.from('modules')
      .update({ status: 'active', unlocked_at: new Date().toISOString() })
      .eq('case_id', caseId)
      .eq('module_code', nextModule)
  }

  // Descontar créditos del account del consultor (función atómica con check de saldo)
  if (caseData.account_id) {
    const credit = await deductCredits(db, caseData.account_id, creditsUsed)
    if (!credit.success) {
      console.error('[modules/complete] No se pudieron descontar créditos:', credit.error)
    }

    // Actualizar credits_used acumulado del caso
    await db.from('cases')
      .update({ credits_used: (caseData.credits_used ?? 0) + creditsUsed })
      .eq('id', caseId)
  }

  // M3: extraer contactos de la transcripción y poblar el CRM
  if (moduleCode === 'M3' && sessionId) {
    extractAndSaveContacts(db, caseId, sessionId).catch(() => {})
  }

  return NextResponse.json({ ok: true, unlockedNext: currentIndex < templates.length - 1 })
}
