import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getDominantIntent } from '@/lib/anthropic/agenda-detector'

// GET /api/agenda-signals?caseId=xxx — señales del caso (solo consultor)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any

  // Verificar que el caso pertenece al consultor
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { data: signals, error } = await db
    .from('agenda_signals')
    .select('*')
    .eq('case_id', caseId)
    .order('detected_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dominantIntent = getDominantIntent(signals ?? [])
  const counts = { blue: 0, yellow: 0, red: 0 }
  ;(signals ?? []).forEach((s: any) => counts[s.signal_type as keyof typeof counts]++)

  return NextResponse.json({
    signals: signals ?? [],
    counts,
    dominantIntent,
    recommendModuleD: counts.red >= 4,
  })
}
