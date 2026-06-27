export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * Ruta de entrada para directivos — detecta su caso activo y redirige a /caso/[id]
 * Si tiene más de un caso, redirige al más reciente.
 */
export default async function MiCasoRedirectPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseUser } = await db
    .from('case_users')
    .select('case_id, role')
    .eq('user_id', session.user.id)
    .eq('role', 'director')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!caseUser) redirect('/login')

  redirect(`/caso/${caseUser.case_id}`)
}
