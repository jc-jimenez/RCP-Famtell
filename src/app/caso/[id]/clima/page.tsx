export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import ClimaClient from './ClimaClient'

export default async function ClimaPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Solo el consultor dueño gestiona la encuesta de clima (mismo criterio que Tablas)
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .eq('id', caseData.account_id)
    .maybeSingle()

  if (!account) redirect('/dashboard')

  const { data: surveys } = await db
    .from('case_climate_surveys')
    .select('id, token, title, questions, status, created_at')
    .eq('case_id', id)
    .order('created_at', { ascending: false })

  return (
    <ClimaClient
      caseId={id}
      companyName={caseData.company_name}
      email={session.user.email!}
      initialSurveys={surveys ?? []}
    />
  )
}
