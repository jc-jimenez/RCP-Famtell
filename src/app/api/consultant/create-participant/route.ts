import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST — alta directa de un participante (Obs 3): el consultor fija la
// contraseña de una vez, sin pasar por el flujo de invitación por correo.
// Obligatorios: email, whatsappPhone, password. El usuario queda activo de
// inmediato (activated_at = now()).
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const {
    caseId, email, password, role, jobPositionId, jobTitle, businessRoleId,
    permissions, fullName, whatsappPhone, landlinePhone, seniority,
  } = await req.json()

  if (!caseId || !email || !password || !role) {
    return NextResponse.json({ error: 'caseId, email, password y role son requeridos' }, { status: 400 })
  }
  if (!whatsappPhone?.trim()) {
    return NextResponse.json({ error: 'WhatsApp es obligatorio' }, { status: 400 })
  }
  if (!jobPositionId) {
    return NextResponse.json({ error: 'Debes asignar un puesto del catálogo del caso' }, { status: 400 })
  }
  if (!['director', 'collaborator'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  let caseData: { id: string; company_name: string } | null = null

  if (isSuperAdminEmail(session.user.email)) {
    const { data } = await db.from('cases').select('id, company_name').eq('id', caseId).maybeSingle()
    caseData = data
  } else {
    const { data: account } = await db.from('accounts').select('id').eq('email', session.user.email).maybeSingle()
    if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const { data } = await db.from('cases').select('id, company_name').eq('id', caseId).eq('account_id', account.id).maybeSingle()
    caseData = data
  }
  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  const { data: existing } = await db.from('case_users').select('id').eq('case_id', caseId).or(`invitation_email.eq.${email}`).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Este correo ya está registrado en este caso' }, { status: 409 })

  // La misma persona (mismo correo) puede participar en varios casos —
  // auth.users es una sola tabla global en Supabase, así que si el correo
  // ya tiene cuenta (de otro caso), se reutiliza esa cuenta en vez de
  // fallar. Mismo criterio que ya usa /api/auth/activate para el flujo de
  // invitación por correo.
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  let userId: string
  if (authErr || !authData.user) {
    if (!authErr?.message?.includes('already')) {
      return NextResponse.json({ error: authErr?.message ?? 'Error al crear la cuenta' }, { status: 400 })
    }
    const { data: { users } } = await admin.auth.admin.listUsers()
    const existingUser = users.find((u: any) => u.email === email)
    if (!existingUser) return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
    userId = existingUser.id
  } else {
    userId = authData.user.id
  }

  const adminDb = admin as any
  const { data: caseUser, error: insertError } = await adminDb
    .from('case_users')
    .insert({
      case_id: caseId,
      user_id: userId,
      role,
      job_title: jobTitle ?? null,
      job_position_id: jobPositionId,
      business_role_id: businessRoleId ?? null,
      permissions_json: permissions ?? null,
      invitation_email: email,
      full_name: fullName?.trim() || null,
      whatsapp_phone: whatsappPhone.trim(),
      landline_phone: landlinePhone?.trim() || null,
      seniority: seniority?.trim() || null,
      activated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ caseUser })
}
