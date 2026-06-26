export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import ModuleStartClient from '@/app/caso/[id]/modulo/[code]/ModuleStartClient'
import type { PremiumModuleCode, ModuleCode } from '@/types'

const PREMIUM_META: Record<PremiumModuleCode, { name: string; desc: string; duration: string }> = {
  A: { name: 'Valuación Empresarial',   desc: 'Nova te guiará a través de los factores clave que determinan el valor de tu empresa: ingresos recurrentes, activos, deuda y múltiplos comparables del sector.', duration: '25-35 minutos' },
  B: { name: 'Palancas Financieras',    desc: 'Identificaremos las 3-5 palancas que mayor impacto tienen en tu rentabilidad y generación de caja. Basado en tu Radiografía Financiera.', duration: '20-30 minutos' },
  C: { name: 'Análisis de Riesgo',      desc: 'Mapearemos los riesgos operativos, financieros y estratégicos con su probabilidad e impacto, y definiremos mitigantes concretos.', duration: '20-30 minutos' },
  D: { name: 'M&A Readiness',           desc: 'Evaluaremos la preparación de tu empresa para un proceso de fusión, adquisición o entrada de socio estratégico. Incluye análisis de gaps críticos.', duration: '30-40 minutos' },
  E: { name: 'Proyección Financiera',   desc: 'Construiremos escenarios de crecimiento a 12 y 24 meses con supuestos validados por tu equipo. Base para decisiones de inversión.', duration: '25-35 minutos' },
  F: { name: 'Brechas de Rol',          desc: 'Evaluación del colaborador vs el perfil requerido para su posición. Identifica brechas de competencias y plan de desarrollo.', duration: '15-25 minutos' },
  G: { name: 'Capital Humano',          desc: 'Diagnóstico profundo de cultura organizacional, engagement del equipo y riesgos de retención del talento clave.', duration: '20-30 minutos' },
}

export default async function PremiumModuloPage({
  params,
}: {
  params: Promise<{ code: string; caseId: string }>
}) {
  const { code, caseId } = await params
  const moduleCode = code.toUpperCase() as PremiumModuleCode

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Verificar que el consultor tiene esta cuenta y el módulo activado
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) redirect('/premium')

  const { data: premiumAccess } = await db
    .from('premium_modules')
    .select('id')
    .eq('account_id', account.id)
    .eq('module_code', moduleCode)
    .maybeSingle()

  if (!premiumAccess) redirect('/premium')

  // Verificar que el caso pertenece al consultor
  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseData) redirect('/premium')

  // Sesión existente de este módulo premium en este caso
  const { data: existingSession } = await db
    .from('sessions')
    .select('id, messages, completed')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const meta = PREMIUM_META[moduleCode]

  return (
    <ModuleStartClient
      caseId={caseId}
      moduleCode={moduleCode as unknown as ModuleCode}
      label={`${moduleCode} — ${meta.name}`}
      description={meta.desc}
      duration={meta.duration}
      isCompleted={existingSession?.completed ?? false}
      existingSessionId={existingSession?.id ?? null}
      existingMessages={existingSession?.messages ?? []}
      userEmail={session.user.email!}
    />
  )
}
