'use client'

import { useState } from 'react'
import { CREDIT_COSTS } from '@/lib/credits'

interface BriefData {
  executive_summary: string
  modules: Record<string, { title: string; findings: string[]; score: number; critical: string }>
  strategic_intent: string
  strategic_intent_evidence: string
  strengths: string[]
  risks: string[]
  rcp_plan: { weeks_1_4: string[]; weeks_5_8: string[]; weeks_9_12: string[] }
  kpi_targets: Array<{ metric: string; baseline: string; target_90d: string }>
  consultant_notes?: string
}

interface Props {
  caseId: string
  companyName: string
  existingBrief: { content_json: BriefData; generated_at: string; version: number } | null
  completedModules: number
  canGenerate: boolean
  creditsRemaining: number
}

const INTENT_LABELS: Record<string, string> = {
  growth: '🔵 Crecimiento',
  restructure: '🟡 Redimensionamiento',
  exit: '🔴 Salida / Asociación',
  mixed: '⬜ Mixta',
}

const WEEK_LABELS = ['Semanas 1-4', 'Semanas 5-8', 'Semanas 9-12']

export default function BriefGeneratorClient({
  caseId, companyName, existingBrief, completedModules, canGenerate, creditsRemaining
}: Props) {
  const [brief, setBrief] = useState<BriefData | null>(existingBrief?.content_json ?? null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(existingBrief?.generated_at ?? null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!canGenerate) return
    setGenerating(true)
    setError(null)
    const res = await fetch('/api/ai/generate-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId }),
    })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setError(data.error); return }
    setBrief(data.brief.content_json)
    setGeneratedAt(data.brief.generated_at)
  }

  const canGenerateNow = canGenerate && completedModules >= 3 && creditsRemaining >= CREDIT_COSTS.BRIEF_GENERATION

  if (!brief) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Brief de Diagnóstico</h1>
          <p className="text-muted text-sm mt-1">{companyName}</p>
        </div>

        <div className="card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center text-2xl mx-auto">📋</div>
          <div>
            <p className="font-semibold text-ink">El brief aún no ha sido generado</p>
            <p className="text-muted text-sm mt-1">
              {completedModules < 3
                ? `Necesitas al menos 3 módulos completados (tienes ${completedModules})`
                : `${completedModules} módulos completados — listo para generar`}
            </p>
          </div>

          {canGenerate && (
            <div className="pt-2">
              <p className="text-xs text-faint mb-4">
                Costo: <span className="text-ink font-semibold">{CREDIT_COSTS.BRIEF_GENERATION} créditos</span>
                {' '}· Disponibles: <span className={creditsRemaining >= CREDIT_COSTS.BRIEF_GENERATION ? 'text-emerald-600' : 'text-red-600'}>{creditsRemaining}</span>
              </p>
              <button
                onClick={handleGenerate}
                disabled={!canGenerateNow || generating}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed px-8"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generando con IA…
                  </span>
                ) : '✨ Generar brief con IA'}
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Brief de Diagnóstico</h1>
          <p className="text-muted text-sm mt-1">{companyName}</p>
          {generatedAt && (
            <p className="text-xs text-faint mt-0.5">
              Generado {new Date(generatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        {canGenerate && (
          <button onClick={handleGenerate} disabled={generating} className="btn-secondary text-xs">
            {generating ? 'Regenerando…' : '↻ Regenerar'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

      <div className="card p-6">
        <h2 className="text-xs font-bold text-faint uppercase tracking-wider mb-3">Resumen ejecutivo</h2>
        <p className="text-ink text-sm leading-relaxed">{brief.executive_summary}</p>
      </div>

      <div className="card p-5 flex items-start gap-4">
        <div>
          <p className="text-xs text-faint uppercase tracking-wider font-semibold mb-1">Intención estratégica detectada</p>
          <p className="text-lg font-bold text-ink">{INTENT_LABELS[brief.strategic_intent] ?? brief.strategic_intent}</p>
          <p className="text-sm text-muted mt-1 leading-relaxed">{brief.strategic_intent_evidence}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-faint uppercase tracking-wider mb-3">Hallazgos por módulo</h2>
        <div className="space-y-3">
          {Object.entries(brief.modules ?? {}).map(([code, mod]) => (
            <div key={code} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-faint w-7">{code}</span>
                  <h3 className="text-sm font-semibold text-ink">{mod.title}</h3>
                </div>
                <ScoreChip score={mod.score} />
              </div>
              <ul className="space-y-1 mb-3">
                {mod.findings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted">
                    <span className="text-faint flex-shrink-0">·</span>{f}
                  </li>
                ))}
              </ul>
              {mod.critical && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-amber-700">⚠ Punto crítico</p>
                  <p className="text-xs text-ink mt-0.5">{mod.critical}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">✓ Fortalezas</h3>
          <ul className="space-y-2">
            {brief.strengths?.map((s, i) => (
              <li key={i} className="text-xs text-ink flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">·</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">⚠ Riesgos</h3>
          <ul className="space-y-2">
            {brief.risks?.map((r, i) => (
              <li key={i} className="text-xs text-ink flex gap-2">
                <span className="text-red-500 flex-shrink-0">·</span>{r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-xs font-bold text-faint uppercase tracking-wider mb-4">Plan RCP 90 días</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(brief.rcp_plan ?? {}).map(([key, actions], idx) => (
            <div key={key}>
              <p className="text-xs font-semibold text-muted mb-2">{WEEK_LABELS[idx]}</p>
              <ul className="space-y-1.5">
                {(actions as string[]).map((a, i) => (
                  <li key={i} className="text-xs text-ink flex gap-1.5">
                    <span className="text-accent flex-shrink-0 font-bold">{i + 1}.</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {brief.kpi_targets?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-bold text-faint uppercase tracking-wider mb-4">KPIs objetivo</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-faint border-b border-subtle">
                  <th className="text-left pb-2 font-semibold">Métrica</th>
                  <th className="text-right pb-2 font-semibold">Actual</th>
                  <th className="text-right pb-2 font-semibold">Meta 90d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {brief.kpi_targets.map((kpi, i) => (
                  <tr key={i}>
                    <td className="py-2 text-ink">{kpi.metric}</td>
                    <td className="py-2 text-right text-muted">{kpi.baseline}</td>
                    <td className="py-2 text-right text-emerald-600 font-semibold">{kpi.target_90d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 7 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                score >= 4 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                'text-red-700 bg-red-50 border-red-200'
  return (
    <span className={`text-xs font-bold border rounded-lg px-2 py-0.5 ${color}`}>
      {score}/10
    </span>
  )
}
