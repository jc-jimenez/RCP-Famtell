import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST público — envía respuesta anónima. Sin user_id, sin IP: solo lo
// que el propio formulario recolecta (área/nivel autodeclarados + respuestas).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { area, tieneGenteACargo, answers } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await (supabase as any).rpc('submit_climate_response', {
    p_token: token,
    p_area: area ?? null,
    p_tiene_gente_a_cargo: tieneGenteACargo ?? null,
    p_answers: answers ?? {},
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Esta encuesta ya no está abierta' }, { status: 403 })

  return NextResponse.json({ ok: true })
}
