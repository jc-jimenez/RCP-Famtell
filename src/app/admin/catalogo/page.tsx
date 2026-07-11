export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import CatalogoAdminClient from './CatalogoAdminClient'
import { isSuperAdminEmail } from '@/lib/permissions'

export default async function CatalogoAdminPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) redirect('/login')

  const db = supabase as any
  // Catálogo global editable — explícitamente case_id nulo, nunca mezcla
  // catálogos propios de casos (v2).
  const { data: modules } = await db
    .from('module_templates')
    .select(`
      id, code, name, description, sort_order, is_active,
      sections (
        id, code, name, sort_order, suggested_roles,
        questions (
          id, text, nova_hint, sort_order, suggested_roles, response_type, is_active
        )
      )
    `)
    .is('case_id', null)
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

  // Catálogo global de roles de negocio — reemplaza la lista hardcodeada de
  // "roles sugeridos" (sección 16 del PRD, Obs 2)
  const { data: businessRoles } = await db
    .from('business_roles')
    .select('id, name')
    .order('sort_order', { ascending: true })

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <CatalogoAdminClient initialModules={sorted} businessRoles={businessRoles ?? []} />
    </AppShell>
  )
}
