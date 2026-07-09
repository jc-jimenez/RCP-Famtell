import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) return null
  return session
}

// POST — la IA propone preguntas NUEVAS para el banco de Clima Laboral,
// evitando duplicar temas ya cubiertos. No guarda nada — el super-admin
// revisa y agrega las que le sirvan una por una.
export async function POST(req: NextRequest) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { focus } = await req.json().catch(() => ({ focus: '' }))

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data: existing } = await db
    .from('climate_question_bank')
    .select('label, type')
    .order('sort_order', { ascending: true })

  const existingList = (existing ?? []).map((q: any) => `- (${q.type}) ${q.label}`).join('\n') || '(banco vacío)'

  const systemPrompt = `Eres un consultor de clima laboral y diagnóstico organizacional para PyMEs mexicanas (operadores logísticos 3PL, pero aplica en general).

Preguntas que YA existen en el banco (no las repitas ni las parafrasees):
${existingList}

${focus?.trim() ? `El super-admin pidió enfocarte en: "${focus.trim()}"\n` : ''}
Propón entre 3 y 6 preguntas NUEVAS para una encuesta anónima de clima laboral, cortas y directas, contestables por cualquier colaborador sin importar su puesto. Cada pregunta debe tener un "type" de: "open" (respuesta libre), "number" (numérica), "scale_1_5" (escala 1-5, requiere minLabel/maxLabel), "choice" (opción única, requiere options), "choice_text" (opción única simple tipo Sí/No, requiere options).

Responde ÚNICAMENTE con un JSON array:
[{
  "label": "texto de la pregunta",
  "type": "open",
  "options": null,
  "minLabel": null,
  "maxLabel": null
}]`

  try {
    const response = await anthropic.messages.create({
      model: NOVA_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Propón las preguntas nuevas.' }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)?.[0]
    if (!jsonMatch) return NextResponse.json({ error: 'No se pudo generar la propuesta', raw: text }, { status: 500 })

    const questions = JSON.parse(jsonMatch)
    return NextResponse.json({ questions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error al generar propuesta' }, { status: 500 })
  }
}
