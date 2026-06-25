import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any
  const { data, error } = await db
    .from('kpi_records')
    .select('*')
    .eq('case_id', caseId)
    .order('week', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ kpis: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { caseId, week, ...kpiData } = body

  if (!caseId || !week) return NextResponse.json({ error: 'caseId y week son requeridos' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('kpi_records')
    .upsert({ case_id: caseId, week, ...kpiData }, { onConflict: 'case_id,week' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ kpi: data })
}
