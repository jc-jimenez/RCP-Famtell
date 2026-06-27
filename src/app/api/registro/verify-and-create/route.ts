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

  // Buscar registro pendiente
  const { data: pending, error: fetchErr } = await (admin as any)
    .from('pending_registrations')
    .select('*')
    .eq('email', email)
    .single()

  if (fetchErr || !pending) {
    return NextResponse.json({ error: 'No se encontró un registro pendiente para este correo' }, { status: 404 })
  }

  // Validar código
  if (pending.whatsapp_code !== code) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
  }

  if (new Date(pending.whatsapp_expires_at) < new Date()) {
    return NextResponse.json({ error: 'El código ha expirado. Solicita uno nuevo.' }, { status: 400 })
  }

  // Crear usuario en Supabase Auth (con email_confirm: true — ya verificamos por WhatsApp)
  const { data: authData, error: authErr } = await (admin as any).auth.admin.createUser({
    email,
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

  // Crear cuenta con 100 créditos de bienvenida
  const { error: accountErr } = await (admin as any)
    .from('accounts')
    .insert({
      email,
      company_name: pending.empresa,
      plan_id: 'starter',
      credits_total: 100,
      credits_used: 0,
      status: 'active',
    })

  if (accountErr) {
    console.error('[registro/verify-and-create] account insert error:', accountErr)
    // No bloqueamos — la cuenta puede crearse después
  }

  // Limpiar registro pendiente
  await (admin as any).from('pending_registrations').delete().eq('email', email)

  return NextResponse.json({ ok: true })
}
