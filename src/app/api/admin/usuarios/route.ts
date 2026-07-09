import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return isSuperAdminEmail(session.user.email) ? session : null
}

function isBanned(user: any): boolean {
  const until = user?.banned_until
  if (!until) return false
  return new Date(until).getTime() > Date.now()
}

// GET — lista unificada de TODOS los usuarios de la plataforma (consultores,
// directivos, colaboradores), para soporte del super-admin. Combina
// auth.users con accounts (consultores, por email) y case_users (participantes).
export async function GET() {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const [{ data: authList }, { data: accounts }, { data: caseUsers }, { data: cases }, { data: businessRoles }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from('accounts').select('id, email, company_name, full_name, whatsapp_phone, plan_id, credits_total, credits_used, status'),
    db.from('case_users').select('id, user_id, role, job_title, case_id, business_role_id, full_name, whatsapp_phone').not('user_id', 'is', null),
    db.from('cases').select('id, company_name'),
    db.from('business_roles').select('id, name'),
  ])

  const roleNameById: Record<string, string> = {}
  ;(businessRoles ?? []).forEach((r: any) => { roleNameById[r.id] = r.name })

  const accountByEmail: Record<string, any> = {}
  ;(accounts ?? []).forEach((a: any) => { if (a.email) accountByEmail[a.email.toLowerCase()] = a })

  const caseUserByUserId: Record<string, any> = {}
  ;(caseUsers ?? []).forEach((cu: any) => { caseUserByUserId[cu.user_id] = cu })

  const caseNameById: Record<string, string> = {}
  ;(cases ?? []).forEach((c: any) => { caseNameById[c.id] = c.company_name })

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase()

  const users = (authList?.users ?? []).map((u: any) => {
    const email = (u.email ?? '').toLowerCase()
    const account = accountByEmail[email]
    const cu = caseUserByUserId[u.id]

    let kind: string = 'unknown'
    if (email && email === superAdminEmail) kind = 'super_admin'
    else if (account) kind = 'consultant'
    else if (cu) kind = cu.role // director | collaborator

    return {
      id: u.id,
      email: u.email,
      kind,
      banned: isBanned(u),
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      // Consultor (account)
      accountId: account?.id ?? null,
      companyName: account?.company_name ?? (cu ? caseNameById[cu.case_id] : null),
      plan: account?.plan_id ?? null,
      creditsBalance: account ? (account.credits_total ?? 0) - (account.credits_used ?? 0) : null,
      accountStatus: account?.status ?? null,
      // Participante (case_user)
      caseUserId: cu?.id ?? null,
      caseId: cu?.case_id ?? null,
      jobTitle: cu?.job_title ?? null,
      fullName: account?.full_name ?? cu?.full_name ?? null,
      whatsappPhone: account?.whatsapp_phone ?? cu?.whatsapp_phone ?? null,
      businessRole: cu?.business_role_id ? (roleNameById[cu.business_role_id] ?? null) : null,
    }
  })

  // Orden: super_admin, consultores, directivos, colaboradores, otros
  const rank: Record<string, number> = { super_admin: 0, consultant: 1, director: 2, collaborator: 3, unknown: 4 }
  users.sort((a: any, b: any) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || (a.email ?? '').localeCompare(b.email ?? ''))

  return NextResponse.json({ users })
}

// PATCH — acciones de soporte sobre un usuario:
//  action: 'ban' | 'unban' | 'reset_password' | 'set_credits'
export async function PATCH(req: Request) {
  const session = await assertSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { userId, action, accountId, credits, kind, caseUserId, fullName, email, whatsapp } = await req.json() as {
    userId?: string
    action: 'ban' | 'unban' | 'reset_password' | 'set_credits' | 'update_profile'
    accountId?: string
    credits?: number
    kind?: string
    caseUserId?: string
    fullName?: string
    email?: string
    whatsapp?: string
  }

  // No permitir que el super-admin se bloquee/resetee a sí mismo por accidente
  if (userId) {
    const { data: target } = await admin.auth.admin.getUserById(userId)
    if (target?.user?.email && isSuperAdminEmail(target.user.email) && (action === 'ban' || action === 'reset_password' || (action === 'update_profile' && email?.trim()))) {
      return NextResponse.json({ error: 'No puedes bloquear, resetear ni cambiar el correo de la cuenta de Super-Admin.' }, { status: 400 })
    }
  }

  if (action === 'ban') {
    if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' } as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, banned: true })
  }

  if (action === 'unban') {
    if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' } as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, banned: false })
  }

  if (action === 'reset_password') {
    if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    const tempPassword = `Bd-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 9000 + 1000)}`
    const { error } = await admin.auth.admin.updateUserById(userId, { password: tempPassword })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, tempPassword })
  }

  if (action === 'update_profile') {
    if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

    // Si cambió el correo, actualizarlo primero en auth (es la identidad de login)
    if (email?.trim()) {
      const { error: emailErr } = await admin.auth.admin.updateUserById(userId, { email: email.trim(), email_confirm: true })
      if (emailErr) return NextResponse.json({ error: emailErr.message }, { status: 400 })
    }

    if (kind === 'consultant') {
      if (!accountId) return NextResponse.json({ error: 'accountId requerido para consultores' }, { status: 400 })
      const updates: Record<string, unknown> = {}
      if (fullName !== undefined) updates.full_name = fullName?.trim() || null
      if (whatsapp !== undefined) updates.whatsapp_phone = whatsapp?.trim() || null
      if (email?.trim()) updates.email = email.trim()
      const { error } = await db.from('accounts').update(updates).eq('id', accountId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (kind === 'director' || kind === 'collaborator') {
      if (!caseUserId) return NextResponse.json({ error: 'caseUserId requerido para participantes' }, { status: 400 })
      const updates: Record<string, unknown> = {}
      if (fullName !== undefined) updates.full_name = fullName?.trim() || null
      if (whatsapp !== undefined) updates.whatsapp_phone = whatsapp?.trim() || null
      if (email?.trim()) updates.invitation_email = email.trim()
      const { error } = await db.from('case_users').update(updates).eq('id', caseUserId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'kind inválido para editar datos' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, fullName: fullName ?? null, email: email?.trim() ?? null, whatsappPhone: whatsapp ?? null })
  }

  if (action === 'set_credits') {
    if (!accountId || credits === undefined) {
      return NextResponse.json({ error: 'accountId y credits requeridos (solo aplica a consultores)' }, { status: 400 })
    }
    const { error } = await db.from('accounts')
      .update({ credits_total: credits, credits_used: 0 })
      .eq('id', accountId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, creditsBalance: credits })
  }

  return NextResponse.json({ error: 'action inválida' }, { status: 400 })
}
