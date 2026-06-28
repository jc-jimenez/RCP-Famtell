import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Anthropic from '@anthropic-ai/sdk'
import { SCIAN_SECTORS } from '@/lib/radar-profiles'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId } = await request.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any

  // Leer datos del caso
  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, description')
    .eq('id', caseId)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  // Leer brief_documents
  const { data: brief } = await db
    .from('brief_documents')
    .select('content_json')
    .eq('case_id', caseId)
    .maybeSingle()

  // Construir contexto del cliente
  const briefContent = brief?.content_json ?? {}
  const clientContext = [
    `Empresa: ${caseData.company_name}`,
    caseData.industry ? `Industria: ${caseData.industry}` : '',
    caseData.description ? `Descripción: ${caseData.description}` : '',
    briefContent.executive_summary ? `Resumen ejecutivo: ${briefContent.executive_summary}` : '',
    briefContent.market_context ? `Contexto de mercado: ${JSON.stringify(briefContent.market_context)}` : '',
    briefContent.jtbd_comerciales ? `Jobs-to-be-done comerciales: ${JSON.stringify(briefContent.jtbd_comerciales)}` : '',
    briefContent.priorities ? `Prioridades: ${JSON.stringify(briefContent.priorities)}` : '',
    briefContent.segments ? `Segmentos objetivo: ${JSON.stringify(briefContent.segments)}` : '',
    briefContent.diagnostics ? `Diagnósticos clave: ${JSON.stringify(briefContent.diagnostics)}` : '',
  ].filter(Boolean).join('\n')

  // Árbol SCIAN compacto para el prompt
  const scianTree = SCIAN_SECTORS.map(sector =>
    `## ${sector.name} (${sector.code}xx)\n` +
    sector.subsectors.map(s => `  - ${s.code}: ${s.name}`).join('\n')
  ).join('\n\n')

  const prompt = `Eres un experto en prospección comercial B2B en México.

Tu tarea: analizar el perfil de un cliente de consultoría y seleccionar los subsectores SCIAN del directorio DENUE/INEGI donde es más probable encontrar PROSPECTOS (clientes potenciales) que compren los productos o servicios que ofrece ESTE cliente.

Primero infiere a qué se dedica el cliente (su giro y propuesta de valor) a partir de su perfil; luego elige los sectores que serían sus compradores naturales. No asumas un giro específico: adáptate a lo que el cliente realmente ofrece.

## Perfil del cliente
${clientContext}

## Árbol de sectores SCIAN disponibles
${scianTree}

## Instrucciones
1. Selecciona entre 8 y 20 códigos SCIAN de 4 dígitos donde este cliente encontraría prospectos para lo que ofrece
2. Para cada código, da una razón concisa (máx 10 palabras) de por qué ese sector compraría sus productos/servicios
3. Prioriza sectores acordes a la ventaja competitiva o experiencia documentada del cliente
4. Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones extra

## Formato de respuesta
{
  "codes": ["3116", "4311", "4352"],
  "reasoning": [
    { "code": "3116", "reason": "Cadena frío y cumplimiento SENASICA" },
    { "code": "4311", "reason": "Distribución masiva de abarrotes" }
  ],
  "summary": "Una frase explicando la lógica general de la selección"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Limpiar posible markdown
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      codes: parsed.codes ?? [],
      reasoning: parsed.reasoning ?? [],
      summary: parsed.summary ?? '',
    })
  } catch (e: any) {
    console.error('[radar/suggest] error:', e?.message)
    return NextResponse.json({ error: 'Error al generar sugerencias: ' + e?.message }, { status: 500 })
  }
}
