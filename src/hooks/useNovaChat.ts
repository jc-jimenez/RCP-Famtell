'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ModuleCode } from '@/types'
import { stripAgendaTags } from '@/lib/anthropic/agenda-detector'
import type { ModuleCompletion } from '@/lib/moduleCompletion'

export interface FileAttachment {
  base64: string
  mimeType: string
  fileName: string
}

export interface ModuleCompletionResult {
  /** Estado del CASO completo (todos los puestos requeridos) — informativo, no bloquea navegación. */
  moduleCompleted: boolean
  completion: ModuleCompletion | null
  /** Siguiente módulo PARA ESTE PARTICIPANTE — el desbloqueo es por participante, no por caso. */
  nextModuleCode: string | null
  nextModuleName: string | null
}

interface UseNovaChatOptions {
  sessionId: string
  moduleCode: ModuleCode
  initialMessages?: ChatMessage[]
  /** Avance real ya guardado en la sesión (conteo de [QUESTION_ADVANCE] en BD), no un conteo de mensajes */
  initialAnsweredQuestions?: number
  onComplete?: () => void
  /** Se dispara cuando el usuario confirma en el chat que no falta nada más
   * (Nova emitió el tag oculto de cierre) y el backend ya marcó el módulo
   * como completado de verdad — mismo resultado que produce el botón manual. */
  onModuleComplete?: (result: ModuleCompletionResult) => void
}

export function useNovaChat({
  sessionId,
  moduleCode,
  initialMessages = [],
  initialAnsweredQuestions = 0,
  onComplete,
  onModuleComplete,
}: UseNovaChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answeredQuestions, setAnsweredQuestions] = useState(initialAnsweredQuestions)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (text: string, attachment?: FileAttachment) => {
    const isStartTrigger = text === '__NOVA_START__'
    if (streaming || (!text.trim() && !isStartTrigger)) return

    setError(null)
    setStreaming(true)

    // Mostrar mensaje del usuario en UI (con nombre de archivo si hay adjunto)
    if (!isStartTrigger) {
      const displayContent = attachment
        ? `${text.trim()}${text.trim() ? '\n' : ''}📎 ${attachment.fileName}`
        : text.trim()
      const userMsg: ChatMessage = {
        role: 'user',
        content: displayContent,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, userMsg])
    }

    // Placeholder respuesta Nova
    const novaPlaceholder: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, novaPlaceholder])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: isStartTrigger ? text : text.trim(),
          moduleCode,
          attachment: attachment ?? null,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error('Error en la respuesta del servidor')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6))

            if (payload.token) {
              setMessages(prev => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: last.content + payload.token }
                }
                return next
              })
            }

            if (payload.done) {
              setMessages(prev => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') {
                  const finalContent = typeof payload.finalText === 'string'
                    ? payload.finalText
                    : stripAgendaTags(last.content)
                  next[next.length - 1] = { ...last, content: finalContent }
                }
                return next
              })
              setStreaming(false)
              if (typeof payload.answeredQuestions === 'number') {
                setAnsweredQuestions(payload.answeredQuestions)
              }
              if (onComplete) onComplete()
              if (payload.moduleCompletion && onModuleComplete) {
                onModuleComplete(payload.moduleCompletion)
              }
            }
          } catch {
            // línea incompleta — ignorar
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Error de conexión. Intenta de nuevo.')
      }
      setMessages(prev => {
        if (prev[prev.length - 1]?.content === '') return prev.slice(0, -1)
        return prev
      })
      setStreaming(false)
    }
  }, [sessionId, moduleCode, streaming, onComplete, onModuleComplete])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  return { messages, streaming, error, answeredQuestions, sendMessage, abort }
}
