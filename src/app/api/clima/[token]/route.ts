import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET público — obtiene la encuesta por token, sin sesión. Vía función
// SECURITY DEFINER (ver migración 029) para no exponer la tabla directo.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await (supabase as any).rpc('get_climate_survey_by_token', { p_token: token })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 })

  return NextResponse.json({ survey: data[0] })
}
