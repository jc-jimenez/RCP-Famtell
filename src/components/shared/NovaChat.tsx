'use client'

import { useEffect, useRef, useState } from 'react'
import readExcelFile from 'read-excel-file/universal'
import { useNovaChat, type FileAttachment, type ModuleCompletionResult } from '@/hooks/useNovaChat'
import type { ChatMessage, ModuleCode } from '@/types'
import ProgressBar from './ProgressBar'

const MODULE_LABELS: Record<ModuleCode, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
  M7: 'Síntesis y Plan RCP',
}

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.csv,.txt,.xlsx'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_EXCEL_TEXT_CHARS = 50000

interface NovaChatProps {
  caseId: string
  sessionId: string
  moduleCode: ModuleCode
  moduleName?: string
  initialMessages?: ChatMessage[]
  /** Total de preguntas del guion que le tocan a este puesto en este módulo — 0/undefined oculta la barra de avance */
  totalQuestions?: number
  /** Avance real ya guardado en la sesión (conteo de [QUESTION_ADVANCE] en BD) al recargar la página */
  initialAnsweredQuestions?: number
  onModuleComplete?: (result: ModuleCompletionResult) => void
  autoStart?: boolean
}

export default function NovaChat({
  caseId,
  sessionId,
  moduleCode,
  moduleName,
  initialMessages = [],
  totalQuestions = 0,
  initialAnsweredQuestions = 0,
  onModuleComplete,
  autoStart = true,
}: NovaChatProps) {
  const [input, setInput] = useState('')
  const [completing, setCompleting] = useState(false)
  const [attachment, setAttachment] = useState<FileAttachment | null>(null)
  const [attachLoading, setAttachLoading] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const didAutoStart = useRef(false)

  const { messages, streaming, error, answeredQuestions, sendMessage } = useNovaChat({
    sessionId,
    moduleCode,
    initialMessages,
    initialAnsweredQuestions,
    onModuleComplete,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (autoStart && messages.length === 0 && !didAutoStart.current) {
      didAutoStart.current = true
      sendMessage('__NOVA_START__')
    }
  }, [autoStart, messages.length, sendMessage])

  function bytesToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  function cellToText(cell: unknown): string {
    if (cell === null || cell === undefined) return ''
    if (cell instanceof Date) return cell.toISOString().slice(0, 10)
    return String(cell)
  }

  async function parseExcelToText(file: File): Promise<string> {
    const sheets = (await readExcelFile(file)) as { sheet: string; data: unknown[][] }[]
    const text = sheets
      .map(({ sheet, data }) => {
        const rows = data.map(row => row.map(cellToText).join(', ')).join('\n')
        return `## Hoja: ${sheet}\n${rows}`
      })
      .join('\n\n')
    return text.length > MAX_EXCEL_TEXT_CHARS
      ? `${text.slice(0, MAX_EXCEL_TEXT_CHARS)}\n\n[…contenido truncado, el archivo tiene más datos de los que se pueden analizar completos]`
      : text
  }

  async function processFile(file: File) {
    setAttachError(null)

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAttachError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB, el máximo permitido es 10 MB.`)
      return
    }

    setAttachLoading(true)

    try {
      const lowerName = file.name.toLowerCase()

      if (lowerName.endsWith('.xls')) {
        throw new Error('Los archivos .xls antiguos no son compatibles. Guarda el archivo como .xlsx o .csv e inténtalo de nuevo.')
      }

      if (lowerName.endsWith('.xlsx')) {
        const text = await parseExcelToText(file)
        if (!text.trim()) throw new Error('El archivo Excel no tiene datos legibles en sus hojas.')
        setAttachment({ base64: bytesToBase64(new TextEncoder().encode(text)), mimeType: 'text/plain', fileName: file.name })
      } else {
        const buffer = await file.arrayBuffer()
        setAttachment({ base64: bytesToBase64(new Uint8Array(buffer)), mimeType: file.type || 'application/octet-stream', fileName: file.name })
      }
    } catch (err) {
      setAttachment(null)
      setAttachError(err instanceof Error ? err.message : 'No se pudo leer el archivo. Intenta con otro archivo o descríbeme los datos directamente en el chat.')
    } finally {
      setAttachLoading(false)
      // reset input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
  }

  function handleDrop(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function handleSend() {
    const text = input.trim()
    if ((!text && !attachment) || streaming) return
    setInput('')
    const att = attachment
    setAttachment(null)
    await sendMessage(text || ' ', att ?? undefined)
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
    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, moduleCode, sessionId }),
      })
      if (!res.ok) {
        setCompleting(false)
        return
      }
      const data = await res.json()
      onModuleComplete?.({
        moduleCompleted: !!data.moduleCompleted,
        completion: data.completion ?? null,
        nextModuleCode: data.nextModuleCode ?? null,
        nextModuleName: data.nextModuleName ?? null,
      })
    } catch {
      setCompleting(false)
    }
  }

  const visibleMessages = messages.filter(m => m.content !== '' || m.role === 'assistant')

  // Avance real: cuenta preguntas del guion que Nova confirmó haber cerrado
  // (tag oculto [QUESTION_ADVANCE], persistido en sessions.answered_questions),
  // no mensajes de chat — antes cada pregunta de profundización o archivo
  // adjunto sumaba como si fuera una pregunta nueva del guion.
  const answeredCount = Math.min(answeredQuestions, totalQuestions || answeredQuestions)
  const progressPercent = totalQuestions > 0 ? Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100)) : 0

  return (
    <div
      className="relative flex flex-col h-full min-h-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-accent-soft/90 border-2 border-dashed border-accent rounded-xl pointer-events-none">
          <p className="text-sm font-medium text-accent">Suelta el archivo para adjuntarlo</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-subtle bg-surface flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          N
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Nova</p>
          <p className="text-xs text-muted">{moduleName ?? MODULE_LABELS[moduleCode]}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {streaming && (
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Escribiendo…
            </span>
          )}
        </div>
      </div>

      {/* Avance de la entrevista */}
      {totalQuestions > 0 && (
        <div className="px-5 py-2 border-b border-subtle bg-surface flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">Avance de tu entrevista</span>
            <span className="text-xs font-semibold text-ink">
              {Math.min(answeredCount, totalQuestions)} de {totalQuestions} · {progressPercent}%
            </span>
          </div>
          <ProgressBar percent={progressPercent} heightClassName="h-1" />
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {visibleMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {streaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
              N
            </div>
            <div className="bg-accent-soft rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-2 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Error de adjunto */}
      {attachError && (
        <div className="px-4 pt-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <span className="text-sm">⚠️</span>
            <span className="text-xs text-red-700 flex-1">{attachError}</span>
            <button
              onClick={() => setAttachError(null)}
              className="text-red-400 hover:text-red-700 text-xs leading-none"
              aria-label="Descartar error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Preview adjunto */}
      {attachment && (
        <div className="px-4 pt-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-accent-soft border border-accent/20 rounded-xl px-3 py-2">
            <span className="text-sm">📎</span>
            <span className="text-xs font-medium text-ink flex-1 truncate">{attachment.fileName}</span>
            <button
              onClick={() => setAttachment(null)}
              className="text-faint hover:text-ink text-xs leading-none"
              aria-label="Quitar archivo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Banner de cierre — visible e imposible de ignorar cuando ya se
          contestaron todas las preguntas del guion */}
      {progressPercent >= 100 && totalQuestions > 0 && !streaming && (
        <div className="mx-4 mb-3 flex-shrink-0 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Ya respondiste todas las preguntas de este módulo</p>
            <p className="text-xs text-emerald-700">Confírmalo para desbloquear el siguiente módulo.</p>
          </div>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex-shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            {completing ? 'Completando…' : '✓ Marcar como completado'}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-subtle bg-surface px-4 py-3">
        <div className="flex gap-2 items-end">

          {/* Botón adjuntar */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={streaming || attachLoading}
            className="flex-shrink-0 rounded-xl border border-subtle bg-surface-2 hover:border-accent/40 hover:bg-accent-soft transition-colors px-3 py-3 text-muted hover:text-accent disabled:opacity-40"
            title="Adjuntar archivo (PDF, imagen, CSV)"
          >
            {attachLoading
              ? <span className="w-4 h-4 border-2 border-muted/30 border-t-muted rounded-full animate-spin block" />
              : <PaperclipIcon />
            }
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
            placeholder={attachment ? 'Agrega un comentario o envía el archivo…' : 'Escribe tu respuesta… (Enter para enviar)'}
            className="flex-1 resize-none rounded-xl border border-subtle bg-surface px-4 py-3 text-sm text-ink placeholder-faint outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors disabled:opacity-50 min-h-[44px] max-h-32"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`
            }}
          />

          <button
            onClick={handleSend}
            disabled={streaming || (!input.trim() && !attachment)}
            className="rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-white transition-colors flex-shrink-0"
            aria-label="Enviar"
          >
            <SendIcon />
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-faint">PDF, imagen, CSV · máx. 10 MB</p>

          {messages.filter(m => m.role === 'user').length >= 3 && !streaming && !(progressPercent >= 100 && totalQuestions > 0) && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="text-xs font-medium text-muted hover:text-emerald-700 transition-colors disabled:opacity-50 border border-subtle hover:border-emerald-300 rounded-lg px-3 py-1"
            >
              {completing ? 'Completando…' : '✓ Marcar módulo como completado'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isNova = message.role === 'assistant'
  if (!message.content) return null

  // Detectar línea de archivo adjunto en mensajes del usuario
  const lines = message.content.split('\n')
  const fileLineIdx = lines.findIndex(l => l.startsWith('📎 '))
  const textLines = fileLineIdx >= 0 ? lines.filter((_, i) => i !== fileLineIdx) : lines
  const fileLine = fileLineIdx >= 0 ? lines[fileLineIdx] : null

  return (
    <div className={`flex gap-3 ${isNova ? '' : 'flex-row-reverse'}`}>
      {isNova && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
          N
        </div>
      )}
      <div className={`max-w-[78%] space-y-1.5 ${isNova ? '' : 'items-end flex flex-col'}`}>
        {textLines.join('\n').trim() && (
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isNova
              ? 'bg-accent-soft text-ink rounded-tl-sm'
              : 'bg-brand text-white rounded-tr-sm'
          }`}>
            {textLines.join('\n').trim()}
          </div>
        )}
        {fileLine && (
          <div className="flex items-center gap-1.5 text-xs text-muted bg-surface-2 border border-subtle rounded-xl px-3 py-1.5">
            <span>📎</span>
            <span>{fileLine.replace('📎 ', '')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 7.5l-6 6a4 4 0 01-5.657-5.657l6.364-6.364a2.5 2.5 0 013.535 3.535L5.379 11.38a1 1 0 01-1.414-1.414L10.5 3.5" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 1.5l13 6.5-13 6.5V9l9-1-9-1V1.5z"/>
    </svg>
  )
}
