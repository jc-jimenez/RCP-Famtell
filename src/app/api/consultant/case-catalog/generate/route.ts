import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import { buildCaseCatalogPrompt } from '@/lib/anthropic/prompts/build-case-catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function verifyAccess(supabase: any, email: string, caseId: string) {
  if (isSuperAdminEmail(email)) return true
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// POST — genera con IA el catálogo propio de un caso (case_id no nulo en
// module_templates), a la medida del contexto capturado en "Nuevo caso"
// (empresa o departamento). Solo aplica a casos con case_type — un caso
// legacy (case_type nulo) sigue usando el catálogo global de siempre y
// nunca llega a este endpoint.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId } = await request.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, description, products_services, case_type, department_name, diagnostic_objectives, strategic_notes')
    .eq('id', caseId)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
  if (!caseData.case_type) {
    return NextResponse.json({ error: 'Este caso usa el catálogo global — no aplica generación por IA' }, { status: 400 })
  }

  const { data: existingTemplates } = await db.from('module_templates').select('id').eq('case_id', caseId).limit(1)
  if (existingTemplates && existingTemplates.length > 0) {
    return NextResponse.json({ error: 'Este caso ya tiene un catálogo generado' }, { status: 409 })
  }

  const systemPrompt = buildCaseCatalogPrompt(caseData)

  let generatedModules: any[]
  try {
    const response = await anthropic.messages.create({
      model: NOVA_MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Genera el catálogo de diagnóstico para este caso.' }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)?.[0]
    if (!jsonMatch) throw new Error('La IA no devolvió un catálogo en formato válido')
    generatedModules = JSON.parse(jsonMatch)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error al generar el catálogo' }, { status: 500 })
  }

  if (!Array.isArray(generatedModules) || generatedModules.length === 0) {
    return NextResponse.json({ error: 'El catálogo generado está vacío' }, { status: 500 })
  }

  // Se inserta módulo por módulo; si algo falla a medias, se revierte todo
  // lo insertado — un caso o tiene el catálogo completo, o no tiene ninguno
  // (moduleCompletion.ts asume que el catálogo de un caso no está a medias).
  const insertedModuleIds: string[] = []
  try {
    for (let mi = 0; mi < generatedModules.length; mi++) {
      const mod = generatedModules[mi]
      const { data: moduleRow, error: moduleError } = await db
        .from('module_templates')
        .insert({ case_id: caseId, code: `M${mi + 1}`, name: mod.name, description: mod.description ?? null, sort_order: mi, is_active: true, credit_cost: 10 })
        .select('id')
        .single()
      if (moduleError || !moduleRow) throw new Error(moduleError?.message ?? 'Error al crear el módulo')
      insertedModuleIds.push(moduleRow.id)

      const sections = Array.isArray(mod.sections) ? mod.sections : []
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si]
        const { data: sectionRow, error: sectionError } = await db
          .from('sections')
          .insert({ module_template_id: moduleRow.id, code: `${mi + 1}.${si + 1}`, name: sec.name, sort_order: si })
          .select('id')
          .single()
        if (sectionError || !sectionRow) throw new Error(sectionError?.message ?? 'Error al crear la sección')

        const questions = Array.isArray(sec.questions) ? sec.questions : []
        const questionRows = questions.map((q: any, qi: number) => ({
          section_id: sectionRow.id,
          text: q.text,
          nova_hint: q.nova_hint ?? null,
          sort_order: qi,
          response_type: 'text',
          is_active: true,
        }))
        if (questionRows.length > 0) {
          const { error: questionsError } = await db.from('questions').insert(questionRows)
          if (questionsError) throw new Error(questionsError.message)
        }
      }
    }
  } catch (err: any) {
    if (insertedModuleIds.length > 0) {
      await db.from('module_templates').delete().in('id', insertedModuleIds)
    }
    return NextResponse.json({ error: err.message ?? 'Error al guardar el catálogo generado' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, modulesCreated: generatedModules.length })
}
