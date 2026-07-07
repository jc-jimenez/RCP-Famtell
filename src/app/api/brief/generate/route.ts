import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { CREDIT_COSTS, deductCreditsByEmail } from '@/lib/credits'

export const runtime = 'nodejs'

type Section =
  | 'jtbd'
  | 'jtbd_comercial'
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

  const { caseId, section, attachmentBase64, attachmentName, marketData, novaHint } = await request.json() as {
    caseId: string
    section: Section
    attachmentBase64?: string
    attachmentName?: string
    marketData?: Record<string, string>
    novaHint?: string
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
  const jtbdComercialAprobados = (brief?.jtbd_comercial ?? []).filter((j: any) => j.approved)
  const segmentosAprobados = (brief?.segments ?? []).filter((s: any) => s.approved)
  const findings = brief?.module_findings ?? {}
  const marketCtx = brief?.market_context ?? {}

  // ── Prompts por sección ──────────────────────────────────────────────────

  const prompts: Record<Section, string> = {

    jtbd: `Eres un consultor empresarial senior especializado en diagnóstico organizacional y rescate de empresas.

Analiza las transcripciones de los módulos de diagnóstico de ${company} (${sector}) e identifica los DIAGNÓSTICOS CLAVE: los problemas críticos internos que la empresa debe resolver para estabilizarse y crecer.

TRANSCRIPCIONES DE LOS MÓDULOS:
${transcripts || 'No hay transcripciones disponibles aún.'}

IER detectado: ${ierSummary}

Estos diagnósticos son problemas INTERNOS de la empresa (no de sus clientes), vistos desde la perspectiva del consultor: cuellos de botella operativos, brechas financieras, debilidades comerciales, riesgos organizacionales, falta de procesos, dependencia de personas clave, etc.

Genera entre 4 y 7 diagnósticos clave. Para cada uno incluye:
- statement: descripción clara del problema en 1-2 líneas, redactada en tercera persona sobre la empresa (ej. "La empresa no tiene visibilidad del costo real por cliente, lo que impide tomar decisiones de pricing rentables")
- evidence: cita o paráfrasis directa de la entrevista que evidencia el problema
- area: una de [Comercial, Operativo, Financiero, Organizacional, Tecnología, Estrategia, Capital Humano]
- pain_level: "alto" (bloquea el crecimiento hoy) / "medio" (importante pero manejable) / "bajo" (mejora deseable)
- urgency: "urgente" (hay que atacarlo en las primeras 4 semanas) / "importante" (semanas 5-12) / "deseable" (horizonte 6+ meses)
- module_origin: código del módulo donde se evidenció (M1..M7)

Responde ÚNICAMENTE con JSON:
[{
  "id": "dk_1",
  "statement": "Descripción clara del problema que enfrenta la empresa",
  "evidence": "El directivo mencionó: '...' / En el módulo M2 se identificó que...",
  "area": "Comercial",
  "pain_level": "alto",
  "urgency": "urgente",
  "module_origin": "M1",
  "approved": false
}]`,

    jtbd_comercial: `Eres un consultor de estrategia comercial especializado en operadores logísticos 3PL.

Analiza las transcripciones de los módulos M1 (comercial) y M3 (contactos y relaciones) de ${company} (${sector}) e identifica los JOBS TO BE DONE COMERCIALES: los trabajos que los clientes actuales y potenciales contratan a ${company} para que los realice.

TRANSCRIPCIONES DE LOS MÓDULOS:
${transcripts || 'No hay transcripciones disponibles aún.'}

Un Job To Be Done comercial es la tarea funcional, emocional o social que un cliente necesita resolver y para la cual contrata (o consideraría contratar) a ${company}. Se expresa desde la perspectiva del cliente, no de la empresa.

Formato de statement: "Cuando [situación del cliente], necesito [job a contratar], para [resultado esperado]"
Ejemplo: "Cuando tengo picos de demanda en temporada alta, necesito un 3PL que absorba volumen sin previo aviso, para no perder ventas por falta de capacidad logística."

Genera entre 4 y 6 JTBD comerciales. Para cada uno incluye:
- statement: frase completa en formato "Cuando... necesito... para..."
- situation: descripción de la situación del cliente que detona el job
- job: qué necesita contratar/hacer el cliente
- outcome: resultado esperado por el cliente al completar el job
- client_type: tipo de cliente (e-commerce, manufactura, retail, exportación, farmacéutico, etc.)
- frequency: "recurrente" (necesidad constante) / "estacional" (picos predecibles) / "ocasional" (evento específico)
- market_size: "grande" (muchos clientes potenciales) / "mediano" / "nicho" (pocos pero valiosos)
- evidence: cita o paráfrasis de la transcripción que evidencia que este job existe
- source_module: "M1" o "M3"

Responde ÚNICAMENTE con JSON:
[{
  "id": "jc_1",
  "statement": "Cuando [situación], necesito [job], para [resultado]",
  "situation": "descripción de la situación",
  "job": "qué necesita contratar el cliente",
  "outcome": "resultado esperado",
  "client_type": "e-commerce",
  "frequency": "estacional",
  "market_size": "grande",
  "evidence": "El directivo mencionó: '...'",
  "source_module": "M1",
  "approved": false
}]`,

    segments: `Eres un consultor de marketing B2B especialista en segmentación para operadores logísticos 3PL.

Basándote en los diagnósticos clave, los JTBD comerciales confirmados y el contexto de mercado, propón los segmentos de clientes más relevantes y rentables para que ${company} enfoque su estrategia comercial.

DIAGNÓSTICOS CLAVE CONFIRMADOS (problemas que la empresa debe resolver):
${JSON.stringify(jtbdAprobados, null, 2)}

JTBD COMERCIALES CONFIRMADOS (trabajos que los clientes contratan a ${company}):
${JSON.stringify(jtbdComercialAprobados, null, 2)}

CONTEXTO DE MERCADO:
${JSON.stringify(marketCtx, null, 2)}

IER: ${ierSummary}

Los segmentos deben estar alineados con los JTBD comerciales detectados (a qué clientes sirve mejor) y con la capacidad actual de la empresa según sus diagnósticos (si tiene brechas operativas, no propongas segmentos que las agraven).

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

    priorities: `Eres un consultor estratégico. Basándote en los hallazgos del diagnóstico, los diagnósticos clave confirmados y los segmentos aprobados de ${company} (${sector}), define las prioridades de intervención.

HALLAZGOS M1-M7:
${JSON.stringify(findings, null, 2)}

DIAGNÓSTICOS CLAVE CONFIRMADOS:
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

    market_context: (() => {
      const hasMktData = marketData && Object.values(marketData).some(v => v?.trim())
      const datosActuales = hasMktData ? `
⚠️ DATOS ACTUALES CONFIRMADOS POR EL CONSULTOR — ÚSALOS COMO FUENTE DE VERDAD, no uses datos de tu entrenamiento para estos valores:
${marketData!.tipo_cambio   ? `• Tipo de cambio: ${marketData!.tipo_cambio}` : ''}
${marketData!.tasa_banxico  ? `• Tasa de interés Banxico: ${marketData!.tasa_banxico}` : ''}
${marketData!.inflacion     ? `• Inflación: ${marketData!.inflacion}` : ''}
${marketData!.pib           ? `• Crecimiento PIB estimado: ${marketData!.pib}` : ''}
${marketData!.tendencia_sector ? `• Tendencia clave del sector: ${marketData!.tendencia_sector}` : ''}
${marketData!.contexto_extra   ? `• Contexto adicional: ${marketData!.contexto_extra}` : ''}
`.trim() : `IMPORTANTE: No tienes datos actuales confirmados por el consultor. Usa tu mejor conocimiento del sector ${sector} en México e INDICA EXPLÍCITAMENTE en el campo "sources" que los datos son estimaciones basadas en tu entrenamiento y deben ser verificados.`

      return `Eres un analista estratégico experto en el sector ${sector} en México.

Genera un análisis de contexto de mercado para ${company} (${sector}).
${attachmentBase64 ? `Se adjunta un estudio especializado: ${attachmentName}. Úsalo como fuente primaria de datos.` : ''}

${datosActuales}

Con base en estos datos, redacta un análisis estructurado que incluya:
- macro: entorno macroeconómico actual (2-3 oraciones con los datos confirmados)
- short_term: perspectiva 0-12 meses para ${sector} en México
- mid_term: perspectiva 1-3 años
- long_term: perspectiva 3-5 años
- opportunities: 3-5 oportunidades concretas para ${company} en este contexto
- risks: 3 riesgos principales a monitorear
- sources: indica si los datos vienen de los datos confirmados por el consultor, del PDF adjunto, o de tu conocimiento de entrenamiento

ÚNICAMENTE JSON:
{
  "sector": "${sector}",
  "macro": "...",
  "short_term": "...",
  "mid_term": "...",
  "long_term": "...",
  "opportunities": ["...", "..."],
  "risks": ["...", "..."],
  "sources": ["Datos actuales confirmados por consultor", "..."]
}`
    })(),

    executive_summary: `Redacta un resumen ejecutivo profesional para el Brief de Cierre de ${company} (${sector}).

Diagnósticos clave confirmados: ${JSON.stringify(jtbdAprobados)}
Segmentos prioritarios (90d): ${JSON.stringify(segmentosAprobados.filter((s:any) => s.priority === '90d'))}
IER: ${ierSummary}
Hallazgos por módulo: ${JSON.stringify(findings)}

3-4 párrafos, tono ejecutivo, máximo 300 palabras. Solo el texto, sin títulos.`,

    plan_90d: `Eres un consultor estratégico para ${company} (${sector}).

Genera un plan de acción a 90 días anclado en los diagnósticos clave confirmados, segmentos y prioridades de intervención aprobadas.

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

DIAGNÓSTICOS CLAVE RESUELTOS/EN PROCESO: ${JSON.stringify(jtbdAprobados)}
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

  const basePrompt = prompts[section]
  if (!basePrompt) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })

  // Descontar créditos (2 por sección generada)
  const credit = await deductCreditsByEmail(supabase, session.user.email!, CREDIT_COSTS.BRIEF_SECTION)
  if (!credit.success) {
    return NextResponse.json(
      { error: credit.error, upgrade_url: '/dashboard/creditos' },
      { status: 402 },
    )
  }

  const systemPrompt = novaHint?.trim()
    ? `${basePrompt}\n\n⚠️ INSTRUCCIÓN ADICIONAL DEL CONSULTOR (prioridad alta):\n${novaHint.trim()}`
    : basePrompt

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
      // 3000 truncaba secciones largas (plan_90d con 12 semanas de acciones detalladas)
      // a media generación, produciendo JSON cortado que fallaba al parsear.
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks as any }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // executive_summary pide prosa plana, no JSON — las demás secciones sí son JSON.
    if (section === 'executive_summary') {
      return NextResponse.json({ result: text.trim() })
    }

    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)?.[0]
    if (!jsonMatch) return NextResponse.json({ error: 'Nova no devolvió JSON válido', raw: text }, { status: 500 })

    try {
      const parsed = JSON.parse(jsonMatch)
      return NextResponse.json({ result: parsed })
    } catch (parseErr: any) {
      return NextResponse.json({ error: parseErr.message, raw: jsonMatch }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
