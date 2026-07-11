export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import AppShell from '@/components/shared/AppShell'
import CasoTabs from '@/components/consultor/CasoTabs'
import GenerateCatalogPanel from '@/components/consultor/GenerateCatalogPanel'
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
    .select('id, company_name, case_type, department_name')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .maybeSingle()
  if (!caseData) redirect('/dashboard')

  // Catálogo completo — propio del caso si existe, si no el global
  const scope = await resolveCatalogScope(db, caseId)
  const modulesQuery = db.from('module_templates').select(`
      id, code, name, sort_order,
      sections (
        id, code, name, sort_order,
        questions (
          id, text, nova_hint, sort_order, is_active
        )
      )
    `)
  const { data: modules } = await applyCatalogScope(modulesQuery, scope, caseId).order('sort_order', { ascending: true })

  // Caso v2 (case_type definido) que todavía resuelve al catálogo global
  // porque no tiene filas propias — un caso legacy (case_type nulo) nunca
  // entra aquí, siempre ve el catálogo global directo como hoy.
  if (caseData.case_type && scope === 'global') {
    return (
      <AppShell role="consultant" email={session.user.email!} tabBar={<CasoTabs caseId={caseId} activeTab="plan" />}>
        <div className="max-w-3xl mx-auto py-10">
          <GenerateCatalogPanel
            caseId={caseId}
            companyName={caseData.company_name}
            caseType={caseData.case_type}
            departmentName={caseData.department_name}
          />
        </div>
      </AppShell>
    )
  }

  // Overrides del consultor para este caso
  const { data: overrides } = await db
    .from('case_question_overrides')
    .select('question_id, is_active, custom_text, job_position_ids')
    .eq('case_id', caseId)

  // Preguntas custom creadas por el consultor para este caso
  const { data: customQuestions } = await db
    .from('case_custom_questions')
    .select('id, section_id, text, nova_hint, sort_order, is_active, job_position_ids')
    .eq('case_id', caseId)

  // Catálogo de puestos de este caso (sección 7 del PRD)
  const { data: positions } = await db
    .from('case_job_positions')
    .select('id, name, description, job_description, job_description_source_file, business_role_id, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  const sorted = (modules ?? []).map((m: any) => ({
    ...m,
    sections: (m.sections ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((s: any) => ({
        ...s,
        questions: (s.questions ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })),
  }))

  const overridesMap: Record<string, { is_active: boolean; custom_text: string | null; job_position_ids: string[] }> = {}
  ;(overrides ?? []).forEach((o: any) => {
    overridesMap[o.question_id] = {
      is_active: o.is_active,
      custom_text: o.custom_text,
      job_position_ids: o.job_position_ids ?? [],
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
      initialPositions={positions ?? []}
      puestosHref={`/dashboard/caso/${caseId}/puestos`}
    />
  )
}
