import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId } = await request.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any

  // Obtener transcripción del M3
  const { data: m3session } = await db
    .from('sessions')
    .select('messages')
    .eq('case_id', caseId)
    .eq('module_code', 'M3')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!m3session?.messages?.length) {
    return NextResponse.json({ error: 'No hay sesión de M3 completada para este caso' }, { status: 404 })
  }

  const transcript = m3session.messages
    .map((m: any) => `${m.role === 'user' ? 'Directivo' : 'Nova'}: ${m.content}`)
    .join('\n')

  // Nova extrae contactos de la transcripción
  const prompt = `Analiza esta transcripción del Módulo 3 (Base de Contactos) y extrae todos los contactos mencionados.

TRANSCRIPCIÓN:
${transcript}

Devuelve ÚNICAMENTE un JSON array con los contactos encontrados. Para cada contacto incluye los campos que puedas inferir:
[{
  "name": "nombre completo o empresa si no hay nombre",
  "company": "empresa donde trabaja (si se menciona)",
  "role": "puesto o rol (si se menciona)",
  "email": null,
  "phone": null,
  "relationship_type": "client" | "prospect" | "supplier" | "partner" | "other",
  "notes": "contexto relevante mencionado en la conversación"
}]

Solo incluye contactos reales mencionados. Si no hay ninguno, devuelve [].`

  let extracted: any[] = []
  try {
    const response = await anthropic.messages.create({
      model: NOVA_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    extracted = match ? JSON.parse(match[0]) : []
  } catch (e) {
    return NextResponse.json({ error: 'Error al procesar con Nova' }, { status: 500 })
  }

  if (!extracted.length) {
    return NextResponse.json({ imported: 0, contacts: [] })
  }

  // Insertar en BD (ignorar duplicados por nombre+case_id)
  const toInsert = extracted.map((c: any) => ({
    case_id: caseId,
    name: c.name,
    company: c.company ?? null,
    role: c.role ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    relationship_type: c.relationship_type ?? 'other',
    notes: c.notes ?? null,
    pipeline_stage: 'pending',
  }))

  const { data: inserted, error } = await db
    .from('contacts')
    .insert(toInsert)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: inserted?.length ?? 0, contacts: inserted ?? [] })
}
