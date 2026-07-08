import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

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

  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', session.user.email).maybeSingle()
  if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { data: caseData } = await db.from('cases').select('id, company_name').eq('id', caseId).eq('account_id', account.id).single()
  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  const { data: existing } = await db.from('case_users').select('id').eq('case_id', caseId).or(`invitation_email.eq.${email}`).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Este correo ya está registrado en este caso' }, { status: 409 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const adminDb = admin as any
  const { data: caseUser, error: insertError } = await adminDb
    .from('case_users')
    .insert({
      case_id: caseId,
      user_id: authData.user.id,
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
