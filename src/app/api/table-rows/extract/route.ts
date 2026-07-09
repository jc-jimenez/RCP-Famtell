import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'

export const runtime = 'nodejs'

// POST — extraer filas de un documento adjunto usando las columnas del
// instrumento como esquema. No guarda nada — devuelve las filas para que
// el usuario las revise/edite antes de confirmar (ver docs/PRD sección 11).
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { instrumentId, attachment } = await request.json() as {
    instrumentId: string
    attachment: { base64: string; mimeType: string; fileName: string }
  }

  if (!instrumentId || !attachment) {
    return NextResponse.json({ error: 'instrumentId y attachment son requeridos' }, { status: 400 })
  }

  const db = supabase as any
  const { data: instrument } = await db
    .from('case_table_instruments')
    .select('name, columns')
    .eq('id', instrumentId)
    .maybeSingle()

  // RLS ya filtró — si no hay acceso, esto viene null
  if (!instrument) return NextResponse.json({ error: 'No tienes acceso a esta tabla' }, { status: 403 })

  const columns = instrument.columns as { key: string; label: string; type: string }[]
  const columnsDesc = columns.map(c => `- ${c.key} (${c.label}, tipo: ${c.type})`).join('\n')

  const systemPrompt = `Eres un asistente que extrae datos estructurados de documentos para llenar la tabla "${instrument.name}".

Columnas esperadas:
${columnsDesc}

Analiza el documento adjunto y extrae todas las filas de datos que encuentres, mapeando cada una a las columnas de arriba. Si un valor no está disponible para una columna, usa null. Para columnas tipo "number"/"currency"/"percent", devuelve solo el número (sin símbolos de moneda ni %).

Responde ÚNICAMENTE con un JSON array de objetos, uno por fila, usando exactamente los keys de columnas dados:
[{ "${columns[0]?.key ?? 'campo'}": "valor", ... }]

Si el documento no tiene datos tabulares reconocibles, responde con un array vacío [].`

  const contentBlocks: ContentBlockParam[] = []

  if (attachment.mimeType === 'application/pdf') {
    contentBlocks.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: attachment.base64 },
    } as ContentBlockParam)
  } else if (attachment.mimeType.startsWith('image/')) {
    contentBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: attachment.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: attachment.base64 },
    })
  } else {
    const textContent = Buffer.from(attachment.base64, 'base64').toString('utf-8')
    contentBlocks.push({ type: 'text', text: `Archivo: ${attachment.fileName}\n\n${textContent}` })
  }

  contentBlocks.push({ type: 'text', text: 'Extrae las filas de datos de este documento según las columnas indicadas.' })

  try {
    const response = await anthropic.messages.create({
      model: NOVA_MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks as any }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)?.[0]
    if (!jsonMatch) return NextResponse.json({ error: 'No se pudo extraer datos del documento', raw: text }, { status: 500 })

    const rows = JSON.parse(jsonMatch)
    return NextResponse.json({ rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
