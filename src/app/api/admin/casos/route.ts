import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return isSuperAdminEmail(session.user.email) ? session : null
}

// POST — el super-admin crea un caso a nombre de un consultor (soporte/apoyo,
// Obs 4 ronda 2 del PRD). Mismo flujo que /api/cases del consultor, pero con
// accountId explícito en vez de derivarlo de la sesión.
export async function POST(req: Request) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { accountId, companyName, industry, description, strategicIntent, strategicNotes } = await req.json()

  if (!accountId) return NextResponse.json({ error: 'accountId requerido' }, { status: 400 })
  if (!companyName?.trim()) return NextResponse.json({ error: 'companyName es requerido' }, { status: 400 })

  const { data: account } = await db.from('accounts').select('id').eq('id', accountId).maybeSingle()
  if (!account) return NextResponse.json({ error: 'Consultor no encontrado' }, { status: 404 })

  const { data, error } = await db
    .from('cases')
    .insert({
      account_id: accountId,
      company_name: companyName.trim(),
      industry: industry ?? null,
      description: description ?? null,
      strategic_intent: strategicIntent ?? 'mixed',
      strategic_notes: strategicNotes?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ case: data })
}
