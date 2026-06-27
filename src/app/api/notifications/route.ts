import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('id,notification_type,channel,status,sent_at,created_at,case_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ notifications: [] })
  return NextResponse.json({ notifications: data ?? [] })
}
