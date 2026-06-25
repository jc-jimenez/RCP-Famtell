'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ModuleCode } from '@/types'

interface UseNovaChatOptions {
  sessionId: string
  moduleCode: ModuleCode
  initialMessages?: ChatMessage[]
  onComplete?: () => void
}

export function useNovaChat({
  sessionId,
  moduleCode,
  initialMessages = [],
  onComplete,
}: UseNovaChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (text: string) => {
    if (streaming || !text.trim()) return

    setError(null)
    setStreaming(true)

    // Agregar mensaje del usuario inmediatamente
    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    // Placeholder de respuesta de Nova (se va llenando con streaming)
    const novaPlaceholder: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, novaPlaceholder])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text.trim(), moduleCode }),
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
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: last.content + payload.token }
                }
                return next
              })
            }

            if (payload.done) {
              setStreaming(false)
              if (onComplete) onComplete()
            }
          } catch {
            // línea incompleta o no JSON — ignorar
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Error de conexión. Intenta de nuevo.')
      }
      // Quitar el placeholder vacío si hubo error
      setMessages((prev) => {
        if (prev[prev.length - 1]?.content === '') return prev.slice(0, -1)
        return prev
      })
      setStreaming(false)
    }
  }, [sessionId, moduleCode, streaming, onComplete])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  return { messages, streaming, error, sendMessage, abort }
}
