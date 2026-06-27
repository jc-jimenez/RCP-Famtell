export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import PlanDiagnosticoClient from './PlanDiagnosticoClient'

export default async function PlanDiagnosticoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: caseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()
  if (!account) redirect('/dashboard')

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .maybeSingle()
  if (!caseData) redirect('/dashboard')

  // Catálogo completo
  const { data: modules } = await db
    .from('module_templates')
    .select(`
      id, code, name, sort_order,
      sections (
        id, code, name, sort_order, suggested_roles,
        questions (
          id, text, nova_hint, sort_order, suggested_roles, is_active
        )
      )
    `)
    .order('sort_order', { ascending: true })

  // Overrides del consultor para este caso
  const { data: overrides } = await db
    .from('case_question_overrides')
    .select('question_id, is_active, custom_text, roles_override')
    .eq('case_id', caseId)

  // Preguntas custom creadas por el consultor para este caso
  const { data: customQuestions } = await db
    .from('case_custom_questions')
    .select('id, section_id, text, nova_hint, sort_order, suggested_roles, is_active')
    .eq('case_id', caseId)

  const sorted = (modules ?? []).map((m: any) => ({
    ...m,
    sections: (m.sections ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((s: any) => ({
        ...s,
        questions: (s.questions ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })),
  }))

  const overridesMap: Record<string, { is_active: boolean; custom_text: string | null; roles_override: string[] | null }> = {}
  ;(overrides ?? []).forEach((o: any) => {
    overridesMap[o.question_id] = {
      is_active: o.is_active,
      custom_text: o.custom_text,
      roles_override: o.roles_override ?? null,
    }
  })

  // Agrupar preguntas custom por section_id
  const customBySection: Record<string, any[]> = {}
  ;(customQuestions ?? []).forEach((q: any) => {
    if (!customBySection[q.section_id]) customBySection[q.section_id] = []
    customBySection[q.section_id].push(q)
  })

  return (
    <PlanDiagnosticoClient
      caseId={caseId}
      companyName={caseData.company_name}
      modules={sorted}
      initialOverrides={overridesMap}
      initialCustomBySection={customBySection}
    />
  )
}
