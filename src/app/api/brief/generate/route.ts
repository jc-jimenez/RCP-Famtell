import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, section, attachmentBase64, attachmentName } = await request.json() as {
    caseId: string
    section: 'market_context' | 'module_findings' | 'plan_90d' | 'plan_6m' | 'plan_1a' | 'plan_3a' | 'executive_summary'
    attachmentBase64?: string
    attachmentName?: string
  }

  const db = supabase as any

  // Verificar que el consultor tiene acceso al caso
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, status')
    .eq('id', caseId)
    .eq('account_id', account?.id)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  // Cargar señales IER
  const { data: signals } = await db
    .from('agenda_signals')
    .select('module_code, signal_type, signal_text')
    .eq('case_id', caseId)

  const counts = { blue: 0, yellow: 0, red: 0 }
  ;(signals ?? []).forEach((s: any) => counts[s.signal_type as keyof typeof counts]++)
  const totalSig = counts.blue + counts.yellow + counts.red
  const ierSummary = totalSig === 0
    ? 'Sin señales detectadas aún.'
    : `🔵 Crecimiento: ${counts.blue} señales · 🟡 Redimensionamiento: ${counts.yellow} · 🔴 Salida: ${counts.red}`

  // Cargar brief existente para contexto
  const { data: brief } = await db
    .from('brief_documents')
    .select('module_findings, ier_snapshot, market_context')
    .eq('case_id', caseId)
    .maybeSingle()

  const sector = caseData.industry || '3PL / Logística'

  // Construir prompt según sección
  const sectionPrompts: Record<string, string> = {
    market_context: `Eres un analista estratégico experto en el sector ${sector} en México.

Genera un análisis de contexto de mercado en JSON con esta estructura exacta:
{
  "sector": "${sector}",
  "macro": "Párrafo sobre entorno macroeconómico actual: inflación, tipo de cambio, PIB, confianza empresarial en México",
  "short_term": "Perspectiva 0-12 meses para el sector ${sector}: tendencias, retos, oportunidades inmediatas",
  "mid_term": "Perspectiva 1-3 años: cambios estructurales, nearshoring, e-commerce, regulación",
  "long_term": "Perspectiva 3-5 años: digitalización, automatización, consolidación del mercado",
  "opportunities": ["oportunidad 1", "oportunidad 2", "oportunidad 3", "oportunidad 4"],
  "risks": ["riesgo 1", "riesgo 2", "riesgo 3"],
  "sources": ["fuente o referencia utilizada"]
}

Empresa: ${caseData.company_name}
Sector: ${sector}
${attachmentBase64 ? `Se adjunta un documento de referencia: ${attachmentName}` : ''}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`,

    executive_summary: `Eres un consultor estratégico experto. Redacta un resumen ejecutivo profesional para el Brief de Cierre del diagnóstico de ${caseData.company_name} (sector: ${sector}).

El resumen debe tener 3-4 párrafos que incluyan:
1. Contexto de la empresa y por qué se realizó el diagnóstico
2. Principales hallazgos del diagnóstico (usa los hallazgos por módulo si los tienes)
3. Intención estratégica detectada: ${ierSummary}
4. Dirección del plan de acción

Hallazgos por módulo disponibles: ${JSON.stringify(brief?.module_findings ?? {})}

Escribe en español, tono ejecutivo y directo. Máximo 300 palabras. Responde solo con el texto del resumen, sin títulos ni formato.`,

    module_findings: `Eres un consultor estratégico. Para la empresa ${caseData.company_name} (${sector}), redacta un hallazgo ejecutivo de 2-3 oraciones por cada módulo del diagnóstico RCP.

Responde en JSON con esta estructura exacta:
{
  "M1": "Hallazgo comercial: ingresos, clientes y modelo de ventas...",
  "M2": "Hallazgo operativo: procesos, capacidad instalada...",
  "M3": "Hallazgo de contactos: base de prospectos y clientes clave...",
  "M4": "Hallazgo financiero: rentabilidad, deuda, flujo de caja...",
  "M5": "Hallazgo competitivo: posicionamiento y competidores...",
  "M6": "Hallazgo interno: equipo, cultura y brechas de talento...",
  "M7": "Síntesis: principales áreas de oportunidad y ruta crítica..."
}

Intención estratégica detectada (IER): ${ierSummary}
Responde ÚNICAMENTE con el JSON válido.`,

    plan_90d: `Eres un consultor estratégico para ${caseData.company_name} (${sector}).

Genera un plan de acción a 90 días en JSON. Enfócate en quick wins y estabilización.
Intención estratégica IER: ${ierSummary}
Contexto de mercado: ${JSON.stringify(brief?.market_context ?? {})}

Responde con un array JSON:
[
  { "semana": "1-4", "area": "Comercial", "accion": "acción concreta", "responsable": "Director/Gerente Comercial", "kpi": "métrica medible", "prioridad": "alta" },
  { "semana": "5-8", "area": "Operaciones", "accion": "...", "responsable": "...", "kpi": "...", "prioridad": "media" }
]

Genera entre 8 y 12 acciones concretas. Responde ÚNICAMENTE con el array JSON.`,

    plan_6m: `Plan a 6 meses para ${caseData.company_name} (${sector}). Enfócate en consolidación y primeros crecimientos medibles.
IER: ${ierSummary}

Responde con array JSON:
[{ "trimestre": "Q1", "area": "...", "iniciativa": "...", "resultado_esperado": "...", "inversion_estimada": "Baja/Media/Alta" }]

6-8 iniciativas. Solo JSON.`,

    plan_1a: `Plan a 1 año para ${caseData.company_name} (${sector}). Objetivos medibles y posicionamiento en el mercado.
IER: ${ierSummary}
Perspectiva de mercado: ${brief?.market_context?.mid_term ?? sector}

Responde con array JSON:
[{ "area": "...", "objetivo": "...", "meta_numerica": "...", "hito_clave": "..." }]

5-7 objetivos. Solo JSON.`,

    plan_3a: `Plan estratégico a 3 años para ${caseData.company_name} (${sector}).
MUY IMPORTANTE: personaliza según la intención estratégica IER detectada:
- Si IER es Crecimiento (🔵): enfócate en expansión, nuevos mercados, M&A activo
- Si IER es Redimensionamiento (🟡): enfócate en eficiencia, rentabilidad, modelo sostenible
- Si IER es Salida (🔴): enfócate en preparar la empresa para transición, atracción de inversión, valoración

IER actual: ${ierSummary}
Perspectiva largo plazo del sector: ${brief?.market_context?.long_term ?? sector}

Responde con array JSON:
[{ "año": "Año 1", "vision": "...", "objetivos": ["obj1", "obj2"], "hito_transformador": "..." }]

Un objeto por año (3 años). Solo JSON.`,
  }

  const systemPrompt = sectionPrompts[section]
  if (!systemPrompt) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })

  // Construir mensajes (con adjunto si viene)
  type ContentBlock = { type: string; [key: string]: unknown }
  const contentBlocks: ContentBlock[] = []

  if (attachmentBase64 && section === 'market_context') {
    contentBlocks.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: attachmentBase64 },
      title: attachmentName ?? 'Reporte de mercado',
    } as ContentBlock)
  }

  contentBlocks.push({ type: 'text', text: 'Genera el análisis solicitado.' })

  try {
    const response = await anthropic.messages.create({
      model: NOVA_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks as any }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Para secciones JSON, parsear; para texto libre, devolver crudo
    const jsonSections = ['market_context', 'module_findings', 'plan_90d', 'plan_6m', 'plan_1a', 'plan_3a']
    if (jsonSections.includes(section)) {
      const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)?.[0]
      if (!jsonMatch) return NextResponse.json({ error: 'Nova no devolvió JSON válido', raw: text }, { status: 500 })
      const parsed = JSON.parse(jsonMatch)
      return NextResponse.json({ result: parsed })
    }

    return NextResponse.json({ result: text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
