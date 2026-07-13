'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/shared/AppShell'
import NovaChat from '@/components/shared/NovaChat'
import type { ChatMessage, ModuleCode } from '@/types'
import type { ModuleCompletionResult } from '@/hooks/useNovaChat'

interface Props {
  caseId: string
  moduleCode: ModuleCode
  label: string
  description: string
  duration: string
  isCompleted: boolean
  existingSessionId: string | null
  existingMessages: ChatMessage[]
  /** Total de preguntas del guion que le tocan a este puesto en este módulo — para la barra de avance dentro del chat */
  totalQuestions?: number
  userEmail: string
  userRole?: 'director' | 'collaborator'
  collaboratorVoices?: CollaboratorVoice[]
}

interface CollaboratorVoice {
  jobTitle: string
  email: string
  messages: ChatMessage[]
  completedAt: string | null
}

type View = 'start' | 'chat' | 'completed'

export default function ModuleStartClient({
  caseId,
  moduleCode,
  label,
  description,
  duration,
  isCompleted,
  existingSessionId,
  existingMessages,
  totalQuestions = 0,
  userEmail,
  userRole = 'director',
  collaboratorVoices = [],
}: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>(
    isCompleted ? 'completed' : existingSessionId && existingMessages.length > 0 ? 'chat' : 'start'
  )
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId)
  // Mensajes reales a usar en el chat. No basta con existingMessages (prop
  // fijo del render inicial del servidor): si "Comenzar" retoma una sesión
  // con historial que el servidor no conocía todavía, hay que usar los
  // mensajes que devuelve /api/sessions, si no NovaChat monta vacío y
  // dispara el saludo de arranque otra vez, como si nunca hubieras contestado nada.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(existingMessages)
  const [starting, setStarting] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState<number | null>(null)
  const [noCredits, setNoCredits] = useState(false)
  const [requiredCredits, setRequiredCredits] = useState<number | null>(null)
  const [completionResult, setCompletionResult] = useState<ModuleCompletionResult | null>(null)

  const backHref = userRole === 'collaborator' ? '/mis-modulos' : `/caso/${caseId}`
  const nextModuleHref = userRole === 'collaborator'
    ? (completionResult?.nextModuleCode ? `/mis-modulos/${caseId}/${completionResult.nextModuleCode}` : null)
    : (completionResult?.nextModuleCode ? `/caso/${caseId}/modulo/${completionResult.nextModuleCode}` : null)

  async function handleStart() {
    setStarting(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, moduleCode }),
    })
    if (res.status === 402) {
      const errData = await res.json().catch(() => null)
      setRequiredCredits(errData?.cost ?? null)
      setNoCredits(true)
      setStarting(false)
      return
    }
    const data = await res.json()
    if (data.session?.id) {
      setSessionId(data.session.id)
      setChatMessages(data.session.messages ?? [])
      setView('chat')
    }
    setStarting(false)
  }

  function handleComplete(result: ModuleCompletionResult) {
    setCompletionResult(result)
    setView('completed')
  }

  // ── Vista: completado ──
  // El desbloqueo de navegación es POR PARTICIPANTE: en cuanto YO termino mi
  // entrevista, mi siguiente módulo queda disponible para mí, sin esperar a
  // que el resto del caso también termine este — eso solo se muestra como
  // nota informativa aparte, ya no condiciona el éxito ni bloquea el CTA.
  if (view === 'completed') {
    const caseWideComplete = completionResult?.moduleCompleted ?? isCompleted
    const pending = completionResult?.completion?.pending ?? []
    const nextModuleName = completionResult?.nextModuleName ?? null

    return (
      <AppShell role={userRole} email={userEmail} caseCompanyName="">
        <div className="max-w-lg mx-auto text-center py-16 space-y-6">
          <div className="w-16 h-16 rounded-full border flex items-center justify-center text-3xl mx-auto bg-emerald-100 border-emerald-200 text-emerald-600">
            ✓
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{label} completado</h1>
            <p className="text-muted text-sm mt-2">
              {userRole === 'collaborator'
                ? 'Tus respuestas fueron guardadas. El consultor puede ver tu perspectiva.'
                : 'La información fue guardada. Tu consultor ya puede ver los resultados.'}
            </p>
            {!caseWideComplete && pending.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <p className="text-xs font-medium text-amber-800 mb-1.5">Nota: este módulo del caso todavía no está completo para todo el equipo — sigue faltando la entrevista de:</p>
                <ul className="text-xs text-amber-700 space-y-0.5">
                  {pending.map(p => (
                    <li key={p.jobPositionId}>
                      • {p.jobPositionName}{!p.hasOccupant && ' (sin participante invitado a este puesto)'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            {nextModuleHref && nextModuleName ? (
              <button
                onClick={() => router.push(nextModuleHref as any)}
                className="btn-primary px-6 py-3"
              >
                Comenzar {nextModuleName} →
              </button>
            ) : (
              <p className="text-sm font-medium text-emerald-700">¡Completaste todos tus módulos del diagnóstico!</p>
            )}
            <button
              onClick={() => router.push(backHref as any)}
              className="text-xs text-muted hover:text-ink transition-colors"
            >
              {userRole === 'collaborator' ? 'Volver a mis módulos →' : 'Volver a mi caso →'}
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Vista: chat con Nova ──
  if (view === 'chat' && sessionId) {
    return (
      <div className="h-screen bg-canvas flex flex-col items-center px-4 py-4 overflow-hidden">
        {/* Encabezado del módulo */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-3 flex-shrink-0">
          <button
            onClick={() => router.push(backHref as any)}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            ← {userRole === 'collaborator' ? 'Mis módulos' : 'Volver al caso'}
          </button>
          <span className="text-sm font-semibold text-ink">{label}</span>
          <div className="w-20" />
        </div>

        {/* Ventana de chat acotada y centrada (tipo WhatsApp) */}
        <div className="w-full max-w-2xl flex-1 min-h-0 card overflow-hidden">
          <NovaChat
            caseId={caseId}
            sessionId={sessionId}
            moduleCode={moduleCode}
            moduleName={label}
            initialMessages={chatMessages}
            totalQuestions={totalQuestions}
            onModuleComplete={handleComplete}
            autoStart={chatMessages.length === 0}
          />
        </div>
      </div>
    )
  }

  // ── Vista: pantalla de inicio del módulo (DI-03) ──
  return (
    <AppShell role={userRole} email={userEmail} caseCompanyName="">
      <div className="max-w-lg mx-auto py-12 space-y-8">

        {/* Número de módulo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-soft border border-accent/20 flex items-center justify-center text-sm font-bold text-accent">
            {moduleCode}
          </div>
          <div>
            <p className="section-label">Diagnóstico empresarial</p>
            <h1 className="text-xl font-bold text-ink">{label}</h1>
          </div>
        </div>

        {/* Descripción */}
        <div className="card p-6 space-y-4">
          <p className="text-ink text-sm leading-relaxed">{description}</p>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>⏱</span>
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>💬</span>
              <span>Una pregunta a la vez</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>🔒</span>
              <span>Guardado automático</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="panel p-5">
          <p className="section-label mb-3">Antes de empezar</p>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex gap-2"><span className="text-faint">·</span>Responde con la mayor honestidad posible — el diagnóstico es tan bueno como la información que compartes</li>
            <li className="flex gap-2"><span className="text-faint">·</span>Puedes pausar y continuar en cualquier momento, tu progreso se guarda automáticamente</li>
            <li className="flex gap-2"><span className="text-faint">·</span>Nova es confidencial — solo tú y tu consultor ven las respuestas</li>
          </ul>
        </div>

        {/* Sin créditos */}
        {noCredits ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3 text-center">
            <p className="text-2xl">⚠️</p>
            <p className="text-sm font-semibold text-amber-800">Créditos insuficientes</p>
            <p className="text-xs text-amber-700">
              Necesitas al menos {requiredCredits ?? 10} créditos para iniciar este módulo.
            </p>
            <a href="/dashboard/creditos" className="btn-primary inline-block text-sm px-5 py-2.5">
              Ver plan y créditos →
            </a>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting}
            className="btn-primary w-full px-6 py-4"
          >
            {starting ? 'Iniciando…' : `Comenzar ${label}`}
          </button>
        )}

        {/* Voces del equipo — solo visible para director/consultor en M6 */}
        {collaboratorVoices.length > 0 && userRole !== 'collaborator' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="section-label">Voces del equipo</span>
              <span className="badge text-xs">{collaboratorVoices.length}</span>
            </div>
            <p className="text-xs text-muted">Perspectivas de los colaboradores invitados a este módulo.</p>
            <div className="space-y-2">
              {collaboratorVoices.map((v, i) => (
                <div key={i} className="card p-4">
                  <button
                    onClick={() => setVoiceOpen(voiceOpen === i ? null : i)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold">
                        {v.jobTitle?.charAt(0)?.toUpperCase() ?? 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{v.jobTitle || 'Colaborador'}</p>
                        <p className="text-xs text-faint">{v.email} · {v.messages.length} respuestas</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted">{voiceOpen === i ? '▲' : '▼'}</span>
                  </button>
                  {voiceOpen === i && (
                    <div className="mt-3 pt-3 border-t border-subtle space-y-2 max-h-64 overflow-y-auto">
                      {v.messages
                        .filter((m: ChatMessage) => m.role === 'user')
                        .map((m: ChatMessage, j: number) => (
                          <div key={j} className="text-xs text-ink bg-surface-2 rounded-xl px-3 py-2 leading-relaxed">
                            {m.content as string}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
