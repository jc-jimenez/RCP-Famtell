import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { MODULE_CREDITS, getAccount, checkCredits } from '@/lib/credits'
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

  // Sesión nueva: verificar créditos del consultor dueño del caso
  const { data: caseData } = await db
    .from('cases')
    .select('account_id')
    .eq('id', caseId)
    .single()

  if (caseData?.account_id) {
    const cost = MODULE_CREDITS[moduleCode] ?? 10
    const { ok, remaining } = await checkCredits(supabase, caseData.account_id, cost)
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
