'use client'

import { useState } from 'react'
import { AREA_OPTIONS } from '@/lib/climateQuestions'
import type { ClimateQuestion } from '@/lib/climateQuestions'

interface Props {
  token: string
  title: string
  companyName: string
  questions: ClimateQuestion[]
  status: 'draft' | 'open' | 'closed'
}

export default function ClimaFormClient({ token, title, companyName, questions, status }: Props) {
  const [area, setArea] = useState('')
  const [tieneGenteACargo, setTieneGenteACargo] = useState('')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setAnswer(key: string, value: any) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/clima/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area, tieneGenteACargo, answers }),
    })
    const data = await res.json()
    if (data.ok) {
      setSubmitted(true)
    } else {
      setError(data.error ?? 'No se pudo enviar. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  if (status !== 'open') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold text-[#1e293b]">
            {status === 'draft' ? 'Esta encuesta aún no está abierta.' : 'Esta encuesta ya cerró. Gracias por tu interés.'}
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-2xl">✓</p>
          <p className="text-lg font-semibold text-[#1e293b]">Gracias por tu respuesta</p>
          <p className="text-sm text-[#64748b]">Tu respuesta es 100% anónima y ya fue registrada.</p>
        </div>
      </div>
    )
  }

  const canSubmit = area && tieneGenteACargo

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-[#e2e8f0] px-6 py-4">
        <span className="text-lg font-bold text-[#1e293b]">RCP<span className="text-[#4f46e5]">.ai</span></span>
        <span className="text-xs text-[#94a3b8] ml-2">Encuesta anónima</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">{title}</h1>
          <p className="text-sm text-[#64748b] mt-1">{companyName}</p>
          <p className="text-xs text-[#94a3b8] mt-2">
            Esta encuesta es 100% anónima: no se guarda tu nombre, tu correo, ni tu dirección IP. Solo se registran las dos clasificaciones de abajo y tus respuestas.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-[#1e293b] mb-2">¿En qué área trabajas?</p>
            <div className="flex flex-wrap gap-2">
              {AREA_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => setArea(opt)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${area === opt ? 'bg-[#4f46e5] text-white border-[#4f46e5]' : 'border-[#e2e8f0] text-[#64748b]'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1e293b] mb-2">¿Tienes personal a tu cargo?</p>
            <div className="flex gap-2">
              {['Sí', 'No'].map(opt => (
                <button key={opt} type="button" onClick={() => setTieneGenteACargo(opt)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${tieneGenteACargo === opt ? 'bg-[#4f46e5] text-white border-[#4f46e5]' : 'border-[#e2e8f0] text-[#64748b]'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.key} className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
              <p className="text-sm font-medium text-[#1e293b] mb-3">{i + 1}. {q.label}</p>

              {q.type === 'open' && (
                <textarea
                  value={answers[q.key] ?? ''}
                  onChange={e => setAnswer(q.key, e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-[#e2e8f0] rounded-xl px-3 py-2 resize-none"
                  placeholder="Tu respuesta…"
                />
              )}

              {q.type === 'number' && (
                <input
                  type="number"
                  value={answers[q.key] ?? ''}
                  onChange={e => setAnswer(q.key, e.target.value)}
                  className="w-full text-sm border border-[#e2e8f0] rounded-xl px-3 py-2"
                />
              )}

              {q.type === 'scale_1_5' && (
                <div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setAnswer(q.key, n)}
                        className={`w-10 h-10 rounded-full border text-sm font-semibold transition-colors ${answers[q.key] === n ? 'bg-[#4f46e5] text-white border-[#4f46e5]' : 'border-[#e2e8f0] text-[#64748b]'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-[#94a3b8] mt-1.5">
                    <span>{q.minLabel}</span>
                    <span>{q.maxLabel}</span>
                  </div>
                </div>
              )}

              {(q.type === 'choice' || q.type === 'choice_text') && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(q.options ?? []).map(opt => (
                      <button key={opt} type="button" onClick={() => setAnswer(q.key, opt)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${answers[q.key] === opt ? 'bg-[#4f46e5] text-white border-[#4f46e5]' : 'border-[#e2e8f0] text-[#64748b]'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {q.type === 'choice_text' && (
                    <input
                      type="text"
                      value={answers[`${q.key}_detalle`] ?? ''}
                      onChange={e => setAnswer(`${q.key}_detalle`, e.target.value)}
                      placeholder="¿Cuál? (opcional)"
                      className="w-full text-sm border border-[#e2e8f0] rounded-xl px-3 py-2"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full bg-[#4f46e5] text-white text-sm font-medium py-3 rounded-xl disabled:opacity-40"
        >
          {submitting ? 'Enviando…' : 'Enviar respuesta anónima'}
        </button>
      </main>
    </div>
  )
}
