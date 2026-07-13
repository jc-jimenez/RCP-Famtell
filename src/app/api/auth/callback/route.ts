export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

// Callback de login social (Google/Microsoft vía Supabase Auth). Intercambia
// el código PKCE por una sesión y, si el correo no tiene todavía cuenta de
// consultor NI es directivo/colaborador invitado a un caso, lo aprovisiona
// como consultor nuevo con 100 créditos — mismo trato que /registro, para
// que "Continuar con Google" también sirva como alta, no solo como login.
// No se toca nada si ya es consultor (accounts) o director/colaborador
// (case_users): ahí su rol real ya está resuelto por role-detection.ts.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const supabase = await createSupabaseServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  const admin = getSupabaseAdmin()

  if (user?.email && admin && !isSuperAdminEmail(user.email)) {
    const db = admin as any

    const { data: existingAccount } = await db
      .from('accounts')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    const { data: existingCaseUser } = await db
      .from('case_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingAccount && !existingCaseUser) {
      const displayName = (user.user_metadata?.full_name || user.user_metadata?.name || '') as string
      await db.from('accounts').insert({
        email: user.email,
        company_name: displayName,
        plan_id: 'starter',
        credits_total: 100,
        credits_used: 0,
        status: 'active',
      })
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
