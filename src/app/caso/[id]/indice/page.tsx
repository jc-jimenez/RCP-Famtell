export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import IndiceClient from './IndiceClient'
import { getDominantIntent } from '@/lib/anthropic/agenda-detector'
import type { AgendaSignalType } from '@/types'

export default async function IndicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry')
    .eq('id', id)
    .single()

  if (!caseData || !caseUser) redirect('/login')

  // Cargar todas las señales de agenda oculta del caso
  const { data: signals } = await db
    .from('agenda_signals')
    .select('id, module_code, signal_type, signal_text, created_at')
    .eq('case_id', id)
    .order('created_at', { ascending: true })

  const allSignals: { module_code: string; signal_type: AgendaSignalType; signal_text: string; created_at: string }[] =
    signals ?? []

  // Peso doble para M6 (según diseño del catálogo)
  const weighted = allSignals.flatMap(s =>
    s.module_code === 'M6' ? [s, s] : [s]
  )

  const dominant = getDominantIntent(weighted.map(s => ({ signal_type: s.signal_type })))

  // Conteos por módulo
  const byModule: Record<string, { blue: number; yellow: number; red: number }> = {}
  allSignals.forEach(s => {
    if (!byModule[s.module_code]) byModule[s.module_code] = { blue: 0, yellow: 0, red: 0 }
    byModule[s.module_code][s.signal_type]++
  })

  // Score numérico 0-100: blue=0, yellow=50, red=100 — promedio ponderado
  const scoreMap = { blue: 0, yellow: 50, red: 100 }
  const totalWeight = weighted.length
  const rawScore = totalWeight === 0
    ? null
    : Math.round(weighted.reduce((s, sig) => s + scoreMap[sig.signal_type], 0) / totalWeight)

  return (
    <IndiceClient
      caseId={id}
      companyName={caseData.company_name}
      role={caseUser.role}
      email={session.user.email!}
      signals={allSignals}
      byModule={byModule}
      dominant={dominant}
      score={rawScore}
    />
  )
}
