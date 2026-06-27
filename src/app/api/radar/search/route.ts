import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

const DENUE_BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const keyword  = searchParams.get('keyword') ?? ''
  const entidad  = searchParams.get('entidad') ?? '00'
  const inicio   = searchParams.get('inicio')  ?? '1'
  const fin      = searchParams.get('fin')     ?? '50'

  const token = process.env.DENUE_TOKEN
  if (!token) return NextResponse.json({ error: 'DENUE_TOKEN no configurado' }, { status: 503 })

  if (!keyword.trim()) return NextResponse.json({ results: [] })

  const url = `${DENUE_BASE}/BuscarEntidad/${encodeURIComponent(keyword)}/${entidad}/${inicio}/${fin}/${token}`

  console.log('[radar] fetching:', url.replace(token, 'TOKEN'))

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[radar] DENUE HTTP error:', res.status, text.slice(0, 200))
      return NextResponse.json({ error: `DENUE respondió ${res.status}`, results: [] }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ results: Array.isArray(data) ? data : [] })
  } catch (e: any) {
    console.error('[radar] fetch error:', e?.cause ?? e)
    return NextResponse.json({
      error: `Error de red al consultar DENUE: ${e?.cause?.code ?? e?.message ?? 'desconocido'}`,
      results: [],
    }, { status: 500 })
  }
}
