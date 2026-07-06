import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { sendWhatsApp } from '@/lib/twilio'
import { hasCapability } from '@/lib/permissions'

// POST — enviar WhatsApp manual a un participante del caso
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, phone, message } = await request.json()
  if (!caseId || !phone || !message) {
    return NextResponse.json({ error: 'caseId, phone y message son requeridos' }, { status: 400 })
  }

  const db = supabase as any

  // Verificar que es consultor del caso
  const { data: cu } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!hasCapability(cu?.role, 'send_manual_whatsapp')) {
    return NextResponse.json({ error: 'Solo el consultor puede enviar mensajes' }, { status: 403 })
  }

  const ok = await sendWhatsApp(phone, message)
  if (!ok) return NextResponse.json({ error: 'Error al enviar WhatsApp' }, { status: 500 })

  // Registrar en notificaciones
  await db.from('notifications').insert({
    case_id: caseId,
    user_id: session.user.id,
    channel: 'whatsapp',
    notification_type: 'manual_message',
    status: 'sent',
    sent_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
