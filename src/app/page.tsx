import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { detectUserRole, getRoleRedirect } from '@/lib/utils/role-detection'

export default async function Home() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const context = await detectUserRole(supabase, session.user.id, session.user.email!)
  if (!context) redirect('/login')

  redirect(getRoleRedirect(context.role, context.caseId) as any)
}
