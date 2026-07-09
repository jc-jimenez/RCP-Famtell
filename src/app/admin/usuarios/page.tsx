import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import { isSuperAdminEmail } from '@/lib/permissions'
import UsuariosAdminClient from './UsuariosAdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsuariosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || !isSuperAdminEmail(session.user.email)) {
    redirect('/login')
  }

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <UsuariosAdminClient />
    </AppShell>
  )
}
