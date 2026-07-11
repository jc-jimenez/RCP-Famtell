export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import BizdoctorLogo from '@/components/shared/BizdoctorLogo'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Usamos service role para acceso público (sin sesión)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const db = supabase as any

  // Datos del caso via función SECURITY DEFINER
  const { data: caseRows } = await db.rpc('get_share_link_data', { p_token: token })
  if (!caseRows?.length) notFound()
  const caseData = caseRows[0]

  // Módulos
  const { data: moduleRows } = await db.rpc('get_share_link_modules', { p_token: token })
  const moduleMap: Record<string, { status: string; completed_at: string | null }> = {}
  ;(moduleRows ?? []).forEach((m: any) => { moduleMap[m.module_code] = m })

  // Catálogo real del caso (propio si existe, si no el global M1-M7)
  const catalogScope = await resolveCatalogScope(db, caseData.case_id)
  const templatesQuery = db.from('module_templates').select('code, name, description').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, catalogScope, caseData.case_id).order('sort_order', { ascending: true })
  const moduleOrder: string[] = (templates ?? []).map((t: any) => t.code)
  const moduleInfo: Record<string, { label: string; desc: string }> = {}
  ;(templates ?? []).forEach((t: any) => { moduleInfo[t.code] = { label: t.name, desc: t.description ?? '' } })

  // Brief (resumen ejecutivo + prioridades + plan 90d)
  const { data: briefRows } = await db.rpc('get_share_link_brief', { p_token: token })
  const brief = briefRows?.[0] ?? null

  const completedCount = Object.values(moduleMap).filter((m: any) => m.status === 'completed').length

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header público */}
      <header className="bg-white border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-[#1e293b]"><BizdoctorLogo /></span>
          <span className="text-[#94a3b8] text-sm">·</span>
          <span className="text-sm text-[#64748b]">Portal del Cliente</span>
        </div>
        <span className="text-xs text-[#94a3b8]">Vista de solo lectura</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Empresa */}
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">{caseData.company_name}</h1>
          {caseData.industry && <p className="text-sm text-[#64748b] mt-1">{caseData.industry}</p>}
          <p className="text-xs text-[#94a3b8] mt-2">
            Link válido hasta {formatDate(caseData.expires_at)}
          </p>
        </div>

        {/* Progreso general */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1e293b]">Progreso del diagnóstico</h2>
            <span className="text-2xl font-bold text-[#1e293b]">
              {completedCount}<span className="text-base font-normal text-[#94a3b8]">/{moduleOrder.length}</span>
            </span>
          </div>
          {/* Barra */}
          <div className="flex items-center gap-1.5 mb-3">
            {moduleOrder.map((code, i) => {
              const mod = moduleMap[code]
              const done = mod?.status === 'completed'
              const nextModule = moduleOrder.find(c => moduleMap[c]?.status !== 'completed')
              const active = !done && code === nextModule
              return (
                <div key={code} className="flex items-center gap-1.5 flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                    done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                    active ? 'bg-white border-[#4f46e5] text-[#4f46e5]' :
                    'bg-[#f1f5f9] border-[#e2e8f0] text-[#94a3b8]'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  {i < moduleOrder.length - 1 && (
                    <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-400' : 'bg-[#e2e8f0]'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="w-full bg-[#f1f5f9] rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${moduleOrder.length > 0 ? (completedCount / moduleOrder.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-[#64748b] mt-2">
            {completedCount === 0
              ? 'Diagnóstico en proceso'
              : completedCount === moduleOrder.length
              ? 'Diagnóstico completo'
              : `${completedCount} de ${moduleOrder.length} módulos completados`}
          </p>
        </div>

        {/* Módulos */}
        <div>
          <h2 className="text-sm font-semibold text-[#1e293b] mb-3">Módulos de diagnóstico</h2>
          <div className="space-y-2">
            {moduleOrder.map((code, i) => {
              const info = moduleInfo[code]
              const mod = moduleMap[code]
              const done = mod?.status === 'completed'
              const nextModule = moduleOrder.find(c => moduleMap[c]?.status !== 'completed')
              const active = !done && code === nextModule
              const locked = !done && !active
              return (
                <div key={code} className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 ${
                  done   ? 'border-emerald-200 bg-emerald-50/40' :
                  active ? 'border-[#c7d2fe]' :
                  'border-[#e2e8f0] opacity-60'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    done   ? 'bg-emerald-100 text-emerald-700' :
                    active ? 'bg-[#ede9fe] text-[#4f46e5]' :
                    'bg-[#f1f5f9] text-[#94a3b8]'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${locked ? 'text-[#94a3b8]' : 'text-[#1e293b]'}`}>{info.label}</p>
                    <p className="text-xs text-[#64748b]">{info.desc}</p>
                    {done && mod?.completed_at && (
                      <p className="text-xs text-emerald-600 mt-0.5">Completado {formatDate(mod.completed_at)}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {done
                      ? <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">Completado</span>
                      : active
                      ? <span className="text-xs font-medium text-[#4f46e5] bg-[#ede9fe] border border-[#c7d2fe] px-2.5 py-1 rounded-full">En proceso</span>
                      : <span className="text-xs text-[#94a3b8]">Pendiente</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resumen ejecutivo (solo si existe en el brief) */}
        {brief?.executive_summary && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#1e293b]">Resumen ejecutivo</h2>
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{brief.executive_summary}</p>
          </div>
        )}

        {/* Prioridades estratégicas */}
        {brief?.priorities && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#1e293b]">Prioridades estratégicas</h2>
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{brief.priorities}</p>
          </div>
        )}

        {/* Plan 90 días */}
        {brief?.plan_90d && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#1e293b]">Plan primeros 90 días</h2>
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{brief.plan_90d}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8 space-y-1">
          <p className="text-xs text-[#94a3b8]">
            Diagnóstico generado con www.bizdoctor.site
          </p>
          <p className="text-xs text-[#cbd5e1]">
            www.bizdoctor.site es una solución desarrollada por StartLab Global Business Competence School
          </p>
        </div>

      </main>
    </div>
  )
}
