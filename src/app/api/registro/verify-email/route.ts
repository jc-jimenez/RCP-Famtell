export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/registro?error=token_invalido', request.url))
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.redirect(new URL('/registro?error=config', request.url))
  }

  const { data: pending, error } = await (admin as any)
    .from('pending_registrations')
    .select('*')
    .eq('email_token', token)
    .single()

  if (error || !pending) {
    return NextResponse.redirect(new URL('/registro?error=token_invalido', request.url))
  }

  if (new Date(pending.email_token_expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/registro?error=token_expirado', request.url))
  }

  // Marcar email como verificado
  await (admin as any)
    .from('pending_registrations')
    .update({ email_verified: true })
    .eq('email_token', token)

  // Si WhatsApp también está verificado → crear cuenta directamente
  if (pending.whatsapp_verified && pending.password_hash) {
    // La cuenta se creará cuando haga verify-and-create,
    // solo redirigir a página de éxito de email
  }

  // Redirigir a página que indica que el email fue verificado
  const baseUrl = new URL(request.url).origin
  return NextResponse.redirect(new URL('/registro/email-verificado', baseUrl))
}
