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
          <div className="w-16 h-16 rounded-full bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{label} completado</h1>
            <p className="text-slate-400 text-sm mt-2">
              La información fue guardada. Tu consultor ya puede ver los resultados.
            </p>
          </div>
          <button
            onClick={() => router.push(`/caso/${caseId}` as any)}
            className="rounded-xl bg-role-directivo hover:opacity-90 transition-opacity px-6 py-3 text-sm font-semibold text-white"
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
      <div className="flex flex-col min-h-screen bg-slate-950">
        {/* Topbar minimal durante el chat */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
          <button
            onClick={() => router.push(`/caso/${caseId}` as any)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Volver
          </button>
          <span className="text-sm font-medium text-slate-400">{label}</span>
          <div className="w-16" />
        </header>

        <div className="flex-1 min-h-0">
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
          <div className="w-10 h-10 rounded-full bg-role-directivo/20 border border-role-directivo/40 flex items-center justify-center text-sm font-bold text-role-directivo">
            {moduleCode}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Diagnóstico empresarial</p>
            <h1 className="text-xl font-bold text-white">{label}</h1>
          </div>
        </div>

        {/* Descripción */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">{description}</p>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>⏱</span>
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>💬</span>
              <span>Una pregunta a la vez</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>🔒</span>
              <span>Guardado automático</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl border border-slate-800/50 bg-slate-900/30 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Antes de empezar</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2"><span className="text-slate-600">·</span>Responde con la mayor honestidad posible — el diagnóstico es tan bueno como la información que compartes</li>
            <li className="flex gap-2"><span className="text-slate-600">·</span>Puedes pausar y continuar en cualquier momento, tu progreso se guarda automáticamente</li>
            <li className="flex gap-2"><span className="text-slate-600">·</span>Nova es confidencial — solo tú y tu consultor ven las respuestas</li>
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full rounded-xl bg-role-directivo hover:opacity-90 disabled:opacity-50 transition-opacity px-6 py-4 text-sm font-semibold text-white"
        >
          {starting ? 'Iniciando…' : `Comenzar ${label}`}
        </button>
      </div>
    </AppShell>
  )
}
