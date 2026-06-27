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
}

const PLAN_SECTIONS = [
  { id: 'plan_90d', label: 'Plan 90 días', desc: 'Quick wins y estabilización' },
  { id: 'plan_6m',  label: 'Plan 6 meses', desc: 'Consolidación y primeros crecimientos' },
  { id: 'plan_1a',  label: 'Plan 1 año',   desc: 'Objetivos medibles y posicionamiento' },
  { id: 'plan_3a',  label: 'Plan 3 años',  desc: 'Visión estratégica alineada al IER' },
] as const

type SectionId = 'executive_summary' | 'market_context' | 'module_findings' | 'plan_90d' | 'plan_6m' | 'plan_1a' | 'plan_3a'

const IER_LABEL: Record<string, string> = {
  blue: '🔵 Crecimiento', yellow: '🟡 Redimensionamiento', red: '🔴 Salida',
}

export default function BriefConsultorClient({ caseId, companyName, industry, email, initialBrief, ierCounts }: Props) {
  const [brief, setBrief] = useState<any>(initialBrief ?? {})
  const [generating, setGenerating] = useState<SectionId | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [activeTab, setActiveTab] = useState<SectionId>('executive_summary')
  const [uploadName, setUploadName] = useState('')
  const [uploadB64, setUploadB64] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const totalIer = ierCounts.blue + ierCounts.yellow + ierCounts.red
  const dominant = totalIer === 0 ? null
    : ierCounts.red >= 4 ? 'red'
    : ierCounts.blue >= ierCounts.yellow && ierCounts.blue >= ierCounts.red ? 'blue'
    : ierCounts.yellow >= ierCounts.red ? 'yellow' : 'red'

  async function generate(section: SectionId) {
    setGenerating(section)
    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          section,
          attachmentBase64: section === 'market_context' ? uploadB64 : undefined,
          attachmentName: section === 'market_context' ? uploadName : undefined,
        }),
      })
      const { result } = await res.json()
      if (result) {
        setBrief((prev: any) => ({ ...prev, [section]: result }))
      }
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
    setPublishing(true)
    await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId, ...brief,
        status: 'published',
        published_at: new Date().toISOString(),
      }),
    })
    setBrief((prev: any) => ({ ...prev, status: 'published' }))
    setPublishing(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setUploadB64(base64)
    }
    reader.readAsDataURL(file)
  }

  const isPublished = brief?.status === 'published'

  const TABS: { id: SectionId; label: string }[] = [
    { id: 'executive_summary', label: 'Resumen ejecutivo' },
    { id: 'market_context',    label: 'Contexto de mercado' },
    { id: 'module_findings',   label: 'Hallazgos M1-M7' },
    { id: 'plan_90d',          label: 'Plan 90d' },
    { id: 'plan_6m',           label: 'Plan 6m' },
    { id: 'plan_1a',           label: 'Plan 1 año' },
    { id: 'plan_3a',           label: 'Plan 3 años' },
  ]

  return (
    <AppShell role="consultant" email={email} caseCompanyName={companyName}>
      <div className="max-w-4xl mx-auto space-y-5">

        <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink inline-block">
          ← {companyName}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">Brief de Cierre</h1>
            <p className="text-sm text-muted mt-1">Entregable ejecutivo · {industry}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => save()} disabled={saving}
              className="btn-secondary text-xs px-3 py-2 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar borrador'}
            </button>
            {!isPublished ? (
              <button onClick={publish} disabled={publishing}
                className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                {publishing ? 'Publicando…' : 'Publicar al directivo →'}
              </button>
            ) : (
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-2">
                ✓ Publicado
              </span>
            )}
          </div>
        </div>

        {/* IER chip */}
        {totalIer > 0 && dominant && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">IER detectado:</span>
            <span className="font-semibold">{IER_LABEL[dominant]}</span>
            <span className="text-faint">({totalIer} señales — 🔵{ierCounts.blue} 🟡{ierCounts.yellow} 🔴{ierCounts.red})</span>
            <Link href={`/caso/${caseId}/indice` as any} className="text-accent hover:underline ml-1">Ver índice →</Link>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-subtle overflow-x-auto">
          <nav className="flex gap-0 min-w-max">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  activeTab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
                }`}>
                {t.label}
                {brief?.[t.id] ? <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> : null}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Resumen ejecutivo ── */}
        {activeTab === 'executive_summary' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Resumen ejecutivo</h2>
              <button onClick={() => generate('executive_summary')} disabled={!!generating}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">
                {generating === 'executive_summary' ? '✦ Generando…' : '✦ Generar con Nova'}
              </button>
            </div>
            <textarea
              rows={10}
              className="input-field w-full text-sm resize-none leading-relaxed"
              placeholder="El resumen ejecutivo aparecerá aquí. Puedes generarlo con Nova o escribirlo manualmente."
              value={brief?.executive_summary ?? ''}
              onChange={e => setBrief((p: any) => ({ ...p, executive_summary: e.target.value }))}
            />
          </div>
        )}

        {/* ── Contexto de mercado ── */}
        {activeTab === 'market_context' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-ink">Contexto de mercado — {industry}</h2>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="btn-secondary text-xs px-3 py-1.5">
                  📎 Subir estudio
                </button>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => generate('market_context')} disabled={!!generating}
                  className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                  {generating === 'market_context' ? '✦ Analizando…' : '✦ Generar con Nova'}
                </button>
              </div>
            </div>

            {uploadName && (
              <div className="flex items-center gap-2 text-xs bg-accent-soft text-accent px-3 py-2 rounded-lg">
                <span>📄 {uploadName}</span>
                <button onClick={() => { setUploadName(''); setUploadB64(null) }} className="ml-auto text-faint hover:text-rose-500">✕</button>
              </div>
            )}

            {brief?.market_context && typeof brief.market_context === 'object' ? (
              <div className="space-y-4">
                {[
                  { key: 'macro',      label: 'Entorno macroeconómico' },
                  { key: 'short_term', label: 'Perspectiva 0-12 meses' },
                  { key: 'mid_term',   label: 'Perspectiva 1-3 años' },
                  { key: 'long_term',  label: 'Perspectiva 3-5 años' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted block mb-1">{label}</label>
                    <textarea rows={3} className="input-field w-full text-sm resize-none"
                      value={brief.market_context[key] ?? ''}
                      onChange={e => setBrief((p: any) => ({
                        ...p,
                        market_context: { ...p.market_context, [key]: e.target.value }
                      }))}
                    />
                  </div>
                ))}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">Oportunidades</label>
                    <div className="space-y-1">
                      {(brief.market_context.opportunities ?? []).map((op: string, i: number) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-emerald-500 text-xs mt-1">▲</span>
                          <input type="text" value={op} className="input-field flex-1 text-xs"
                            onChange={e => {
                              const arr = [...(brief.market_context.opportunities ?? [])]
                              arr[i] = e.target.value
                              setBrief((p: any) => ({ ...p, market_context: { ...p.market_context, opportunities: arr } }))
                            }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">Riesgos</label>
                    <div className="space-y-1">
                      {(brief.market_context.risks ?? []).map((r: string, i: number) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-rose-500 text-xs mt-1">▼</span>
                          <input type="text" value={r} className="input-field flex-1 text-xs"
                            onChange={e => {
                              const arr = [...(brief.market_context.risks ?? [])]
                              arr[i] = e.target.value
                              setBrief((p: any) => ({ ...p, market_context: { ...p.market_context, risks: arr } }))
                            }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center text-sm text-muted">
                Genera el contexto de mercado con Nova, o sube un estudio especializado para que Nova lo analice.
              </div>
            )}
          </div>
        )}

        {/* ── Hallazgos M1-M7 ── */}
        {activeTab === 'module_findings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Hallazgos por módulo</h2>
              <button onClick={() => generate('module_findings')} disabled={!!generating}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                {generating === 'module_findings' ? '✦ Generando…' : '✦ Generar con Nova'}
              </button>
            </div>
            <div className="space-y-3">
              {['M1','M2','M3','M4','M5','M6','M7'].map(mod => (
                <div key={mod}>
                  <label className="text-xs font-mono text-faint bg-surface-2 px-2 py-0.5 rounded mb-1 inline-block">{mod}</label>
                  <textarea rows={2} className="input-field w-full text-sm resize-none"
                    placeholder={`Hallazgo del ${mod}…`}
                    value={brief?.module_findings?.[mod] ?? ''}
                    onChange={e => setBrief((p: any) => ({
                      ...p,
                      module_findings: { ...(p.module_findings ?? {}), [mod]: e.target.value }
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Planes ── */}
        {(['plan_90d','plan_6m','plan_1a','plan_3a'] as const).map(planId => {
          const sec = PLAN_SECTIONS.find(s => s.id === planId)!
          if (activeTab !== planId) return null
          const items: any[] = brief?.[planId] ?? []

          return (
            <div key={planId} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink">{sec.label}</h2>
                  <p className="text-xs text-muted">{sec.desc}</p>
                </div>
                <button onClick={() => generate(planId)} disabled={!!generating}
                  className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                  {generating === planId ? '✦ Generando…' : '✦ Generar con Nova'}
                </button>
              </div>

              {items.length === 0 ? (
                <div className="card p-8 text-center text-sm text-muted">
                  Genera el {sec.label} con Nova o agrégalo manualmente.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="card p-4 space-y-2">
                      <div className="flex items-start gap-3 flex-wrap">
                        {(item.semana || item.trimestre || item.año) && (
                          <span className="text-xs font-mono bg-surface-2 text-muted px-2 py-0.5 rounded flex-shrink-0">
                            {item.semana || item.trimestre || item.año}
                          </span>
                        )}
                        {item.area && (
                          <span className="badge text-xs">{item.area}</span>
                        )}
                        {item.prioridad && (
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            item.prioridad === 'alta' ? 'text-rose-600 border-rose-200 bg-rose-50' :
                            item.prioridad === 'media' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                            'text-muted border-subtle'
                          }`}>{item.prioridad}</span>
                        )}
                        {item.inversion_estimada && (
                          <span className="text-xs text-muted ml-auto">Inversión: {item.inversion_estimada}</span>
                        )}
                      </div>
                      <p className="text-sm text-ink font-medium">
                        {item.accion || item.iniciativa || item.objetivo || (item.vision ? `Visión: ${item.vision}` : '')}
                      </p>
                      {item.kpi && <p className="text-xs text-muted">KPI: {item.kpi}</p>}
                      {item.resultado_esperado && <p className="text-xs text-muted">Resultado: {item.resultado_esperado}</p>}
                      {item.meta_numerica && <p className="text-xs text-muted">Meta: {item.meta_numerica}</p>}
                      {item.hito_clave && <p className="text-xs text-accent">Hito: {item.hito_clave}</p>}
                      {item.hito_transformador && <p className="text-xs text-accent">Hito transformador: {item.hito_transformador}</p>}
                      {item.objetivos && (
                        <ul className="text-xs text-muted space-y-0.5">
                          {item.objetivos.map((o: string, j: number) => <li key={j}>• {o}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Notas del consultor */}
        <div className="card p-4 space-y-2 border-dashed">
          <label className="text-xs font-medium text-muted">Notas internas del consultor (no visibles al directivo)</label>
          <textarea rows={3} className="input-field w-full text-sm resize-none"
            placeholder="Observaciones, pendientes, próximos pasos internos…"
            value={brief?.consultant_notes ?? ''}
            onChange={e => setBrief((p: any) => ({ ...p, consultant_notes: e.target.value }))}
          />
        </div>

        {/* Botón guardar bottom */}
        <div className="flex justify-end gap-2 pb-8">
          <button onClick={() => save()} disabled={saving} className="btn-secondary text-sm px-4 py-2 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
          {!isPublished && (
            <button onClick={publish} disabled={publishing} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {publishing ? 'Publicando…' : 'Publicar al directivo →'}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
