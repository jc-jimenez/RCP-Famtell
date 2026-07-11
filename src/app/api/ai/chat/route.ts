import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { getModulePrompt } from '@/lib/anthropic/prompts'
import { buildModulePromptFromCatalog } from '@/lib/anthropic/prompts/build-from-catalog'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import { extractAgendaSignals, stripAgendaTags } from '@/lib/anthropic/agenda-detector'
import type { ModuleCode, ChatMessage } from '@/types'
import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'

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
    // 1. Obtener el puesto del usuario en este caso (catálogo por caso, no enum fijo)
    const { data: caseUser } = await db
      .from('case_users')
      .select('role, job_position_id')
      .eq('case_id', sessionData.case_id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    const jobPositionId: string | null = caseUser?.job_position_id ?? null

    let jobPositionName: string | null = null
    if (jobPositionId) {
      const { data: position } = await db
        .from('case_job_positions')
        .select('name')
        .eq('id', jobPositionId)
        .maybeSingle()
      jobPositionName = position?.name ?? null
    }

    // 2. Cargar módulo del catálogo (propio del caso si existe, si no el global)
    const scope = await resolveCatalogScope(db, sessionData.case_id)
    const moduleTemplateQuery = db.from('module_templates').select('id, code, name, description').eq('code', moduleCode).eq('is_active', true)
    const { data: moduleTemplate } = await applyCatalogScope(moduleTemplateQuery, scope, sessionData.case_id).maybeSingle()

    if (!moduleTemplate) throw new Error('módulo no en catálogo')

    // 3. Cargar secciones con preguntas del catálogo base
    const { data: sectionsRaw } = await db
      .from('sections')
      .select(`
        id, code, name, description, sort_order,
        questions (
          id, text, nova_hint, sort_order, response_type, is_active
        )
      `)
      .eq('module_template_id', moduleTemplate.id)
      .order('sort_order', { ascending: true })

    if (!sectionsRaw || sectionsRaw.length === 0) throw new Error('sin secciones')

    const sectionIds: string[] = sectionsRaw.map((s: any) => s.id)

    // 4. Cargar overrides del consultor para este caso (activación, texto y mapeo a puesto)
    const { data: overridesRaw } = await db
      .from('case_question_overrides')
      .select('question_id, is_active, custom_text, job_position_ids')
      .eq('case_id', sessionData.case_id)

    const overridesMap: Record<string, { is_active: boolean; custom_text: string | null; job_position_ids: string[] }> = {}
    ;(overridesRaw ?? []).forEach((o: any) => {
      overridesMap[o.question_id] = {
        is_active: o.is_active,
        custom_text: o.custom_text,
        job_position_ids: o.job_position_ids ?? [],
      }
    })

    // 5. Cargar preguntas personalizadas del caso (antes nunca llegaban a Nova)
    const { data: customRaw } = await db
      .from('case_custom_questions')
      .select('id, section_id, text, nova_hint, sort_order, is_active, job_position_ids')
      .eq('case_id', sessionData.case_id)
      .in('section_id', sectionIds)

    const customBySection: Record<string, any[]> = {}
    ;(customRaw ?? []).forEach((q: any) => {
      if (!q.is_active) return
      if (!customBySection[q.section_id]) customBySection[q.section_id] = []
      customBySection[q.section_id].push(q)
    })

    // Aplicar overrides al catálogo base + fusionar preguntas personalizadas.
    // Una pregunta (base o personalizada) sin ningún puesto mapeado en este
    // caso queda oculta — no se le pregunta a nadie (sección 7 del PRD).
    const sections = sectionsRaw.map((s: any) => {
      const baseQuestions = (s.questions ?? [])
        .filter((q: any) => {
          const ov = overridesMap[q.id]
          return ov !== undefined ? ov.is_active : q.is_active
        })
        .map((q: any) => {
          const ov = overridesMap[q.id]
          return {
            text: ov?.custom_text ?? q.text,
            nova_hint: q.nova_hint,
            sort_order: q.sort_order,
            job_position_ids: ov?.job_position_ids ?? [],
          }
        })

      const customQuestions = (customBySection[s.id] ?? []).map((q: any) => ({
        text: q.text,
        nova_hint: q.nova_hint,
        sort_order: q.sort_order,
        job_position_ids: q.job_position_ids ?? [],
      }))

      return { ...s, questions: [...baseQuestions, ...customQuestions] }
    })

    systemPrompt = buildModulePromptFromCatalog(moduleTemplate, sections, jobPositionId, jobPositionName)

  } catch {
    // Fallback al prompt estático si el catálogo no está disponible aún
    systemPrompt = getModulePrompt(moduleCode as ModuleCode)
  }
  // ────────────────────────────────────────────────────────────────────────

  // Construir mensajes para Claude (con soporte de archivos adjuntos)
  const historyForClaude: MessageParam[] = updatedHistory.map(({ role, content }) => ({ role, content }))

  let messagesForClaude: MessageParam[]

  if (isStartTrigger) {
    messagesForClaude = [{ role: 'user', content: 'Inicia la sesión presentándote y comenzando con la primera pregunta del guion.' }]
  } else if (attachment) {
    // El último mensaje del usuario se reemplaza con un mensaje multimodal
    const prevMessages = historyForClaude.slice(0, -1)
    const userText = message.trim()

    const contentBlocks: ContentBlockParam[] = []

    // Bloque de documento/imagen
    if (attachment.mimeType === 'application/pdf') {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: attachment.base64,
        },
      } as ContentBlockParam)
    } else if (attachment.mimeType.startsWith('image/')) {
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
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
