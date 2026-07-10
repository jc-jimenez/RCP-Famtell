export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { detectUserRole, getRoleRedirect } from '@/lib/utils/role-detection'
import AppShell from '@/components/shared/AppShell'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { consultorOnboardingSteps } from '@/components/onboarding/consultorSteps'
import { directorOnboardingSteps } from '@/components/onboarding/directorSteps'
import { colaboradorOnboardingSteps } from '@/components/onboarding/colaboradorSteps'

// Relectura voluntaria del onboarding desde el menú — a diferencia del gate
// obligatorio de la primera vez (dashboard/caso/[id]/mis-modulos), aquí
// siempre se muestra y al terminar navega de regreso a tu pantalla de inicio.
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const context = await detectUserRole(supabase, session.user.id, session.user.email!)
  if (!context) redirect('/login')

  const homeHref = getRoleRedirect(context.role, context.caseId)

  if (context.role === 'consultant') {
    return (
      <AppShell role="consultant" email={session.user.email!}>
        <OnboardingWizard
          steps={consultorOnboardingSteps}
          dismissEndpoint="/api/onboarding/consultor"
          redirectTo={homeHref}
        />
      </AppShell>
    )
  }

  if (context.role === 'director' || context.role === 'collaborator') {
    return (
      <AppShell role={context.role} email={session.user.email!}>
        <OnboardingWizard
          steps={context.role === 'director' ? directorOnboardingSteps : colaboradorOnboardingSteps}
          dismissEndpoint="/api/onboarding/participante"
          dismissBody={{ caseId: context.caseId ?? '' }}
          redirectTo={homeHref}
        />
      </AppShell>
    )
  }

  redirect(homeHref as any)
}
