import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { getModulePrompt } from '@/lib/anthropic/prompts'
import { buildModulePromptFromCatalog } from '@/lib/anthropic/prompts/build-from-catalog'
import { extractAgendaSignals, stripAgendaTags } from '@/lib/anthropic/agenda-detector'
import type { ModuleCode, ChatMessage } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { sessionId, message, moduleCode, attachment } = await request.json() as {
    sessionId: string
    message: string
    moduleCode: ModuleCode
    attachment?: { base64: string; mimeType: string; fileName: string } | null
  }

  if (!sessionId || !message || !moduleCode) {
    return NextResponse.json({ error: 'sessionId, message y moduleCode requeridos' }, { status: 400 })
  }

  const db = supabase as any

  // Cargar sesión
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

  // Agregar mensaje del usuario
  const isStartTrigger = message === '__NOVA_START__'
  const userMsg: ChatMessage = {
    role: 'user',
    content: isStartTrigger ? '' : message,
    timestamp: new Date().toISOString(),
  }
  const updatedHistory = isStartTrigger ? history : [...history, userMsg]

  // ── Construir system prompt desde catálogo ──────────────────────────────
  let systemPrompt: string

  try {
    // 1. Obtener rol del usuario en este caso
    const { data: caseUser } = await db
      .from('case_users')
      .select('role, job_title')
      .eq('case_id', sessionData.case_id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    const userRole: string | null = caseUser?.job_title ?? caseUser?.role ?? null

    // 2. Cargar módulo del catálogo
    const { data: moduleTemplate } = await db
      .from('module_templates')
      .select('id, code, name, description')
      .eq('code', moduleCode)
      .eq('is_active', true)
      .maybeSingle()

    if (!moduleTemplate) throw new Error('módulo no en catálogo')

    // 3. Cargar secciones con preguntas
    const { data: sectionsRaw } = await db
      .from('sections')
      .select(`
        id, code, name, description, sort_order, suggested_roles,
        questions (
          id, text, nova_hint, sort_order, suggested_roles, response_type, is_active
        )
      `)
      .eq('module_template_id', moduleTemplate.id)
      .order('sort_order', { ascending: true })

    if (!sectionsRaw || sectionsRaw.length === 0) throw new Error('sin secciones')

    // 4. Cargar overrides del consultor para este caso
    const { data: overridesRaw } = await db
      .from('case_question_overrides')
      .select('question_id, is_active, custom_text')
      .eq('case_id', sessionData.case_id)

    const overridesMap: Record<string, { is_active: boolean; custom_text: string | null }> = {}
    ;(overridesRaw ?? []).forEach((o: any) => {
      overridesMap[o.question_id] = { is_active: o.is_active, custom_text: o.custom_text }
    })

    // Ordenar preguntas y aplicar overrides (texto personalizado + activación)
    const sections = sectionsRaw.map((s: any) => ({
      ...s,
      questions: (s.questions ?? [])
        .filter((q: any) => {
          const ov = overridesMap[q.id]
          return ov !== undefined ? ov.is_active : q.is_active
        })
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((q: any) => {
          const ov = overridesMap[q.id]
          return ov?.custom_text ? { ...q, text: ov.custom_text } : q
        }),
    }))

    systemPrompt = buildModulePromptFromCatalog(moduleTemplate, sections, userRole)

  } catch {
    // Fallback al prompt estático si el catálogo no está disponible aún
    systemPrompt = getModulePrompt(moduleCode as ModuleCode)
  }
  // ────────────────────────────────────────────────────────────────────────

  // Construir mensajes para Claude (con soporte de archivos adjuntos)
  const historyForClaude = updatedHistory.map(({ role, content }) => ({ role, content }))

  type ClaudeMessage = {
    role: 'user' | 'assistant'
    content: string | { type: string; [key: string]: unknown }[]
  }

  let messagesForClaude: ClaudeMessage[]

  if (isStartTrigger) {
    messagesForClaude = [{ role: 'user', content: 'Inicia la sesión presentándote y comenzando con la primera pregunta del guion.' }]
  } else if (attachment) {
    // El último mensaje del usuario se reemplaza con un mensaje multimodal
    const prevMessages = historyForClaude.slice(0, -1)
    const userText = message.trim()

    const contentBlocks: { type: string; [key: string]: unknown }[] = []

    // Bloque de documento/imagen
    if (attachment.mimeType === 'application/pdf') {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: attachment.base64,
        },
        title: attachment.fileName,
        context: 'Documento adjuntado por el usuario en el contexto del diagnóstico empresarial.',
      })
    } else if (attachment.mimeType.startsWith('image/')) {
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.mimeType,
          data: attachment.base64,
        },
      })
    } else {
      // Texto plano, CSV, etc. — incluir como texto
      const textContent = Buffer.from(attachment.base64, 'base64').toString('utf-8')
      contentBlocks.push({
        type: 'text',
        text: `Archivo adjunto: ${attachment.fileName}\n\n${textContent}`,
      })
    }

    if (userText) {
      contentBlocks.push({ type: 'text', text: userText })
    }

    messagesForClaude = [
      ...prevMessages,
      { role: 'user', content: contentBlocks },
    ]
  } else {
    messagesForClaude = historyForClaude
  }

  const stream = anthropic.messages.stream({
    model: NOVA_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messagesForClaude,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = ''

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const token = chunk.delta.text
          fullText += token
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
        }
      }

      const cleanText = stripAgendaTags(fullText)
      const signals = extractAgendaSignals(fullText)

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

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: cleanText,
        timestamp: new Date().toISOString(),
      }

      // Historial final: si fue inicio automático, solo guardamos la respuesta de Nova
      const finalHistory = isStartTrigger
        ? [...history, assistantMsg]
        : [...updatedHistory, assistantMsg]

      await db.from('sessions').update({
        messages: finalHistory,
        last_message_at: new Date().toISOString(),
      }).eq('id', sessionId)

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
