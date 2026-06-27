import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { CREDIT_COSTS, deductCreditsByEmail } from '@/lib/credits'

export const runtime = 'nodejs'

type Section =
  | 'jtbd'
  | 'segments'
  | 'priorities'
  | 'market_context'
  | 'module_findings'
  | 'executive_summary'
  | 'plan_90d'
  | 'plan_6m'
  | 'plan_1a'
  | 'plan_3a'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, section, attachmentBase64, attachmentName } = await request.json() as {
    caseId: string
    section: Section
    attachmentBase64?: string
    attachmentName?: string
  }

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry')
    .eq('id', caseId)
    .eq('account_id', account?.id)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  const db2 = supabase as any

  // Señales IER
  const { data: signals } = await db2
    .from('agenda_signals')
    .select('module_code, signal_type, signal_text')
    .eq('case_id', caseId)

  const ierCounts = { blue: 0, yellow: 0, red: 0 }
  ;(signals ?? []).forEach((s: any) => ierCounts[s.signal_type as keyof typeof ierCounts]++)
  const totalSig = ierCounts.blue + ierCounts.yellow + ierCounts.red
  const ierSummary = totalSig === 0
    ? 'Sin señales detectadas.'
    : `🔵 ${ierCounts.blue} · 🟡 ${ierCounts.yellow} · 🔴 ${ierCounts.red}`

  // Brief existente (para contexto encadenado)
  const { data: brief } = await db2
    .from('brief_documents')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle()

  // Transcripciones de sesiones (para JTBD y segmentos)
  const { data: sessions } = await db2
    .from('sessions')
    .select('module_code, messages')
    .eq('case_id', caseId)

  const transcripts = (sessions ?? []).map((s: any) => {
    const msgs: any[] = s.messages ?? []
    const text = msgs.map(m => `[${m.role === 'user' ? 'Directivo' : 'Nova'}]: ${m.content}`).join('\n')
    return `=== ${s.module_code} ===\n${text}`
  }).join('\n\n')

  const sector = caseData.industry || '3PL / Logística'
  const company = caseData.company_name
  const jtbdAprobados = (brief?.jtbd ?? []).filter((j: any) => j.approved)
  const segmentosAprobados = (brief?.segments ?? []).filter((s: any) => s.approved)
  const findings = brief?.module_findings ?? {}
  const marketCtx = brief?.market_context ?? {}

  // ── Prompts por sección ──────────────────────────────────────────────────

  const prompts: Record<Section, string> = {

    jtbd: `Eres un consultor estratégico experto en metodología Jobs-To-Be-Done (JTBD).

Analiza las transcripciones de las entrevistas de diagnóstico de ${company} (${sector}) y extrae los Jobs-To-Be-Done principales de sus clientes actuales y potenciales.

TRANSCRIPCIONES:
${transcripts || 'No hay transcripciones disponibles aún.'}

IER detectado: ${ierSummary}

Genera entre 3 y 6 JTBD. Para cada uno incluye:
- El "job" redactado en primera persona del cliente (ej. "Cuando tengo exceso de inventario en temporada alta, quiero...")
- Evidencia textual de la entrevista que lo sustenta (cita directa o paráfrasis)
- Nivel de dolor: alto / medio / bajo
- Frecuencia: recurrente / estacional / ocasional
- Tipo: funcional / emocional / social

Responde ÚNICAMENTE con JSON:
[{
  "id": "jtbd_1",
  "statement": "Cuando [situación], quiero [job], para [resultado esperado]",
  "evidence": "El directivo mencionó: '...'",
  "pain_level": "alto",
  "frequency": "recurrente",
  "type": "funcional",
  "approved": false
}]`,

    segments: `Eres un consultor de marketing B2B especialista en segmentación para operadores logísticos 3PL.

Basándote en los JTBD aprobados, propón los segmentos de clientes más relevantes para ${company}.

JTBD APROBADOS:
${JSON.stringify(jtbdAprobados, null, 2)}

CONTEXTO DE MERCADO:
${JSON.stringify(marketCtx, null, 2)}

IER: ${ierSummary}

Para cada segmento define:
- Nombre del segmento
- Descripción (quiénes son, tamaño estimado)
- JTBD que atiende (ids)
- Prioridad de ataque: "90d" (atacar ahora), "1a" (siguiente año), "futuro"
- Canales recomendados: ["linkedin", "instagram", "tiktok", "whatsapp", "email", "google_ads", "referidos", "alianzas"]
- Oferta irresistible: propuesta de valor específica para este segmento
- Copy hook: gancho de 1 línea que resuena con su dolor principal
- Funnel sugerido: cómo se mueve del awareness a cliente (3-4 pasos)
- Métricas clave para validar el segmento en 90 días

Genera 3-5 segmentos. ÚNICAMENTE JSON:
[{
  "id": "seg_1",
  "name": "E-commerce PYME",
  "description": "...",
  "jtbd_ids": ["jtbd_1"],
  "priority": "90d",
  "channels": ["instagram", "whatsapp"],
  "irresistible_offer": "...",
  "copy_hook": "...",
  "funnel": "Awareness → Contenido educativo → Demo gratuita → Propuesta → Cierre",
  "validation_metrics": ["leads por semana", "costo por lead", "tasa de cierre"],
  "approved": false
}]`,

    priorities: `Eres un consultor estratégico. Basándote en los hallazgos del diagnóstico, los JTBD y los segmentos aprobados de ${company} (${sector}), define las líneas de diagnóstico prioritarias.

HALLAZGOS M1-M7:
${JSON.stringify(findings, null, 2)}

JTBD APROBADOS:
${JSON.stringify(jtbdAprobados, null, 2)}

SEGMENTOS APROBADOS:
${JSON.stringify(segmentosAprobados, null, 2)}

IER: ${ierSummary}

Clasifica cada prioridad como:
- urgente: bloquea el crecimiento hoy, hay que resolverlo en las primeras 4 semanas
- importante: necesario para ejecutar los planes, atacar en semanas 5-12
- deseable: mejora el modelo pero no es crítico en 90 días

Genera 5-8 prioridades. ÚNICAMENTE JSON:
[{
  "id": "pri_1",
  "area": "Comercial",
  "statement": "Descripción clara de la línea de diagnóstico y qué hay que hacer",
  "urgency": "urgente",
  "module_origin": "M1",
  "jtbd_ids": ["jtbd_1"],
  "segment_ids": ["seg_1"],
  "impact": "alto",
  "effort": "bajo",
  "approved": false
}]`,

    module_findings: `Eres un consultor estratégico. Para ${company} (${sector}), redacta un hallazgo ejecutivo de 2-3 oraciones por módulo del diagnóstico RCP.

TRANSCRIPCIONES DISPONIBLES:
${transcripts || 'Genera hallazgos hipotéticos basados en el sector.'}

IER: ${ierSummary}

ÚNICAMENTE JSON:
{
  "M1": "Hallazgo comercial...",
  "M2": "Hallazgo operativo...",
  "M3": "Hallazgo de contactos...",
  "M4": "Hallazgo financiero...",
  "M5": "Hallazgo competitivo...",
  "M6": "Hallazgo interno...",
  "M7": "Síntesis..."
}`,

    market_context: `Eres un analista estratégico experto en el sector ${sector} en México.

Genera un análisis de contexto de mercado actualizado para ${company}.
${attachmentBase64 ? `Se adjunta un estudio especializado: ${attachmentName}. Úsalo como fuente principal.` : ''}

ÚNICAMENTE JSON:
{
  "sector": "${sector}",
  "macro": "Entorno macroeconómico actual: inflación, tipo de cambio, PIB, nearshoring...",
  "short_term": "Perspectiva 0-12 meses para ${sector}...",
  "mid_term": "Perspectiva 1-3 años...",
  "long_term": "Perspectiva 3-5 años...",
  "opportunities": ["oportunidad 1", "oportunidad 2", "oportunidad 3", "oportunidad 4"],
  "risks": ["riesgo 1", "riesgo 2", "riesgo 3"],
  "sources": ["fuente utilizada"]
}`,

    executive_summary: `Redacta un resumen ejecutivo profesional para el Brief de Cierre de ${company} (${sector}).

JTBD aprobados: ${JSON.stringify(jtbdAprobados)}
Segmentos prioritarios: ${JSON.stringify(segmentosAprobados.filter((s:any) => s.priority === '90d'))}
IER: ${ierSummary}
Hallazgos: ${JSON.stringify(findings)}

3-4 párrafos, tono ejecutivo, máximo 300 palabras. Solo el texto, sin títulos.`,

    plan_90d: `Eres un consultor estratégico para ${company} (${sector}).

Genera un plan de acción a 90 días anclado en los JTBD, segmentos y prioridades aprobados.

PRIORIDADES APROBADAS:
${JSON.stringify((brief?.priorities ?? []).filter((p:any) => p.approved), null, 2)}

SEGMENTOS 90d:
${JSON.stringify(segmentosAprobados.filter((s:any) => s.priority === '90d'), null, 2)}

IER: ${ierSummary}

Estructura:
- Semanas 1-4: acciones urgentes y quick wins
- Semanas 5-8: consolidación y primeros experimentos de captación
- Semanas 9-12: validación y ajuste del modelo

Para cada acción incluye: semana, área, acción concreta, tipo (urgente/importante/deseable), responsable, kpi, inversión_estimada (Baja/Media/Alta), es_permanente (true si continúa después de los 90d).

ÚNICAMENTE JSON array:
[{
  "semana": "1-4",
  "area": "Comercial",
  "accion": "acción específica",
  "tipo": "urgente",
  "responsable": "Director General",
  "kpi": "métrica medible",
  "inversion_estimada": "Baja",
  "es_permanente": true,
  "jtbd_ids": ["jtbd_1"],
  "prioridad_id": "pri_1"
}]`,

    plan_6m: `Plan 6 meses para ${company} (${sector}). Consolidación del modelo y ataque a segmentos validados.

JTBD: ${JSON.stringify(jtbdAprobados)}
SEGMENTOS: ${JSON.stringify(segmentosAprobados)}
IER: ${ierSummary}
CONTEXTO MERCADO: ${JSON.stringify(marketCtx)}

Acciones que continúan del plan 90d + nuevas iniciativas de mayor alcance.
ÚNICAMENTE JSON:
[{ "trimestre": "Q1", "area": "...", "iniciativa": "...", "resultado_esperado": "...", "inversion_estimada": "Baja/Media/Alta", "jtbd_ids": [...] }]`,

    plan_1a: `Plan estratégico 1 año para ${company} (${sector}). Posicionamiento y crecimiento medible.

SEGMENTOS PRIORITARIOS: ${JSON.stringify(segmentosAprobados)}
IER: ${ierSummary}
MERCADO: ${marketCtx?.mid_term ?? sector}

ÚNICAMENTE JSON:
[{ "area": "...", "objetivo": "...", "meta_numerica": "...", "hito_clave": "...", "segment_ids": [...] }]`,

    plan_3a: `Plan estratégico 3 años para ${company} (${sector}). Visión alineada al IER detectado.

IER: ${ierSummary}
${ierCounts.red >= 4 ? 'FOCO: Preparar la empresa para transición, atracción de inversión y maximización de valor.' :
  ierCounts.blue >= ierCounts.yellow ? 'FOCO: Expansión, nuevos mercados, consolidación de posición 3PL.' :
  'FOCO: Eficiencia operativa, rentabilidad sostenida, modelo escalable.'}

VISIÓN DE MERCADO: ${marketCtx?.long_term ?? sector}
SEGMENTOS OBJETIVO: ${JSON.stringify(segmentosAprobados)}

ÚNICAMENTE JSON:
[{ "año": "Año 1", "vision": "...", "objetivos": ["obj1", "obj2"], "hito_transformador": "...", "ier_alineacion": "cómo este año avanza hacia el IER detectado" }]`,
  }

  const systemPrompt = prompts[section]
  if (!systemPrompt) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })

  // Descontar créditos (2 por sección generada)
  const credit = await deductCreditsByEmail(supabase, session.user.email!, CREDIT_COSTS.BRIEF_SECTION)
  if (!credit.success) {
    return NextResponse.json(
      { error: credit.error, upgrade_url: '/dashboard/creditos' },
      { status: 402 },
    )
  }

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
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks as any }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)?.[0]
    if (!jsonMatch) return NextResponse.json({ error: 'Nova no devolvió JSON válido', raw: text }, { status: 500 })

    const parsed = JSON.parse(jsonMatch)
    return NextResponse.json({ result: parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
