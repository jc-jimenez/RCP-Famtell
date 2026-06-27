export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const { email, code, password } = await request.json()

  if (!email || !code || !password) {
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

  // Verificar si el email ya fue verificado
  if (!pending.email_verified) {
    return NextResponse.json({
      ok: false,
      pendingEmail: true,
      message: 'WhatsApp verificado. Revisa tu correo y haz clic en el enlace de verificación para activar tu cuenta.',
    })
  }

  // Ambos verificados → crear cuenta
  return await createAccount(admin, pending, password)
}

async function createAccount(admin: any, pending: any, password: string) {
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: pending.email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre: pending.nombre,
      empresa: pending.empresa,
      phone: pending.phone,
      role: 'consultor',
    },
  })

  if (authErr || !authData?.user) {
    if (authErr?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'Este correo ya tiene una cuenta registrada' }, { status: 409 })
    }
    return NextResponse.json({ error: authErr?.message ?? 'No se pudo crear el usuario' }, { status: 500 })
  }

  await admin.from('accounts').insert({
    email: pending.email,
    company_name: pending.empresa,
    plan_id: 'starter',
    credits_total: 100,
    credits_used: 0,
    status: 'active',
  })

  // Limpiar registro pendiente
  await admin.from('pending_registrations').delete().eq('email', pending.email)

  return NextResponse.json({ ok: true, activated: true })
}
