'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/shared/AppShell'
import NovaChat from '@/components/shared/NovaChat'
import type { ChatMessage, ModuleCode } from '@/types'

interface Props {
  caseId: string
  moduleCode: ModuleCode
  label: string
  description: string
  duration: string
  isCompleted: boolean
  existingSessionId: string | null
  existingMessages: ChatMessage[]
  userEmail: string
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
  userEmail,
}: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>(
    isCompleted ? 'completed' : existingSessionId && existingMessages.length > 0 ? 'chat' : 'start'
  )
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId)
  const [starting, setStarting] = useState(false)

  async function handleStart() {
    setStarting(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, moduleCode }),
    })
    const data = await res.json()
    if (data.session?.id) {
      setSessionId(data.session.id)
      setView('chat')
    }
    setStarting(false)
  }

  function handleComplete() {
    setView('completed')
  }

  // ── Vista: completado ──
  if (view === 'completed') {
    return (
      <AppShell role="director" email={userEmail} caseCompanyName="">
        <div className="max-w-lg mx-auto text-center py-16 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-3xl text-emerald-600 mx-auto">
            ✓
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{label} completado</h1>
            <p className="text-muted text-sm mt-2">
              La información fue guardada. Tu consultor ya puede ver los resultados.
            </p>
          </div>
          <button
            onClick={() => router.push(`/caso/${caseId}` as any)}
            className="btn-primary px-6 py-3"
          >
            Volver a mi caso →
          </button>
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
            onClick={() => router.push(`/caso/${caseId}` as any)}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            ← Volver al caso
          </button>
          <span className="text-sm font-semibold text-ink">{label}</span>
          <div className="w-20" />
        </div>

        {/* Ventana de chat acotada y centrada (tipo WhatsApp) */}
        <div className="w-full max-w-2xl flex-1 min-h-0 card overflow-hidden">
          <NovaChat
            sessionId={sessionId}
            moduleCode={moduleCode}
            initialMessages={existingMessages}
            onModuleComplete={handleComplete}
            autoStart={existingMessages.length === 0}
          />
        </div>
      </div>
    )
  }

  // ── Vista: pantalla de inicio del módulo (DI-03) ──
  return (
    <AppShell role="director" email={userEmail} caseCompanyName="">
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

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={starting}
          className="btn-primary w-full px-6 py-4"
        >
          {starting ? 'Iniciando…' : `Comenzar ${label}`}
        </button>
      </div>
    </AppShell>
  )
}
