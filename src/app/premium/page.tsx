export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import type { PremiumModuleCode } from '@/types'

const PREMIUM_META: Record<PremiumModuleCode, { name: string; desc: string; credits: number; color: string }> = {
  A: { name: 'Valuación Empresarial',   desc: 'Estimación del valor de la empresa con múltiplos sectoriales', credits: 25, color: 'bg-violet-50 border-violet-200 text-violet-700' },
  B: { name: 'Palancas Financieras',    desc: 'Identifica las palancas que mayor impacto tienen en la rentabilidad', credits: 15, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  C: { name: 'Análisis de Riesgo',      desc: 'Mapeo de riesgos operativos, financieros y estratégicos', credits: 15, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  D: { name: 'M&A Readiness',           desc: 'Preparación para fusión, adquisición o entrada de socio estratégico', credits: 30, color: 'bg-red-50 border-red-200 text-red-700' },
  E: { name: 'Proyección Financiera',   desc: 'Escenarios de crecimiento a 12 y 24 meses con supuestos validados', credits: 15, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  F: { name: 'Brechas de Rol',          desc: 'Evaluación individual de mandos medios vs perfil requerido', credits: 10, color: 'bg-orange-50 border-orange-200 text-orange-700' },
  G: { name: 'Capital Humano',          desc: 'Diagnóstico de cultura, engagement y retención de talento clave', credits: 15, color: 'bg-teal-50 border-teal-200 text-teal-700' },
}

export default async function PremiumPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select('id, company_name')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/dashboard')

  const { data: premiumRows } = await db
    .from('premium_modules')
    .select('module_code')
    .eq('account_id', account.id)

  const { data: cases } = await db
    .from('cases')
    .select('id, company_name, industry')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })

  const activatedCodes = new Set<string>((premiumRows ?? []).map((r: any) => r.module_code))
  const ALL_CODES: PremiumModuleCode[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

  return (
    <AppShell role="consultant" email={session.user.email!}>
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-xs text-muted hover:text-ink mb-2 inline-block">← Mis casos</Link>
            <h1 className="text-xl font-bold text-ink">Módulos Premium</h1>
            <p className="text-muted text-sm mt-0.5">
              {activatedCodes.size === 0
                ? 'Tu plan no incluye módulos premium activos'
                : `${activatedCodes.size} módulo${activatedCodes.size !== 1 ? 's' : ''} activado${activatedCodes.size !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {ALL_CODES.map(code => {
            const meta = PREMIUM_META[code]
            const active = activatedCodes.has(code)
            return (
              <div key={code} className={`card p-5 border transition-colors ${active ? meta.color : 'border-subtle opacity-60'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${active ? meta.color : 'bg-surface-2 border-subtle text-faint'}`}>
                      {code}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${active ? 'text-ink' : 'text-muted'}`}>{meta.name}</p>
                      <p className="text-xs text-faint">{meta.credits} créditos</p>
                    </div>
                  </div>
                  {!active && (
                    <span className="text-xs text-faint bg-surface-2 border border-subtle px-2 py-0.5 rounded-full">No activado</span>
                  )}
                </div>

                <p className="text-xs text-muted mb-4">{meta.desc}</p>

                {active && (
                  <div>
                    {(!cases || cases.length === 0) ? (
                      <p className="text-xs text-faint">No tienes casos activos</p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs text-faint font-medium mb-2">Aplicar a un caso:</p>
                        {(cases ?? []).map((c: any) => (
                          <Link
                            key={c.id}
                            href={`/premium/${code}/${c.id}` as any}
                            className="flex items-center justify-between rounded-lg border border-subtle bg-surface px-3 py-2 hover:border-accent/30 hover:bg-accent-soft transition-colors group"
                          >
                            <div>
                              <p className="text-xs font-medium text-ink group-hover:text-accent">{c.company_name}</p>
                              {c.industry && <p className="text-xs text-faint">{c.industry}</p>}
                            </div>
                            <span className="text-xs text-faint group-hover:text-accent">→</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {activatedCodes.size === 0 && (
          <div className="card p-8 text-center border-dashed">
            <p className="text-muted font-medium mb-1">Módulos premium no activados</p>
            <p className="text-faint text-sm">Contacta a tu administrador para activar módulos A–G en tu cuenta</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
