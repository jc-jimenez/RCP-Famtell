import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { getDominantIntent } from '@/lib/anthropic/agenda-detector'
import { CREDIT_COSTS } from '@/lib/credits'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODULE_LABELS: Record<string, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
  M7: 'Síntesis',
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId } = await request.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any

  // Verificar que el caso pertenece al consultor
  const { data: account } = await db
    .from('accounts')
    .select('id, credits_total, credits_used')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const remaining = account.credits_total - account.credits_used
  if (remaining < CREDIT_COSTS.BRIEF_GENERATION) {
    return NextResponse.json({ error: 'Créditos insuficientes para generar el brief' }, { status: 402 })
  }

  const { data: caseData } = await db
    .from('cases')
    .select('company_name, industry, strategic_notes')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .single()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  // Recopilar todas las sesiones completadas
  const { data: sessions } = await db
    .from('sessions')
    .select('module_code, messages')
    .eq('case_id', caseId)
    .eq('completed', true)

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ error: 'No hay módulos completados para generar el brief' }, { status: 400 })
  }

  // Recopilar señales de agenda oculta
  const { data: signals } = await db
    .from('agenda_signals')
    .select('signal_type, signal_text, module_code')
    .eq('case_id', caseId)

  const dominantIntent = getDominantIntent(signals ?? [])
  const intentMap: Record<string, string> = {
    growth: 'Crecimiento y expansión',
    restructure: 'Redimensionamiento y optimización',
    exit: 'Salida o asociación estratégica',
    mixed: 'Mixta / no determinada',
  }

  // Construir resumen de las sesiones para el prompt
  const sessionSummaries = sessions.map((s: any) => {
    const msgs = (s.messages ?? []) as Array<{ role: string; content: string }>
    const qa = msgs.map(m => `${m.role === 'user' ? 'DIRECTIVO' : 'NOVA'}: ${m.content}`).join('\n')
    return `\n\n=== ${MODULE_LABELS[s.module_code] ?? s.module_code} ===\n${qa}`
  }).join('\n')

  const hypothesisBlock = caseData.strategic_notes?.trim()
    ? `
HIPÓTESIS INICIAL DEL CONSULTOR (a CONTRASTAR con la evidencia, NO asumir como verdad):
"${caseData.strategic_notes.trim()}"

Trata esto como una hipótesis a validar o refutar con base en las transcripciones. Si la evidencia
la confirma, refuérzala con datos; si la contradice o matiza, dilo explícitamente. No dejes que sesgue
los hallazgos: tu análisis debe partir de la evidencia, no de esta hipótesis.`
    : ''

  const briefPrompt = `
Eres un consultor senior de www.bizdoctor.site. Basándote en las siguientes transcripciones de entrevistas
con el directivo de "${caseData.company_name}" (${caseData.industry ?? 'sector no especificado'}),
genera un Brief de Diagnóstico Empresarial profesional y estructurado.

TRANSCRIPCIONES:
${sessionSummaries}

INTENCIÓN ESTRATÉGICA DETECTADA: ${intentMap[dominantIntent]}
${hypothesisBlock}

Genera el brief en formato JSON con la siguiente estructura EXACTA:
{
  "executive_summary": "Párrafo de 3-4 oraciones con el estado actual de la empresa y la situación crítica",
  "modules": {
    "M1": { "title": "Radiografía Comercial", "findings": ["hallazgo 1", "hallazgo 2", "hallazgo 3"], "score": 1-10, "critical": "el punto más urgente" },
    "M2": { "title": "Radiografía Operativa", "findings": [...], "score": 1-10, "critical": "..." },
    "M4": { "title": "Radiografía Financiera", "findings": [...], "score": 1-10, "critical": "..." },
    "M5": { "title": "Radiografía Competitiva", "findings": [...], "score": 1-10, "critical": "..." },
    "M6": { "title": "Radiografía Interna", "findings": [...], "score": 1-10, "critical": "..." }
  },
  "strategic_intent": "${dominantIntent}",
  "strategic_intent_evidence": "Explicación de 2-3 oraciones de por qué se detectó esta intención",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "risks": ["riesgo crítico 1", "riesgo 2", "riesgo 3"],
  "rcp_plan": {
    "weeks_1_4": ["acción 1", "acción 2", "acción 3"],
    "weeks_5_8": ["acción 1", "acción 2", "acción 3"],
    "weeks_9_12": ["acción 1", "acción 2", "acción 3"]
  },
  "kpi_targets": [
    { "metric": "nombre KPI", "baseline": "valor actual", "target_90d": "meta a 90 días" }
  ],
  "consultant_notes": "Observaciones privadas para el consultor sobre dinámicas detectadas"
}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.
`.trim()

  const response = await anthropic.messages.create({
    model: NOVA_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: briefPrompt }],
  })

  const rawContent = response.content[0].type === 'text' ? response.content[0].text : ''

  let briefJson: Record<string, unknown>
  try {
    // Extraer JSON si viene envuelto en ```json
    const match = rawContent.match(/```json\s*([\s\S]*?)```/) ??
                  rawContent.match(/```\s*([\s\S]*?)```/)
    const jsonStr = match ? match[1] : rawContent
    briefJson = JSON.parse(jsonStr.trim())
  } catch {
    return NextResponse.json({ error: 'Error al parsear el brief generado' }, { status: 500 })
  }

  // Guardar brief en DB
  const { data: brief, error: briefError } = await db
    .from('briefs')
    .insert({
      case_id: caseId,
      brief_type: 'diagnostic',
      version: 1,
      content_json: briefJson,
      generated_by: session.user.id,
    })
    .select()
    .single()

  if (briefError) return NextResponse.json({ error: briefError.message }, { status: 500 })

  // Descontar créditos
  await db
    .from('accounts')
    .update({ credits_used: account.credits_used + CREDIT_COSTS.BRIEF_GENERATION })
    .eq('id', account.id)

  return NextResponse.json({ brief })
}
