export const runtime = 'edge'

import { NextResponse } from 'next/server'

const DENUE_BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keyword  = searchParams.get('keyword') ?? ''
  const entidad  = searchParams.get('entidad') ?? '00'
  const inicio   = searchParams.get('inicio')  ?? '1'
  const fin      = searchParams.get('fin')     ?? '50'
  const authHeader = request.headers.get('authorization') ?? ''

  // Autenticación mínima: requiere header interno
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const token = process.env.NEXT_PUBLIC_DENUE_TOKEN ?? process.env.DENUE_TOKEN
  if (!token) return NextResponse.json({ error: 'DENUE_TOKEN no configurado' }, { status: 503 })
  if (!keyword.trim()) return NextResponse.json({ results: [] })

  const url = `${DENUE_BASE}/BuscarEntidad/${encodeURIComponent(keyword)}/${entidad}/${inicio}/${fin}/${token}`

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; RCPai/1.0)',
      },
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[radar] DENUE HTTP error:', res.status, text.slice(0, 200))
      return NextResponse.json({ error: `DENUE respondió ${res.status}: ${text.slice(0, 100)}`, results: [] }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ results: Array.isArray(data) ? data : [] })
  } catch (e: any) {
    console.error('[radar] fetch error:', e?.message)
    return NextResponse.json({
      error: `Error al consultar DENUE: ${e?.message ?? 'desconocido'}`,
      results: [],
    }, { status: 500 })
  }
}
