import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return session.user.email === process.env.SUPER_ADMIN_EMAIL ? session : null
}

export async function POST(req: Request) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { accountId, moduleCode } = await req.json()
  if (!accountId || !moduleCode) return NextResponse.json({ error: 'accountId y moduleCode requeridos' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await (admin as any)
    .from('premium_modules')
    .insert({ account_id: accountId, module_code: moduleCode })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ module: data })
}

export async function DELETE(req: Request) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { accountId, moduleCode } = await req.json()
  if (!accountId || !moduleCode) return NextResponse.json({ error: 'accountId y moduleCode requeridos' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { error } = await (admin as any)
    .from('premium_modules')
    .delete()
    .eq('account_id', accountId)
    .eq('module_code', moduleCode)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
