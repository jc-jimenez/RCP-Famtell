import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import https from 'https'

const DENUE_BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta'

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; RCPai/1.0)',
      },
    }, (res) => {
      // Seguir redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject)
      }
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => resolve(body))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

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
    const body = await httpsGet(url)
    const data = JSON.parse(body)
    return NextResponse.json({ results: Array.isArray(data) ? data : [] })
  } catch (e: any) {
    console.error('[radar] error:', e?.message)
    return NextResponse.json({
      error: `Error al consultar DENUE: ${e?.message ?? 'desconocido'}`,
      results: [],
    }, { status: 500 })
  }
}
