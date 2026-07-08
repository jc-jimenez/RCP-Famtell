export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import CheckinClient from './CheckinClient'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, account_id')
    .eq('id', id)
    .single()

  if (!caseData) redirect('/dashboard')

  const { data: caseUser } = await db
    .from('case_users')
    .select('role, job_title')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  // Acceso: miembro del caso (director/colaborador) o consultor dueño
  let role: 'director' | 'collaborator' | 'consultant' | undefined = caseUser?.role
  if (!role && caseData.account_id) {
    const { data: account } = await db
      .from('accounts')
      .select('id')
      .eq('email', session.user.email)
      .eq('id', caseData.account_id)
      .maybeSingle()
    if (account) role = 'consultant'
  }

  if (!role) redirect('/dashboard')

  const { data: checkins } = await db
    .from('check_ins')
    .select('*')
    .eq('case_id', id)
    .order('week_number', { ascending: false })

  return (
    <CheckinClient
      caseId={id}
      companyName={caseData.company_name}
      role={role}
      email={session.user.email!}
      initialCheckins={checkins ?? []}
    />
  )
}
