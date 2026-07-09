export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import CasoTabs from '@/components/consultor/CasoTabs'
import PuestosPanel from '@/components/consultor/PuestosPanel'

export default async function CasoPuestosPage({
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
    <AppShell role="consultant" email={session.user.email!} tabBar={<CasoTabs caseId={caseId} activeTab="puestos" />}>
      <div className="max-w-3xl mx-auto mb-2">
        <Link href={`/dashboard/caso/${caseId}?tab=diagnostico` as any} className="text-xs text-muted hover:text-ink">
          ← {caseData.company_name}
        </Link>
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
