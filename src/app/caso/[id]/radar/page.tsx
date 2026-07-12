export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import CasoTabs from '@/components/consultor/CasoTabs'
import RadarClient from './RadarClient'

export default async function RadarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    .select('id, company_name, industry')
    .eq('id', id)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseData) redirect('/dashboard')

  const hasDenueToken = !!(process.env.NEXT_PUBLIC_DENUE_TOKEN || process.env.DENUE_TOKEN)

  return (
    <AppShell role="consultant" email={session.user.email!} caseCompanyName={caseData.company_name} tabBar={<CasoTabs caseId={id} activeTab="radar" />}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">{caseData.company_name}</h1>
            {caseData.industry && <p className="text-sm text-muted">{caseData.industry}</p>}
          </div>
        </div>

        {!hasDenueToken ? (
          <div className="card p-8 text-center space-y-3">
            <p className="text-2xl">🔑</p>
            <p className="text-sm font-semibold text-ink">Configura el token DENUE</p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Para usar el Radar de Prospectos necesitas un token gratuito del INEGI.
            </p>
            <ol className="text-xs text-left text-muted max-w-xs mx-auto space-y-1 mt-2">
              <li>1. Ve a <span className="font-mono text-accent">inegi.org.mx/app/api/denue</span></li>
              <li>2. Registra tu email y obtén el token</li>
              <li>3. En Vercel agrega la variable <span className="font-mono">DENUE_TOKEN</span></li>
              <li>4. Redeploy y listo</li>
            </ol>
          </div>
        ) : (
          <RadarClient caseId={id} companyName={caseData.company_name} />
        )}
      </div>
    </AppShell>
  )
}
