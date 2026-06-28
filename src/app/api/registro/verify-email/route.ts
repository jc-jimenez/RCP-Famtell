export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { activateAccountIfReady } from '@/lib/registro/activate'

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

  const baseUrl = new URL(request.url).origin

  // Si WhatsApp también está verificado → activar la cuenta ahora mismo
  if (pending.whatsapp_verified) {
    const result = await activateAccountIfReady(admin, {
      ...pending,
      email_verified: true,
    })
    if (result.ok) {
      // Cuenta activada → página de éxito con CTA a login
      return NextResponse.redirect(new URL('/registro/email-verificado?activada=1', baseUrl))
    }
    // Si falló la activación, igual mostramos email verificado
  }

  // Email verificado pero falta el código de WhatsApp
  return NextResponse.redirect(new URL('/registro/email-verificado', baseUrl))
}
