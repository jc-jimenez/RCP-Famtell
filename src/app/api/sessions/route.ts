import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { MODULE_CREDITS, checkCredits } from '@/lib/credits'
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

  // Si ya existe sesión en progreso, retomarla (no cobra créditos)
  const { data: existing } = await db
    .from('sessions')
    .select('*')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('user_id', session.user.id)
    .eq('completed', false)
    .maybeSingle()

  if (existing) {
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
    const cost = MODULE_CREDITS[moduleCode] ?? 10
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

  return NextResponse.json({ session: newSession, resumed: false })
}
