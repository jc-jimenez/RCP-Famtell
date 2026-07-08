import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { CREDIT_COSTS, deductCredits } from '@/lib/credits'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const { data, error } = await db
    .from('check_ins')
    .select('*')
    .eq('case_id', caseId)
    .order('week_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checkins: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { caseId, weekNumber, contactsMade, newClients, newClientsDetail,
          obstacles, warehouseOccupancy, progressScore } = body

  if (!caseId || !weekNumber) {
    return NextResponse.json({ error: 'caseId y weekNumber requeridos' }, { status: 400 })
  }

  const db = supabase as any

  // Los créditos pertenecen al account del CONSULTANT dueño del caso, no al
  // usuario que envía el check-in (normalmente el directivo, que no tiene su
  // propia fila en `accounts`). Se usa el admin client porque por RLS el
  // directivo no puede leer ni actualizar el account del consultor.
  const admin = getSupabaseAdmin()
  const { data: caseData } = await (admin ?? db)
    .from('cases')
    .select('account_id')
    .eq('id', caseId)
    .single()

  if (!caseData?.account_id) {
    return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
  }

  const credit = await deductCredits(admin ?? db, caseData.account_id, CREDIT_COSTS.WEEKLY_CHECKIN)
  if (!credit.success) {
    return NextResponse.json(
      { error: credit.error, upgrade_url: '/dashboard/creditos' },
      { status: 402 },
    )
  }

  // Generar análisis de Nova
  let aiAnalysis: string | null = null
  try {
    const prompt = `
Eres Nova, asistente de seguimiento de RCP.ai. Analiza el check-in semanal de la semana ${weekNumber}:
- Contactos realizados: ${contactsMade}
- Clientes nuevos: ${newClients ? `Sí — ${newClientsDetail}` : 'No'}
- Obstáculos: ${obstacles ?? 'Ninguno reportado'}
- Ocupación de almacén: ${warehouseOccupancy}%
- Progreso autopercibido: ${progressScore}/10

En 2-3 oraciones: reconoce los avances, identifica el patrón más importante y da UNA recomendación concreta y accionable para la próxima semana.
`.trim()

    const response = await anthropic.messages.create({
      model: NOVA_MODEL,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    aiAnalysis = response.content[0].type === 'text' ? response.content[0].text : null
  } catch (e) {
    console.error('Error generando análisis IA:', e)
  }

  const { data, error } = await db
    .from('check_ins')
    .upsert({
      case_id: caseId,
      user_id: session.user.id,
      week_number: weekNumber,
      contacts_made: contactsMade ?? 0,
      new_clients: newClients ?? false,
      new_clients_detail: newClientsDetail ?? null,
      obstacles: obstacles ?? null,
      warehouse_occupancy: warehouseOccupancy ?? 0,
      progress_score: progressScore ?? 5,
      ai_analysis: aiAnalysis,
    }, { onConflict: 'case_id,week_number' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checkin: data })
}
