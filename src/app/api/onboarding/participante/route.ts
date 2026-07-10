import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId } = await request.json()
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const db = supabase as any
  const { error } = await db
    .from('case_users')
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
