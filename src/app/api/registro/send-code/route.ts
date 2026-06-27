import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendWhatsApp } from '@/lib/twilio'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  const { email, phone, nombre, empresa } = await request.json()

  if (!email || !phone || !nombre || !empresa) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const phoneClean = phone.replace(/\D/g, '')
  if (phoneClean.length < 10) {
    return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 })
  }

  const code = generateCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
  }

  const { error } = await (admin as any)
    .from('pending_registrations')
    .upsert({
      email,
      phone: phoneClean,
      nombre,
      empresa,
      whatsapp_code: code,
      whatsapp_expires_at: expires.toISOString(),
      whatsapp_verified: false,
    }, { onConflict: 'email' })

  if (error) {
    console.error('[registro/send-code]', error)
    return NextResponse.json({ error: 'No se pudo guardar el registro' }, { status: 500 })
  }

  // Formato internacional México: +52 + 10 dígitos
  const toPhone = phoneClean.length === 10 ? `+52${phoneClean}` : `+${phoneClean}`
  const body = `Tu código de verificación RCP.ai es: *${code}*\n\nVálido por 10 minutos.`

  const sent = await sendWhatsApp(toPhone, body)
  if (!sent) {
    return NextResponse.json({ error: 'No se pudo enviar el código por WhatsApp' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
