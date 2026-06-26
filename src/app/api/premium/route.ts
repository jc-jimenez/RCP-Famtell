import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabase as any

  // Obtener la cuenta del consultor
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) return NextResponse.json({ modules: [], cases: [] })

  // Módulos premium activados para esta cuenta
  const { data: premiumModules } = await db
    .from('premium_modules')
    .select('module_code, activated_at')
    .eq('account_id', account.id)

  // Casos activos del consultor
  const { data: cases } = await db
    .from('cases')
    .select('id, company_name, industry')
    .eq('account_id', account.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return NextResponse.json({
    modules: premiumModules ?? [],
    cases: cases ?? [],
  })
}
