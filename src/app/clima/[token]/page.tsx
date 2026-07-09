export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ClimaFormClient from './ClimaFormClient'

export default async function ClimaPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await (supabase as any).rpc('get_climate_survey_by_token', { p_token: token })
  if (!data?.length) notFound()
  const survey = data[0]

  return (
    <ClimaFormClient
      token={token}
      title={survey.title}
      companyName={survey.company_name}
      questions={survey.questions}
      status={survey.status}
    />
  )
}
