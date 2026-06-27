import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const keyword  = searchParams.get('keyword') ?? ''
  const entidad  = searchParams.get('entidad') ?? '00'    // '00' = todo México
  const estrato  = searchParams.get('estrato') ?? '0'     // '0' = todos
  const keywords = searchParams.getAll('kw')              // múltiples keywords para modo SCIAN
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500)

  const db = supabase as any

  let query = db
    .from('denue_empresas')
    .select('id, nombre, razon_social, clase_actividad, codigo_actividad, estrato, nombre_vialidad, numero_exterior, nombre_asentamiento, municipio, entidad, codigo_postal, telefono, correo_e, latitud, longitud')
    .limit(limit)

  // Filtro por estado
  if (entidad !== '00') query = query.eq('estado_code', entidad.padStart(2, '0'))

  // Filtro por tamaño
  if (estrato !== '0') query = query.eq('estrato', estrato)

  // Búsqueda por texto
  if (keywords.length > 0) {
    // Modo SCIAN: buscar múltiples keywords con OR
    const searchTerm = keywords.join(' | ')
    query = query.textSearch('nombre', searchTerm, { type: 'websearch', config: 'spanish' })
  } else if (keyword.trim()) {
    // Modo nombre: búsqueda simple
    query = query.or(`nombre.ilike.%${keyword}%,razon_social.ilike.%${keyword}%`)
  } else {
    return NextResponse.json({ results: [] })
  }

  const { data, error } = await query

  if (error) {
    console.error('[radar] supabase error:', error)
    return NextResponse.json({ error: error.message, results: [] }, { status: 500 })
  }

  return NextResponse.json({ results: data ?? [] })
}
