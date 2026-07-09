export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import PlanDiagnosticoClient from '@/app/dashboard/caso/[id]/plan/PlanDiagnosticoClient'

// Modo soporte del super-admin: mismo Plan de Diagnóstico que ve el consultor
// (puestos del caso + asignación puesto↔pregunta), sin ser el dueño de la
// cuenta. Ver sección 15 del PRD, Obs 1 ronda 2.
export default async function AdminCasoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: caseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) redirect('/login')

  const admin = getSupabaseAdmin()
  if (!admin) redirect('/admin/casos')
  const db = admin as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', caseId)
    .maybeSingle()
  if (!caseData) redirect('/admin/casos')

  const { data: modules } = await db
    .from('module_templates')
    .select(`
      id, code, name, sort_order,
      sections (
        id, code, name, sort_order,
        questions (
          id, text, nova_hint, sort_order, is_active
        )
      )
    `)
    .order('sort_order', { ascending: true })

  const { data: overrides } = await db
    .from('case_question_overrides')
    .select('question_id, is_active, custom_text, job_position_ids')
    .eq('case_id', caseId)

  const { data: customQuestions } = await db
    .from('case_custom_questions')
    .select('id, section_id, text, nova_hint, sort_order, is_active, job_position_ids')
    .eq('case_id', caseId)

  const { data: positions } = await db
    .from('case_job_positions')
    .select('id, name, description, job_description, job_description_source_file, business_role_id, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  const { data: businessRoles } = await db
    .from('business_roles')
    .select('id, name')
    .order('sort_order', { ascending: true })

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
      businessRoles={businessRoles ?? []}
      role="super_admin"
      backHref="/admin/casos"
    />
  )
}
