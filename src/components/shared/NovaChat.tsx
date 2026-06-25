'use client'

import { useEffect, useRef, useState } from 'react'
import { useNovaChat } from '@/hooks/useNovaChat'
import type { ChatMessage, ModuleCode } from '@/types'

const MODULE_LABELS: Record<ModuleCode, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
  M7: 'Síntesis y Plan RCP',
}

interface NovaChatProps {
  sessionId: string
  moduleCode: ModuleCode
  initialMessages?: ChatMessage[]
  onModuleComplete?: () => void
  autoStart?: boolean  // si true, Nova saluda automáticamente al abrir
}

export default function NovaChat({
  sessionId,
  moduleCode,
  initialMessages = [],
  onModuleComplete,
  autoStart = true,
}: NovaChatProps) {
  const [input, setInput] = useState('')
  const [completing, setCompleting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const didAutoStart = useRef(false)

  const { messages, streaming, error, sendMessage } = useNovaChat({
    sessionId,
    moduleCode,
    initialMessages,
  })

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Nova saluda automáticamente si no hay historial
  useEffect(() => {
    if (autoStart && messages.length === 0 && !didAutoStart.current) {
      didAutoStart.current = true
      sendMessage('__NOVA_START__')
    }
  }, [autoStart, messages.length, sendMessage])

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    await sendMessage(text)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleComplete() {
    setCompleting(true)
    await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: '', moduleCode, sessionId }),
    })
    onModuleComplete?.()
  }

  const visibleMessages = messages.filter((m) => m.content !== '' || m.role === 'assistant')

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header de Nova */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          N
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Nova</p>
          <p className="text-xs text-slate-500">{MODULE_LABELS[moduleCode]}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {streaming && (
            <span className="flex items-center gap-1.5 text-xs text-sky-400">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              Escribiendo…
            </span>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {visibleMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Indicador de streaming cuando el último es assistant vacío */}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
              N
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-2 bg-red-950/40 border-t border-red-900/30">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
            placeholder="Escribe tu respuesta… (Enter para enviar)"
            className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors disabled:opacity-50 min-h-[44px] max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-slate-950 transition-colors flex-shrink-0"
            aria-label="Enviar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 1.5l13 6.5-13 6.5V9l9-1-9-1V1.5z"/>
            </svg>
          </button>
        </div>

        {/* Botón completar módulo — aparece cuando hay ≥6 mensajes */}
        {messages.filter(m => m.role === 'user').length >= 3 && !streaming && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50 border border-slate-700 hover:border-emerald-700 rounded-lg px-3 py-1.5"
            >
              {completing ? 'Completando…' : '✓ Marcar módulo como completado'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isNova = message.role === 'assistant'

  if (!message.content) return null

  return (
    <div className={`flex gap-3 ${isNova ? '' : 'flex-row-reverse'}`}>
      {isNova && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
          N
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isNova
            ? 'bg-slate-800 text-slate-100 rounded-tl-sm'
            : 'bg-role-directivo text-white rounded-tr-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
