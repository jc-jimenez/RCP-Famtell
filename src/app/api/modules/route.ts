import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getActiveModuleTemplates, completeModuleSession } from '@/lib/moduleCompleteAction'
import type { ModuleCode } from '@/types'

export const runtime = 'nodejs'

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
    const templates = await getActiveModuleTemplates(db, caseId)
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

  // Marcar la sesión de ESTE participante como completada y, si con ella el
  // módulo queda en verde (todos los puestos requeridos ya contestaron),
  // marcar el módulo del caso como completado y desbloquear el siguiente.
  // Misma función que usa la confirmación por chat — ver moduleCompleteAction.ts.
  const result = await completeModuleSession(db, admin, { caseId, moduleCode, sessionId })

  return NextResponse.json(result)
}
