export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  const { email, phone, nombre, empresa, password } = await request.json()

  if (!email || !phone || !nombre || !empresa || !password) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const phoneClean = phone.replace(/\D/g, '')
  if (phoneClean.length < 10) {
    return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 })
  }

  const adminCheck = getSupabaseAdmin()
  if (!adminCheck) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
  }

  // Rechazar si el correo ya tiene una cuenta activa (evita el "éxito" engañoso más adelante)
  const { data: existingUsersData } = await (adminCheck as any).auth.admin.listUsers({ perPage: 1000 })
  const alreadyRegistered = existingUsersData?.users?.some(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  )
  if (alreadyRegistered) {
    return NextResponse.json(
      { error: 'Este correo ya está registrado. Inicia sesión o usa "Olvidé mi contraseña".' },
      { status: 409 }
    )
  }

  // El campo whatsapp_code/whatsapp_expires_at se reutiliza como el código de
  // verificación genérico — ya no se manda por WhatsApp (Twilio no es
  // confiable para primer contacto con números nuevos, ver commit anterior),
  // se manda por correo con Resend, que ya es el canal probado de este mismo
  // flujo. El teléfono se sigue pidiendo y guardando tal cual — no se
  // verifica por ahora, queda pendiente para cuando se resuelva WhatsApp.
  const code = generateCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min

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
      password,
      whatsapp_code: code,
      whatsapp_expires_at: expires.toISOString(),
      whatsapp_verified: false,
      email_verified: true, // ya no hay un paso de verificación de correo aparte
    }, { onConflict: 'email' })

  if (error) {
    console.error('[registro/send-code]', error)
    return NextResponse.json({ error: 'No se pudo guardar el registro' }, { status: 500 })
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Tu código de verificación: ${code} — www.bizdoctor.site`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; color: #0f172a; margin-bottom: 8px;">
          www.bizdoctor<span style="color: #6366f1;">.site</span>
        </h1>
        <p style="color: #64748b; margin-bottom: 24px;">Diagnóstico empresarial con inteligencia artificial</p>

        <h2 style="font-size: 18px; color: #0f172a;">Hola ${nombre},</h2>
        <p style="color: #475569; line-height: 1.6;">
          Este es tu código de verificación para completar tu registro en www.bizdoctor.site:
        </p>

        <p style="margin: 28px 0; padding: 16px 24px; background: #f1f5f9; border-radius: 10px;
                   text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
          ${code}
        </p>

        <p style="color: #94a3b8; font-size: 13px;">
          Este código es válido por 10 minutos. Si no creaste una cuenta en www.bizdoctor.site, ignora este mensaje.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 12px;">
          GoNextSales S.A. de C.V. · www.bizdoctor.site
        </p>
        <p style="color: #e2e8f0; font-size: 11px;">
          www.bizdoctor.site es una solución desarrollada por StartLab Global Business Competence School
        </p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
