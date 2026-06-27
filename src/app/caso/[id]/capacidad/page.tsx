export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import CapacidadClient from './CapacidadClient'

export default async function CapacidadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseUser } = await db
    .from('case_users')
    .select('role, job_title')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', id)
    .single()

  if (!caseData || !caseUser) redirect('/login')

  const role = caseUser.role as 'director' | 'collaborator' | 'consultant'

  return (
    <CapacidadClient
      caseId={id}
      companyName={caseData.company_name}
      role={role}
      email={session.user.email!}
    />
  )
}
