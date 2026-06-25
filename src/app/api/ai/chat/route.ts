import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { getModulePrompt } from '@/lib/anthropic/prompts'
import { extractAgendaSignals, stripAgendaTags } from '@/lib/anthropic/agenda-detector'
import type { ModuleCode, ChatMessage } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { sessionId, message, moduleCode } = await request.json() as {
    sessionId: string
    message: string
    moduleCode: ModuleCode
  }

  if (!sessionId || !message || !moduleCode) {
    return NextResponse.json({ error: 'sessionId, message y moduleCode requeridos' }, { status: 400 })
  }

  const db = supabase as any

  // Cargar historial de la sesión
  const { data: sessionData, error: sessionError } = await db
    .from('sessions')
    .select('id, case_id, messages, module_code')
    .eq('id', sessionId)
    .eq('user_id', session.user.id)
    .single()

  if (sessionError || !sessionData) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  const history: ChatMessage[] = sessionData.messages ?? []

  // Agregar mensaje del usuario al historial
  const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date().toISOString() }
  const updatedHistory = [...history, userMsg]

  // Llamar a Claude con streaming
  const systemPrompt = getModulePrompt(moduleCode as ModuleCode)

  const stream = anthropic.messages.stream({
    model: NOVA_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: updatedHistory.map(({ role, content }) => ({ role, content })),
  })

  // Leer respuesta completa (para guardar en DB + detectar agenda signals)
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = ''

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const token = chunk.delta.text
          fullText += token
          // Enviar token al cliente (Server-Sent Events format)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
        }
      }

      // Texto limpio (sin tags de agenda)
      const cleanText = stripAgendaTags(fullText)

      // Detectar señales de agenda oculta
      const signals = extractAgendaSignals(fullText)

      // Guardar señales en DB
      if (signals.length > 0) {
        for (const sig of signals) {
          await db.from('agenda_signals').insert({
            case_id: sessionData.case_id,
            module_code: moduleCode,
            signal_type: sig.type,
            signal_text: sig.text,
          })
        }
      }

      // Guardar historial actualizado
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: cleanText,
        timestamp: new Date().toISOString(),
      }
      const finalHistory = [...updatedHistory, assistantMsg]

      await db.from('sessions').update({
        messages: finalHistory,
        last_message_at: new Date().toISOString(),
      }).eq('id', sessionId)

      // Señal de fin de stream
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, agendaSignals: signals.length })}\n\n`))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
