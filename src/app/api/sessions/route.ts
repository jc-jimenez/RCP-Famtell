import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { checkCredits } from '@/lib/credits'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import type { ModuleCode } from '@/types'

// POST — crear o recuperar sesión de un módulo
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, moduleCode } = await request.json() as {
    caseId: string
    moduleCode: ModuleCode
  }

  if (!caseId || !moduleCode) {
    return NextResponse.json({ error: 'caseId y moduleCode requeridos' }, { status: 400 })
  }

  const db = supabase as any

  // modules.session_id es un puntero único por caso+módulo (sin user_id) —
  // lo usa la vista del directivo (caso/[id]/modulo/[code]/page.tsx) para
  // saber qué sesión retomar. Los colaboradores tienen su propia vista
  // (mis-modulos/[caseId]/[code]/page.tsx) que busca su sesión directo por
  // user_id y nunca lee este puntero. Si un colaborador lo sobreescribiera,
  // la próxima vez que el directivo entre vería la conversación privada del
  // colaborador en vez de la suya — por eso solo se sincroniza para roles
  // que no sean 'collaborator'.
  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()
  const isCollaborator = caseUser?.role === 'collaborator'

  // Si ya existe sesión en progreso, retomarla (no cobra créditos).
  // No se usa .maybeSingle(): si por alguna razón hay más de una sesión
  // incompleta (datos históricos, doble clic, etc.) esa llamada fallaría en
  // silencio y el código seguiría de largo a "crear sesión nueva",
  // duplicando la sesión en vez de retomarla. Con .limit(1) + orden por
  // actividad más reciente siempre se resuelve a una sola fila sin error.
  const { data: existingRows, error: existingError } = await db
    .from('sessions')
    .select('*')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('user_id', session.user.id)
    .eq('completed', false)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingError) {
    console.error('[api/sessions] Error buscando sesión existente:', existingError.message)
  }

  const existing = existingRows?.[0] ?? null

  if (existing) {
    if (!isCollaborator) await syncModuleSessionId(db, caseId, moduleCode, existing.id)
    return NextResponse.json({ session: existing, resumed: true })
  }

  // Sesión nueva: verificar créditos del consultor dueño del caso.
  // Se usa el admin client (service role) porque el account de los créditos
  // pertenece al CONSULTOR, no al usuario actual (que puede ser colaborador o
  // directivo). Por RLS (accounts_rls_self_read) ellos no pueden leer ese
  // account, pero el sistema sí debe verificar su pool de créditos.
  const admin = getSupabaseAdmin()
  const creditsClient = admin ?? supabase

  const { data: caseData } = await (admin ?? db)
    .from('cases')
    .select('account_id')
    .eq('id', caseId)
    .single()

  if (caseData?.account_id) {
    const scope = await resolveCatalogScope(admin ?? db, caseId)
    const templateQuery = (admin ?? db).from('module_templates').select('credit_cost').eq('code', moduleCode)
    const { data: moduleTemplate } = await applyCatalogScope(templateQuery, scope, caseId).maybeSingle()
    const cost = moduleTemplate?.credit_cost ?? 10
    const { ok, remaining } = await checkCredits(creditsClient, caseData.account_id, cost)
    if (!ok) {
      return NextResponse.json(
        { error: 'Créditos insuficientes', remaining, cost, upgrade_url: '/dashboard/creditos' },
        { status: 402 },
      )
    }
  }

  // Crear nueva sesión
  const { data: newSession, error } = await db
    .from('sessions')
    .insert({
      case_id: caseId,
      module_code: moduleCode,
      user_id: session.user.id,
      messages: [],
    })
    .select()
    .single()

  if (error || !newSession) {
    return NextResponse.json({ error: error?.message ?? 'Error al crear sesión' }, { status: 500 })
  }

  if (!isCollaborator) await syncModuleSessionId(db, caseId, moduleCode, newSession.id)

  return NextResponse.json({ session: newSession, resumed: false })
}

async function syncModuleSessionId(db: any, caseId: string, moduleCode: ModuleCode, sessionId: string) {
  const { error } = await db
    .from('modules')
    .update({ session_id: sessionId })
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)

  if (error) {
    console.error('[api/sessions] Error sincronizando modules.session_id:', error.message)
  }
}
