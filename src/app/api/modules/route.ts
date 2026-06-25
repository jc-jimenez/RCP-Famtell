import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { MODULE_CREDITS } from '@/lib/credits'
import type { ModuleCode } from '@/types'

const MODULE_ORDER: ModuleCode[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

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
    const toInsert = MODULE_ORDER.map((code, i) => ({
      case_id: caseId,
      module_code: code,
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

  const db = supabase as any

  // Marcar sesión como completada
  await db.from('sessions').update({ completed: true }).eq('id', sessionId)

  // Marcar módulo como completado
  const creditsUsed = MODULE_CREDITS[moduleCode] ?? 10
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
  const currentIndex = MODULE_ORDER.indexOf(moduleCode)
  if (currentIndex >= 0 && currentIndex < MODULE_ORDER.length - 1) {
    const nextModule = MODULE_ORDER[currentIndex + 1]
    await db.from('modules')
      .update({ status: 'active', unlocked_at: new Date().toISOString() })
      .eq('case_id', caseId)
      .eq('module_code', nextModule)
  }

  // Descontar créditos del account
  const { data: caseData } = await db.from('cases').select('account_id').eq('id', caseId).single()
  if (caseData?.account_id) {
    await db.from('accounts')
      .update({ credits_used: db.rpc('increment', { x: creditsUsed }) })
      .eq('id', caseData.account_id)

    // También actualizar credits_used del caso
    await db.from('cases')
      .update({ credits_used: db.rpc('increment', { x: creditsUsed }) })
      .eq('id', caseId)
  }

  return NextResponse.json({ ok: true, unlockedNext: currentIndex < MODULE_ORDER.length - 1 })
}
