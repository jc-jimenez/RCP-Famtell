import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import crypto from 'crypto'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, email, role, jobTitle, permissions } = await request.json()

  if (!caseId || !email || !role) {
    return NextResponse.json({ error: 'caseId, email y role son requeridos' }, { status: 400 })
  }
  if (!['director', 'collaborator'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const db = supabase as any

  // Verificar que el caso pertenece al consultor
  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .single()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  // Verificar si ya fue invitado
  const { data: existing } = await db
    .from('case_users')
    .select('id')
    .eq('case_id', caseId)
    .eq('invitation_email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Este correo ya fue invitado al caso' }, { status: 409 })
  }

  // Generar token único
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  // Crear registro en case_users (sin user_id hasta que active)
  const { data: caseUser, error: insertError } = await db
    .from('case_users')
    .insert({
      case_id: caseId,
      user_id: null, // se asigna al activar la invitación
      role,
      job_title: jobTitle ?? null,
      permissions_json: permissions ?? null,
      invitation_email: email,
      invitation_token: token,
      invitation_expires_at: expiresAt,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Enviar email de invitación con Resend
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/activar/${token}`
  const roleLabel = role === 'director' ? 'Directivo' : 'Colaborador'

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Invitación a participar en el diagnóstico de ${caseData.company_name}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
          <h1 style="color: #38bdf8; font-size: 24px; margin-bottom: 4px;">RCP.ai</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Diagnóstico empresarial con inteligencia artificial</p>

          <hr style="border-color: #1e293b; margin: 24px 0;" />

          <h2 style="font-size: 18px; color: #f8fafc; margin-bottom: 8px;">Tienes una invitación</h2>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
            Fuiste invitado como <strong style="color: #f8fafc;">${roleLabel}</strong> para participar
            en el diagnóstico empresarial de <strong style="color: #f8fafc;">${caseData.company_name}</strong>.
          </p>

          ${jobTitle ? `<p style="color: #64748b; font-size: 13px;">Tu posición: ${jobTitle}</p>` : ''}

          <div style="margin: 32px 0; text-align: center;">
            <a href="${activationUrl}"
               style="background: #185FA5; color: #ffffff; padding: 14px 32px; border-radius: 12px;
                      text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
              Activar mi cuenta
            </a>
          </div>

          <p style="color: #475569; font-size: 12px; text-align: center;">
            Este enlace expira en 48 horas. Si no esperabas este correo, ignóralo.
          </p>
        </div>
      `,
    })
  } catch (emailError) {
    // El registro ya fue creado — notificar pero no fallar
    console.error('Error enviando email:', emailError)
    return NextResponse.json({
      caseUser,
      warning: 'Usuario registrado pero el email no pudo enviarse',
      activationUrl, // Devolver URL para compartir manualmente
    })
  }

  return NextResponse.json({ caseUser, activationUrl })
}
