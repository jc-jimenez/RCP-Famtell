'use client'

import { useState } from 'react'
import AppShell from '@/components/shared/AppShell'
import CasoTabs from '@/components/consultor/CasoTabs'
import type { ClimateQuestion } from '@/lib/climateQuestions'

interface Survey {
  id: string
  token: string
  title: string
  questions: ClimateQuestion[]
  status: 'draft' | 'open' | 'closed'
  created_at: string
  job_position_id: string | null
  job_position_name: string | null
}

interface Position {
  id: string
  name: string
}

interface Response {
  id: string
  area: string | null
  tiene_gente_a_cargo: string | null
  answers: Record<string, any>
  created_at: string
}

interface Props {
  caseId: string
  companyName: string
  email: string
  initialSurveys: Survey[]
  initialPositions: Position[]
}

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', open: 'Abierta', closed: 'Cerrada' }
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-surface-2 text-muted',
  open: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-amber-100 text-amber-700',
}

export default function ClimaClient({ caseId, companyName, email, initialSurveys, initialPositions }: Props) {
  const [surveys, setSurveys] = useState<Survey[]>(initialSurveys)
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [responsesBySurvey, setResponsesBySurvey] = useState<Record<string, Response[]>>({})
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [showNewSurvey, setShowNewSurvey] = useState(false)
  const [newSurveyPositionId, setNewSurveyPositionId] = useState('')

  const hasPositions = initialPositions.length > 0

  function openNewSurvey() {
    if (!hasPositions) { createSurvey(null); return }
    setNewSurveyPositionId('')
    setShowNewSurvey(true)
  }

  async function createSurvey(jobPositionId: string | null) {
    setCreating(true)
    const res = await fetch('/api/consultant/climate-surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, jobPositionId }),
    })
    const data = await res.json()
    if (data.survey) setSurveys(prev => [data.survey, ...prev])
    setCreating(false)
    setShowNewSurvey(false)
  }

  async function setStatus(surveyId: string, status: string) {
    const res = await fetch('/api/consultant/climate-surveys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, surveyId, status }),
    })
    const data = await res.json()
    if (data.survey) setSurveys(prev => prev.map(s => s.id === surveyId ? data.survey : s))
  }

  async function deleteSurvey(surveyId: string) {
    await fetch('/api/consultant/climate-surveys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, surveyId }),
    })
    setSurveys(prev => prev.filter(s => s.id !== surveyId))
  }

  async function toggleResponses(surveyId: string) {
    if (expandedId === surveyId) { setExpandedId(null); return }
    setExpandedId(surveyId)
    if (!responsesBySurvey[surveyId]) {
      setLoadingResponses(true)
      const res = await fetch(`/api/consultant/climate-surveys/responses?surveyId=${surveyId}`)
      const data = await res.json()
      setResponsesBySurvey(prev => ({ ...prev, [surveyId]: data.responses ?? [] }))
      setLoadingResponses(false)
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/clima/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function scaleAverage(survey: Survey, responses: Response[], questionKey: string) {
    const values = responses.map(r => Number(r.answers?.[questionKey])).filter(v => !isNaN(v))
    if (values.length === 0) return null
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
  }

  return (
    <AppShell role="consultant" email={email} caseCompanyName={companyName} tabBar={<CasoTabs caseId={caseId} activeTab="clima" />}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">Encuesta de Clima</h1>
            <p className="text-sm text-muted mt-1">Anónima de verdad: sin nombre, sin IP — solo área y nivel autodeclarados</p>
          </div>
          <button onClick={openNewSurvey} disabled={creating} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
            {creating ? 'Creando…' : '+ Nueva encuesta'}
          </button>
        </div>

        {surveys.length === 0 && (
          <div className="card p-10 text-center text-sm text-muted">
            Sin encuestas todavía. Crea una para empezar (se siembra con las 10 preguntas del Kit)
            {hasPositions ? ' — cada puesto tiene su propio link, así puedes segmentar sin perder el anonimato dentro de cada puesto.' : '.'}
          </div>
        )}

        {showNewSurvey && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-ink">Nueva encuesta de clima</h3>
              <p className="text-xs text-muted">
                Elige el puesto al que le corresponde este link. Cada puesto tiene su propio link — las respuestas
                siguen siendo anónimas dentro del puesto, pero puedes comparar entre puestos.
              </p>
              <div>
                <label className="label-text">Puesto</label>
                <select
                  value={newSurveyPositionId}
                  onChange={e => setNewSurveyPositionId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecciona un puesto…</option>
                  {initialPositions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowNewSurvey(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => createSurvey(newSurveyPositionId)}
                  disabled={creating || !newSurveyPositionId}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {creating ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {surveys.map(survey => {
            const responses = responsesBySurvey[survey.id] ?? []
            const isExpanded = expandedId === survey.id
            return (
              <div key={survey.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-ink">{survey.title}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[survey.status]}`}>{STATUS_LABEL[survey.status]}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent font-medium">
                        {survey.job_position_name ?? 'General (todos los puestos)'}
                      </span>
                    </div>
                    <p className="text-xs text-faint mt-0.5">{survey.questions.length} preguntas · creada {new Date(survey.created_at).toLocaleDateString('es-MX')}</p>
                  </div>
                  <button onClick={() => deleteSurvey(survey.id)} className="text-faint hover:text-rose-500 text-xs">✕</button>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {survey.status === 'draft' && (
                    <button onClick={() => setStatus(survey.id, 'open')} className="btn-primary text-xs px-3 py-1.5">Abrir encuesta</button>
                  )}
                  {survey.status === 'open' && (
                    <>
                      <button onClick={() => copyLink(survey.token)} className="btn-secondary text-xs px-3 py-1.5">
                        {copiedToken === survey.token ? '✓ Copiado' : '🔗 Copiar link público'}
                      </button>
                      <button onClick={() => setStatus(survey.id, 'closed')} className="btn-secondary text-xs px-3 py-1.5">Cerrar encuesta</button>
                    </>
                  )}
                  {survey.status === 'closed' && (
                    <button onClick={() => setStatus(survey.id, 'open')} className="btn-secondary text-xs px-3 py-1.5">Reabrir</button>
                  )}
                  <button onClick={() => toggleResponses(survey.id)} className="text-xs text-accent hover:underline ml-auto">
                    {isExpanded ? 'Ocultar respuestas' : 'Ver respuestas'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-subtle pt-3 space-y-3">
                    {loadingResponses ? (
                      <p className="text-xs text-muted">Cargando…</p>
                    ) : responses.length === 0 ? (
                      <p className="text-xs text-faint">Sin respuestas todavía.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-surface-2 rounded-lg p-2.5">
                            <p className="text-faint">Respuestas totales</p>
                            <p className="text-lg font-bold text-ink">{responses.length}</p>
                          </div>
                          <div className="bg-surface-2 rounded-lg p-2.5">
                            <p className="text-faint">Comunicación interna (prom.)</p>
                            <p className="text-lg font-bold text-ink">{scaleAverage(survey, responses, 'comunicacion_interna') ?? '—'} / 5</p>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {responses.map(r => (
                            <div key={r.id} className="bg-surface-2 rounded-lg p-3 text-xs space-y-1">
                              <p className="text-faint">{r.area ?? 'Área no especificada'} {r.tiene_gente_a_cargo === 'Sí' ? '· con gente a cargo' : ''} · {new Date(r.created_at).toLocaleDateString('es-MX')}</p>
                              {survey.questions.map(q => (
                                r.answers?.[q.key] !== undefined && r.answers?.[q.key] !== '' && (
                                  <p key={q.key}><span className="text-muted">{q.label}:</span> <span className="text-ink">{String(r.answers[q.key])}</span></p>
                                )
                              ))}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
