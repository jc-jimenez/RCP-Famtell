export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { activateAccountIfReady } from '@/lib/registro/activate'

export async function POST(request: Request) {
  const { email, code } = await request.json()

  if (!email || !code) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
  }

  const { data: pending, error: fetchErr } = await (admin as any)
    .from('pending_registrations')
    .select('*')
    .eq('email', email)
    .single()

  if (fetchErr || !pending) {
    return NextResponse.json({ error: 'No se encontró un registro pendiente para este correo' }, { status: 404 })
  }

  // Validar código WhatsApp
  if (pending.whatsapp_code !== code) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
  }

  if (new Date(pending.whatsapp_expires_at) < new Date()) {
    return NextResponse.json({ error: 'El código ha expirado. Solicita uno nuevo.' }, { status: 400 })
  }

  // Marcar WhatsApp como verificado
  await (admin as any)
    .from('pending_registrations')
    .update({ whatsapp_verified: true })
    .eq('email', email)

  // Si el email aún no está verificado → pedir verificación de correo
  if (!pending.email_verified) {
    return NextResponse.json({
      ok: false,
      pendingEmail: true,
      message: 'WhatsApp verificado. Revisa tu correo y haz clic en el enlace de verificación para activar tu cuenta.',
    })
  }

  // Ambos verificados → activar cuenta (con el password guardado en send-code)
  const result = await activateAccountIfReady(admin, { ...pending, whatsapp_verified: true })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, activated: true })
}
