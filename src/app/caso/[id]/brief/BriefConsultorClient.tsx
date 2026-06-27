'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'

interface Props {
  caseId: string
  companyName: string
  industry: string
  email: string
  initialBrief: any
  ierCounts: { blue: number; yellow: number; red: number }
  modulesCompleted: number
}

// ── Track steps ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'interviews',    label: 'Entrevistas',    desc: 'Módulos con sesiones completadas' },
  { id: 'levantamiento', label: 'Levantamiento',  desc: 'Los 7 módulos completados' },
  { id: 'analisis',      label: 'Análisis',       desc: 'Hallazgos M1-M7 generados' },
  { id: 'jtbd',          label: 'JTBD',           desc: 'Jobs-To-Be-Done aprobados' },
  { id: 'segmentos',     label: 'Segmentos',      desc: 'Segmentos validados y priorizados' },
  { id: 'diagnostico',   label: 'Diagnóstico',    desc: 'Líneas prioritarias aprobadas' },
  { id: 'plan',          label: 'Plan',           desc: 'Planes 90d/6m/1a/3a generados' },
  { id: 'publicado',     label: 'Publicado',      desc: 'Brief publicado al directivo' },
] as const

type StepId = typeof STEPS[number]['id']

const PAIN_COLOR: Record<string, string> = {
  alto:  'bg-rose-50 text-rose-700 border-rose-200',
  medio: 'bg-amber-50 text-amber-700 border-amber-200',
  bajo:  'bg-emerald-50 text-emerald-700 border-emerald-200',
}
const URGENCY_COLOR: Record<string, string> = {
  urgente:    'bg-rose-50 text-rose-700 border-rose-200',
  importante: 'bg-amber-50 text-amber-700 border-amber-200',
  deseable:   'bg-blue-50 text-blue-700 border-blue-200',
}
const PRIORITY_COLOR: Record<string, string> = {
  '90d':   'bg-accent text-white',
  '1a':    'bg-surface-2 text-muted',
  'futuro':'bg-surface-2 text-faint',
}

export default function BriefConsultorClient({
  caseId, companyName, industry, email, initialBrief, ierCounts, modulesCompleted,
}: Props) {
  const [brief, setBrief]           = useState<any>(initialBrief ?? {})
  const [activeStep, setActiveStep] = useState<StepId>('interviews')
  const [generating, setGenerating] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadB64, setUploadB64]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const track: Record<string, { status: 'complete' | 'active' | 'pending' }> = brief?.track_status ?? {}

  function stepStatus(stepId: StepId): 'complete' | 'active' | 'pending' {
    if (track[stepId]?.status === 'complete') return 'complete'
    // Auto-detect primeras etapas
    if (stepId === 'interviews') return modulesCompleted >= 1 ? 'complete' : 'active'
    if (stepId === 'levantamiento') return modulesCompleted >= 7 ? 'complete' : modulesCompleted >= 1 ? 'active' : 'pending'
    if (stepId === 'analisis') return Object.keys(brief?.module_findings ?? {}).length >= 3 ? 'complete' : 'active'
    return track[stepId]?.status ?? 'pending'
  }

  function canApproveStep(stepId: StepId): boolean {
    const idx = STEPS.findIndex(s => s.id === stepId)
    return STEPS.slice(0, idx).every(s => stepStatus(s.id) === 'complete')
  }

  async function approveStep(stepId: StepId) {
    const newTrack = { ...track, [stepId]: { status: 'complete', completed_at: new Date().toISOString() } }
    setBrief((p: any) => ({ ...p, track_status: newTrack }))
    await save({ track_status: newTrack })
    // Avanzar al siguiente paso
    const idx = STEPS.findIndex(s => s.id === stepId)
    if (idx < STEPS.length - 1) setActiveStep(STEPS[idx + 1].id)
  }

  async function generate(section: string, extra?: any) {
    setGenerating(section)
    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId, section,
          attachmentBase64: section === 'market_context' ? uploadB64 : undefined,
          attachmentName:   section === 'market_context' ? uploadName : undefined,
          ...extra,
        }),
      })
      const { result, error } = await res.json()
      if (result) setBrief((p: any) => ({ ...p, [section]: result }))
      if (error) console.error(error)
    } finally {
      setGenerating(null)
    }
  }

  async function save(extraFields?: any) {
    setSaving(true)
    await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, ...brief, ...extraFields }),
    })
    setSaving(false)
  }

  async function publish() {
    const newTrack = { ...track, publicado: { status: 'complete', completed_at: new Date().toISOString() } }
    await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId, ...brief,
        track_status: newTrack,
        status: 'published',
        published_at: new Date().toISOString(),
      }),
    })
    setBrief((p: any) => ({ ...p, status: 'published', track_status: newTrack }))
  }

  function toggleApproveItem(field: string, id: string) {
    setBrief((p: any) => ({
      ...p,
      [field]: (p[field] ?? []).map((item: any) =>
        item.id === id ? { ...item, approved: !item.approved } : item
      ),
    }))
  }

  function updateItem(field: string, id: string, changes: any) {
    setBrief((p: any) => ({
      ...p,
      [field]: (p[field] ?? []).map((item: any) =>
        item.id === id ? { ...item, ...changes } : item
      ),
    }))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadName(file.name)
    const reader = new FileReader()
    reader.onload = () => setUploadB64((reader.result as string).split(',')[1])
    reader.readAsDataURL(file)
  }

  const isPublished  = brief?.status === 'published'
  const jtbdList     = brief?.jtbd ?? []
  const segmentList  = brief?.segments ?? []
  const priorityList = brief?.priorities ?? []
  const approvedJtbd = jtbdList.filter((j: any) => j.approved).length
  const approvedSegs = segmentList.filter((s: any) => s.approved).length
  const approvedPris = priorityList.filter((p: any) => p.approved).length

  return (
    <AppShell role="consultant" email={email} caseCompanyName={companyName}>
      <div className="max-w-4xl mx-auto space-y-5 pb-16">

        <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink inline-block">
          ← {companyName}
        </Link>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-ink">Brief de Cierre</h1>
            <p className="text-sm text-muted mt-0.5">{industry} · {companyName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => save()} disabled={saving}
              className="btn-secondary text-xs px-3 py-2 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            {!isPublished ? (
              <button
                onClick={publish}
                disabled={stepStatus('plan') !== 'complete'}
                className="btn-primary text-xs px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={stepStatus('plan') !== 'complete' ? 'Completa todos los pasos primero' : ''}
              >
                Publicar al directivo →
              </button>
            ) : (
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 text-xs">
                ✓ Publicado
              </span>
            )}
          </div>
        </div>

        {/* ── Stepper ── */}
        <div className="card p-4 overflow-x-auto">
          <div className="flex items-center min-w-max gap-0">
            {STEPS.map((step, idx) => {
              const status = stepStatus(step.id)
              const isActive = activeStep === step.id
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setActiveStep(step.id)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      status === 'complete' ? 'bg-emerald-500 border-emerald-500 text-white' :
                      isActive             ? 'bg-accent border-accent text-white' :
                      'bg-surface-2 border-subtle text-faint'
                    }`}>
                      {status === 'complete' ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${
                      isActive ? 'text-accent' : status === 'complete' ? 'text-emerald-700' : 'text-faint'
                    }`}>{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 mb-4 ${status === 'complete' ? 'bg-emerald-400' : 'bg-subtle'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted mt-2 pt-2 border-t border-subtle">
            {STEPS.find(s => s.id === activeStep)?.desc}
          </p>
        </div>

        {/* ── Etapa: Entrevistas ── */}
        {activeStep === 'interviews' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-ink">Entrevistas aplicadas</h2>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                modulesCompleted >= 7 ? 'bg-emerald-100 text-emerald-700' :
                modulesCompleted >= 1 ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-faint'
              }`}>
                {modulesCompleted}/7
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{modulesCompleted} de 7 módulos completados</p>
                <p className="text-xs text-muted mt-0.5">
                  {modulesCompleted === 0 ? 'El directivo aún no ha iniciado ningún módulo' :
                   modulesCompleted < 7  ? 'Puedes continuar con el análisis aunque no estén todos completos' :
                   'Levantamiento completo — todos los módulos tienen sesión'}
                </p>
              </div>
            </div>
            {modulesCompleted >= 1 && (
              <button onClick={() => approveStep('interviews')} disabled={!canApproveStep('interviews')}
                className="btn-primary text-sm px-4 py-2">
                Aprobar y continuar →
              </button>
            )}
          </div>
        )}

        {/* ── Etapa: Levantamiento ── */}
        {activeStep === 'levantamiento' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-ink">Levantamiento de información</h2>
            <p className="text-sm text-muted">
              {modulesCompleted >= 7
                ? 'Todos los módulos completados. El levantamiento está listo para análisis.'
                : `Faltan ${7 - modulesCompleted} módulos. Puedes continuar con el análisis o esperar a completarlos.`}
            </p>
            <button onClick={() => approveStep('levantamiento')} className="btn-primary text-sm px-4 py-2">
              Continuar con el análisis →
            </button>
          </div>
        )}

        {/* ── Etapa: Análisis (Hallazgos M1-M7) ── */}
        {activeStep === 'analisis' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold text-ink">Hallazgos por módulo</h2>
              <button onClick={() => generate('module_findings')} disabled={!!generating}
                className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                {generating === 'module_findings' ? '✦ Analizando…' : '✦ Generar con Nova'}
              </button>
            </div>
            <div className="space-y-3">
              {['M1','M2','M3','M4','M5','M6','M7'].map(mod => (
                <div key={mod}>
                  <label className="text-xs font-mono bg-surface-2 text-muted px-2 py-0.5 rounded mb-1 inline-block">{mod}</label>
                  <textarea rows={2} className="input-field w-full text-sm resize-none"
                    placeholder={`Hallazgo del ${mod}…`}
                    value={brief?.module_findings?.[mod] ?? ''}
                    onChange={e => setBrief((p: any) => ({
                      ...p, module_findings: { ...(p.module_findings ?? {}), [mod]: e.target.value }
                    }))}
                  />
                </div>
              ))}
            </div>
            {Object.keys(brief?.module_findings ?? {}).length >= 3 && (
              <button onClick={() => approveStep('analisis')} className="btn-primary text-sm px-4 py-2">
                Aprobar hallazgos y continuar →
              </button>
            )}
          </div>
        )}

        {/* ── Etapa: JTBD ── */}
        {activeStep === 'jtbd' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink">Jobs-To-Be-Done</h2>
                <p className="text-xs text-muted mt-0.5">{approvedJtbd} de {jtbdList.length} aprobados</p>
              </div>
              <button onClick={() => generate('jtbd')} disabled={!!generating}
                className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                {generating === 'jtbd' ? '✦ Identificando…' : '✦ Identificar con Nova'}
              </button>
            </div>

            {jtbdList.length === 0 ? (
              <div className="card p-8 text-center text-sm text-muted">
                Nova analizará las transcripciones de las entrevistas para identificar los Jobs-To-Be-Done de los clientes de {companyName}.
              </div>
            ) : (
              <div className="space-y-3">
                {jtbdList.map((j: any) => (
                  <div key={j.id} className={`card p-4 space-y-3 transition-all ${j.approved ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleApproveItem('jtbd', j.id)}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs transition-colors ${
                          j.approved ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-subtle hover:border-emerald-400'
                        }`}>
                        {j.approved ? '✓' : ''}
                      </button>
                      <div className="flex-1 space-y-2">
                        <textarea rows={2} className="input-field w-full text-sm resize-none font-medium"
                          value={j.statement}
                          onChange={e => updateItem('jtbd', j.id, { statement: e.target.value })}
                        />
                        <div className="bg-surface-2 rounded-xl px-3 py-2">
                          <p className="text-xs text-faint mb-1">Evidencia de la entrevista:</p>
                          <p className="text-xs text-ink italic">{j.evidence}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded border ${PAIN_COLOR[j.pain_level] ?? ''}`}>
                            Dolor: {j.pain_level}
                          </span>
                          {j.frequency && <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-muted">{j.frequency}</span>}
                          {j.type && <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-muted">{j.type}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {approvedJtbd >= 1 && (
              <div className="flex gap-2">
                <button onClick={() => save()} disabled={saving} className="btn-secondary text-sm px-4 py-2">
                  Guardar
                </button>
                <button onClick={() => approveStep('jtbd')} className="btn-primary text-sm px-4 py-2">
                  Aprobar {approvedJtbd} JTBD y continuar →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa: Segmentos ── */}
        {activeStep === 'segmentos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink">Segmentos de clientes</h2>
                <p className="text-xs text-muted mt-0.5">{approvedSegs} de {segmentList.length} aprobados</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs px-3 py-2">
                  📎 Subir estudio
                </button>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
                <button onClick={() => generate('segments')} disabled={!!generating}
                  className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                  {generating === 'segments' ? '✦ Generando…' : '✦ Generar con Nova'}
                </button>
              </div>
            </div>

            {uploadName && (
              <div className="flex items-center gap-2 text-xs bg-accent-soft text-accent px-3 py-2 rounded-lg">
                📄 {uploadName}
                <button onClick={() => { setUploadName(''); setUploadB64(null) }} className="ml-auto text-faint hover:text-rose-500">✕</button>
              </div>
            )}

            {segmentList.length === 0 ? (
              <div className="card p-8 text-center text-sm text-muted">
                Nova propondrá segmentos de clientes basados en los JTBD aprobados y el contexto del sector {industry}.
              </div>
            ) : (
              <div className="space-y-4">
                {segmentList.map((s: any) => (
                  <div key={s.id} className={`card p-5 space-y-3 transition-all ${s.approved ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleApproveItem('segments', s.id)}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs ${
                          s.approved ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-subtle hover:border-emerald-400'
                        }`}>
                        {s.approved ? '✓' : ''}
                      </button>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input type="text" value={s.name}
                            onChange={e => updateItem('segments', s.id, { name: e.target.value })}
                            className="text-sm font-semibold text-ink bg-transparent border-b border-subtle focus:border-accent outline-none pb-0.5 flex-1 min-w-0"
                          />
                          {/* Selector de prioridad */}
                          <div className="flex gap-1">
                            {(['90d','1a','futuro'] as const).map(p => (
                              <button key={p} onClick={() => updateItem('segments', s.id, { priority: p })}
                                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                                  s.priority === p ? PRIORITY_COLOR[p] : 'bg-surface-2 text-faint hover:bg-surface'
                                }`}>
                                {p === '90d' ? '90 días' : p === '1a' ? '1 año' : 'Futuro'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-muted">{s.description}</p>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-faint mb-1">Oferta irresistible</p>
                            <textarea rows={2} className="input-field w-full text-xs resize-none"
                              value={s.irresistible_offer ?? ''}
                              onChange={e => updateItem('segments', s.id, { irresistible_offer: e.target.value })}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-faint mb-1">Copy hook</p>
                            <textarea rows={2} className="input-field w-full text-xs resize-none"
                              value={s.copy_hook ?? ''}
                              onChange={e => updateItem('segments', s.id, { copy_hook: e.target.value })}
                            />
                          </div>
                        </div>

                        {s.funnel && (
                          <div>
                            <p className="text-xs text-faint mb-1">Funnel</p>
                            <p className="text-xs text-ink bg-surface-2 rounded-lg px-3 py-2">{s.funnel}</p>
                          </div>
                        )}

                        {s.channels?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {s.channels.map((ch: string) => (
                              <span key={ch} className="text-xs bg-accent-soft text-accent px-2 py-0.5 rounded">{ch}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {approvedSegs >= 1 && (
              <div className="flex gap-2">
                <button onClick={() => save()} disabled={saving} className="btn-secondary text-sm px-4 py-2">Guardar</button>
                <button onClick={() => approveStep('segmentos')} className="btn-primary text-sm px-4 py-2">
                  Aprobar {approvedSegs} segmentos y continuar →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa: Diagnóstico (Prioridades) ── */}
        {activeStep === 'diagnostico' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink">Líneas de diagnóstico prioritarias</h2>
                <p className="text-xs text-muted mt-0.5">{approvedPris} de {priorityList.length} aprobadas</p>
              </div>
              <button onClick={() => generate('priorities')} disabled={!!generating}
                className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                {generating === 'priorities' ? '✦ Generando…' : '✦ Generar con Nova'}
              </button>
            </div>

            {priorityList.length === 0 ? (
              <div className="card p-8 text-center text-sm text-muted">
                Nova identificará las líneas de diagnóstico más importantes basadas en los hallazgos, JTBD y segmentos aprobados.
              </div>
            ) : (
              <div className="space-y-2">
                {priorityList
                  .sort((a: any, b: any) => {
                    const order = { urgente: 0, importante: 1, deseable: 2 }
                    return (order[a.urgency as keyof typeof order] ?? 3) - (order[b.urgency as keyof typeof order] ?? 3)
                  })
                  .map((p: any) => (
                  <div key={p.id} className={`card p-4 flex items-start gap-3 transition-all ${p.approved ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
                    <button onClick={() => toggleApproveItem('priorities', p.id)}
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs ${
                        p.approved ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-subtle hover:border-emerald-400'
                      }`}>
                      {p.approved ? '✓' : ''}
                    </button>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className={`text-xs px-2 py-0.5 rounded border ${URGENCY_COLOR[p.urgency] ?? ''}`}>{p.urgency}</span>
                        <span className="badge text-xs">{p.area}</span>
                        <span className="text-xs font-mono text-faint">{p.module_origin}</span>
                        {p.impact && <span className="text-xs text-muted">Impacto: {p.impact}</span>}
                        {p.effort && <span className="text-xs text-muted">Esfuerzo: {p.effort}</span>}
                      </div>
                      <textarea rows={2} className="input-field w-full text-sm resize-none"
                        value={p.statement}
                        onChange={e => updateItem('priorities', p.id, { statement: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {approvedPris >= 1 && (
              <div className="flex gap-2">
                <button onClick={() => save()} disabled={saving} className="btn-secondary text-sm px-4 py-2">Guardar</button>
                <button onClick={() => approveStep('diagnostico')} className="btn-primary text-sm px-4 py-2">
                  Aprobar {approvedPris} prioridades y continuar →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa: Plan ── */}
        {activeStep === 'plan' && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-ink">Planes de acción</h2>

            {/* Contexto de mercado */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink">Contexto de mercado</h3>
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs px-2 py-1">📎</button>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
                  <button onClick={() => generate('market_context')} disabled={!!generating}
                    className="btn-secondary text-xs px-2 py-1 disabled:opacity-50">
                    {generating === 'market_context' ? '✦…' : '✦ Nova'}
                  </button>
                </div>
              </div>
              {brief?.market_context?.macro
                ? <p className="text-xs text-ink leading-relaxed">{brief.market_context.macro}</p>
                : <p className="text-xs text-muted">Genera el contexto de mercado para anclar los planes.</p>}
            </div>

            {/* Resumen ejecutivo */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink">Resumen ejecutivo</h3>
                <button onClick={() => generate('executive_summary')} disabled={!!generating}
                  className="btn-secondary text-xs px-2 py-1 disabled:opacity-50">
                  {generating === 'executive_summary' ? '✦…' : '✦ Nova'}
                </button>
              </div>
              <textarea rows={5} className="input-field w-full text-sm resize-none"
                placeholder="Genera o escribe el resumen ejecutivo…"
                value={brief?.executive_summary ?? ''}
                onChange={e => setBrief((p: any) => ({ ...p, executive_summary: e.target.value }))}
              />
            </div>

            {/* Los 4 planes */}
            {([
              { id: 'plan_90d', label: 'Plan 90 días' },
              { id: 'plan_6m',  label: 'Plan 6 meses' },
              { id: 'plan_1a',  label: 'Plan 1 año' },
              { id: 'plan_3a',  label: 'Plan 3 años' },
            ] as const).map(({ id, label }) => {
              const items: any[] = brief?.[id] ?? []
              return (
                <div key={id} className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-ink">{label}</h3>
                    <button onClick={() => generate(id)} disabled={!!generating}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                      {generating === id ? '✦ Generando…' : `✦ Generar ${label}`}
                    </button>
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map((item: any, i: number) => (
                        <div key={i} className={`rounded-xl border p-3 space-y-1 ${
                          item.tipo === 'urgente' || item.urgency === 'urgente' ? 'border-rose-200 bg-rose-50/30' :
                          item.es_permanente ? 'border-accent/20 bg-accent-soft/30' : 'border-subtle'
                        }`}>
                          <div className="flex gap-2 flex-wrap items-center">
                            {(item.semana || item.trimestre || item.año) && (
                              <span className="text-[10px] font-mono bg-surface-2 text-muted px-1.5 py-0.5 rounded">
                                {item.semana || item.trimestre || item.año}
                              </span>
                            )}
                            {item.area && <span className="badge text-xs">{item.area}</span>}
                            {item.tipo && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${URGENCY_COLOR[item.tipo] ?? ''}`}>{item.tipo}</span>}
                            {item.es_permanente && <span className="text-[10px] text-accent ml-auto">↻ permanente</span>}
                          </div>
                          <p className="text-xs text-ink font-medium">
                            {item.accion || item.iniciativa || item.objetivo || item.vision}
                          </p>
                          {item.kpi && <p className="text-[10px] text-muted">KPI: {item.kpi}</p>}
                          {item.resultado_esperado && <p className="text-[10px] text-muted">{item.resultado_esperado}</p>}
                          {item.hito_clave && <p className="text-[10px] text-accent">★ {item.hito_clave}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Sin generar aún.</p>
                  )}
                </div>
              )
            })}

            {/* Notas internas */}
            <div className="card p-4 space-y-2 border-dashed">
              <label className="text-xs font-medium text-muted">Notas internas (no visibles al directivo)</label>
              <textarea rows={3} className="input-field w-full text-sm resize-none"
                placeholder="Observaciones, pendientes, hipótesis a validar…"
                value={brief?.consultant_notes ?? ''}
                onChange={e => setBrief((p: any) => ({ ...p, consultant_notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => save()} disabled={saving} className="btn-secondary text-sm px-4 py-2">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button onClick={() => approveStep('plan')} className="btn-primary text-sm px-4 py-2">
                Aprobar planes y habilitar publicación →
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa: Publicado ── */}
        {activeStep === 'publicado' && (
          <div className="card p-8 text-center space-y-4">
            {isPublished ? (
              <>
                <p className="text-3xl">✅</p>
                <p className="text-base font-semibold text-emerald-700">Brief publicado al directivo</p>
                <p className="text-sm text-muted">El directivo puede ver el Brief en su workspace bajo la pestaña "Brief M7".</p>
                <Link href={`/caso/${caseId}/brief` as any}
                  className="btn-secondary text-sm px-4 py-2 inline-block">
                  Ver como directivo →
                </Link>
              </>
            ) : (
              <>
                <p className="text-3xl">📋</p>
                <p className="text-base font-semibold text-ink">Listo para publicar</p>
                <p className="text-sm text-muted">Todos los pasos están completos. Publica el Brief para que el directivo pueda verlo.</p>
                <button onClick={publish} className="btn-primary text-sm px-6 py-2.5">
                  Publicar Brief al directivo →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
