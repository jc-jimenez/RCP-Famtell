export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import AppShell from '@/components/shared/AppShell'
import PuestosPanel from '@/components/consultor/PuestosPanel'

// Modo soporte del super-admin: misma pantalla de puestos que ve el
// consultor, sin ser el dueño de la cuenta (sección 16 del PRD, Obs 3).
export default async function AdminCasoPuestosPage({
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

  const { data: positions } = await db
    .from('case_job_positions')
    .select('id, name, description, job_description, job_description_source_file, business_role_id, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  const { data: businessRoles } = await db
    .from('business_roles')
    .select('id, name')
    .order('sort_order', { ascending: true })

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <div className="max-w-3xl mx-auto mb-2 space-y-1">
        <Link href={`/admin/casos/${caseId}` as any} className="text-xs text-muted hover:text-ink">
          ← {caseData.company_name}
        </Link>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block">
          Modo soporte — editando el caso de otro consultor
        </p>
      </div>
      <PuestosPanel
        caseId={caseId}
        companyName={caseData.company_name}
        initialPositions={positions ?? []}
        businessRoles={businessRoles ?? []}
      />
    </AppShell>
  )
}
