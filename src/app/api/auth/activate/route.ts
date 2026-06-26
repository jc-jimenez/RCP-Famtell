import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

// GET /api/auth/activate?token=xxx — valida el token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Error interno' }, { status: 500 })

  const db = admin as any

  // Buscar en case_users por invitation_token (campo que agregaremos)
  const { data: caseUser, error } = await db
    .from('case_users')
    .select('id, role, case_id, cases(company_name), user_email:invitation_email')
    .eq('invitation_token', token)
    .is('activated_at', null)
    .maybeSingle()

  if (error || !caseUser) {
    return NextResponse.json({ error: 'Enlace inválido o ya utilizado' }, { status: 404 })
  }

  // Verificar que el token no haya expirado (48h)
  const { data: tokenData } = await db
    .from('case_users')
    .select('invitation_expires_at')
    .eq('invitation_token', token)
    .single()

  if (tokenData?.invitation_expires_at && new Date(tokenData.invitation_expires_at) < new Date()) {
    return NextResponse.json({ error: 'El enlace de invitación ha expirado (48 horas)' }, { status: 410 })
  }

  return NextResponse.json({
    email: caseUser.user_email,
    role: caseUser.role,
    caseCompanyName: caseUser.cases?.company_name ?? '',
  })
}

// POST /api/auth/activate — crea la cuenta y activa al usuario
export async function POST(request: Request) {
  const { token, password } = await request.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Error interno' }, { status: 500 })

  const db = admin as any

  // Obtener datos del token
  const { data: caseUser, error: fetchError } = await db
    .from('case_users')
    .select('id, role, case_id, invitation_email, invitation_expires_at')
    .eq('invitation_token', token)
    .is('activated_at', null)
    .maybeSingle()

  if (fetchError || !caseUser) {
    return NextResponse.json({ error: 'Enlace inválido o ya utilizado' }, { status: 404 })
  }

  if (caseUser.invitation_expires_at && new Date(caseUser.invitation_expires_at) < new Date()) {
    return NextResponse.json({ error: 'El enlace ha expirado' }, { status: 410 })
  }

  // Crear usuario en Supabase Auth
  const { data: authUser, error: createError } = await admin.auth.admin.createUser({
    email: caseUser.invitation_email,
    password,
    email_confirm: true,
  })

  if (createError || !authUser.user) {
    // Si ya existe el usuario, intentar obtenerlo
    if (createError?.message?.includes('already')) {
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find((u: any) => u.email === caseUser.invitation_email)
      if (!existing) {
        return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
      }

      // Vincular al case_user
      await db
        .from('case_users')
        .update({
          user_id: existing.id,
          activated_at: new Date().toISOString(),
          invitation_token: null,
        })
        .eq('id', caseUser.id)

      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: createError?.message ?? 'Error al crear la cuenta' }, { status: 500 })
  }

  // Vincular el user_id al case_user y marcar como activado
  const { error: updateError } = await db
    .from('case_users')
    .update({
      user_id: authUser.user.id,
      activated_at: new Date().toISOString(),
      invitation_token: null,
    })
    .eq('id', caseUser.id)

  if (updateError) {
    return NextResponse.json({ error: 'Error al activar la cuenta' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
