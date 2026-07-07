import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

// GET /api/consultant/climate-surveys/responses?surveyId=xxx
// RLS ya limita a encuestas de casos donde el usuario es consultor dueño.
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const surveyId = searchParams.get('surveyId')
  if (!surveyId) return NextResponse.json({ error: 'surveyId requerido' }, { status: 400 })

  const db = supabase as any
  const { data, error } = await db
    .from('case_climate_responses')
    .select('id, area, tiene_gente_a_cargo, answers, created_at')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ responses: data ?? [] })
}
