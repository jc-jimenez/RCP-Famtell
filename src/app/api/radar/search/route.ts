export const runtime = 'edge'

import { NextResponse } from 'next/server'

const DENUE_BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode     = searchParams.get('mode') ?? 'scian'   // 'scian' | 'nombre'
  const cveAct   = searchParams.get('cveAct') ?? ''      // código SCIAN (modo scian)
  const keyword  = searchParams.get('keyword') ?? ''     // nombre empresa (modo nombre)
  const entidad  = searchParams.get('entidad') ?? '00'
  const estrato  = searchParams.get('estrato') ?? '0'    // 0=todos,1=micro,2=peq,3=med,4=grande
  const inicio   = searchParams.get('inicio')  ?? '1'
  const fin      = searchParams.get('fin')     ?? '50'

  const token = process.env.NEXT_PUBLIC_DENUE_TOKEN ?? process.env.DENUE_TOKEN
  if (!token) return NextResponse.json({ error: 'DENUE_TOKEN no configurado' }, { status: 503 })

  let url: string

  if (mode === 'nombre') {
    if (!keyword.trim()) return NextResponse.json({ results: [] })
    url = `${DENUE_BASE}/BuscarEntidad/${encodeURIComponent(keyword)}/${entidad}/${inicio}/${fin}/${token}`
  } else {
    if (!cveAct.trim()) return NextResponse.json({ results: [] })
    // BuscarAreaActEcon/{cve_act}/{entidad}/{estrato}/{inicio}/{fin}/{token}
    // estrato: 0=todos, 1=micro, 2=pequeña, 3=mediana, 4=grande
    // Cuando estrato=0 usar endpoint sin estrato
    if (estrato === '0') {
      url = `${DENUE_BASE}/BuscarAreaActEcon/${cveAct}/${entidad}/${inicio}/${fin}/${token}`
    } else {
      url = `${DENUE_BASE}/BuscarAreaActEcon/${cveAct}/${entidad}/${estrato}/${inicio}/${fin}/${token}`
    }
  }

  console.log('[radar] GET', url.replace(token, 'TOKEN'))

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; RCPai/1.0)',
      },
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `DENUE respondió ${res.status}: ${text.slice(0, 100)}`, results: [] }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ results: Array.isArray(data) ? data : [] })
  } catch (e: any) {
    return NextResponse.json({
      error: `Error al consultar DENUE: ${e?.message ?? 'desconocido'}`,
      results: [],
    }, { status: 500 })
  }
}
