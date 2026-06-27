export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendWhatsApp } from '@/lib/twilio'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import crypto from 'crypto'

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

  const whatsappCode = generateCode()
  const emailToken = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min para WhatsApp
  const emailExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h para email

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
      whatsapp_code: whatsappCode,
      whatsapp_expires_at: expires.toISOString(),
      whatsapp_verified: false,
      email_token: emailToken,
      email_token_expires_at: emailExpires.toISOString(),
      email_verified: false,
    }, { onConflict: 'email' })

  if (error) {
    console.error('[registro/send-code]', error)
    return NextResponse.json({ error: 'No se pudo guardar el registro' }, { status: 500 })
  }

  // 1. Enviar código por WhatsApp
  const toPhone = phoneClean.length === 10 ? `+52${phoneClean}` : `+${phoneClean}`
  const waMsg = `Tu código de verificación RCP.ai es: *${whatsappCode}*\n\nVálido por 10 minutos.`
  const waSent = await sendWhatsApp(toPhone, waMsg)
  if (!waSent) {
    return NextResponse.json({ error: 'No se pudo enviar el código por WhatsApp' }, { status: 502 })
  }

  // 2. Enviar email de verificación
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rcp.gonextsales.com'
  const verifyUrl = `${baseUrl}/api/registro/verify-email?token=${emailToken}`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verifica tu correo — RCP.ai',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; color: #0f172a; margin-bottom: 8px;">
          RCP<span style="color: #6366f1;">.ai</span>
        </h1>
        <p style="color: #64748b; margin-bottom: 24px;">Diagnóstico empresarial con inteligencia artificial</p>

        <h2 style="font-size: 18px; color: #0f172a;">Hola ${nombre},</h2>
        <p style="color: #475569; line-height: 1.6;">
          Para completar tu registro en RCP.ai necesitamos verificar tu correo electrónico.
          Haz clic en el botón a continuación:
        </p>

        <a href="${verifyUrl}"
           style="display: inline-block; margin: 24px 0; padding: 12px 32px;
                  background: #6366f1; color: white; border-radius: 8px;
                  text-decoration: none; font-weight: 600; font-size: 15px;">
          Verificar correo electrónico
        </a>

        <p style="color: #94a3b8; font-size: 13px;">
          Este enlace es válido por 24 horas. Si no creaste una cuenta en RCP.ai, ignora este mensaje.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 12px;">
          GoNextSales S.A. de C.V. · RCP.ai
        </p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
