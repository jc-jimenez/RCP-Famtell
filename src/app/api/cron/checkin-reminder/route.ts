import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/twilio'
import { getBaseUrl } from '@/lib/baseUrl'

// Llamado por Vercel Cron cada lunes a las 8AM (America/Mexico_City)
// Vercel env: CRON_SECRET para autenticar la llamada
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Traer todos los casos activos con email del consultor
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, company_name, accounts!inner(email, company_name)')
    .eq('status', 'active')

  if (error) {
    console.error('[cron/checkin-reminder] Error fetching cases:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { caseId: string; email: string; status: string }[] = []

  for (const c of (cases ?? [])) {
    const account = Array.isArray(c.accounts) ? c.accounts[0] : c.accounts
    const email = account?.email
    if (!email) continue

    // Insertar notificación en la tabla de notificaciones
    const { data: user } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    // Obtener user_id desde auth.users vía email
    const { data: authUser } = await supabase
      .from('accounts')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (!authUser) continue

    // Registrar notificación pendiente
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        case_id: c.id,
        user_id: authUser.id,
        channel: 'email',
        notification_type: 'checkin_reminder',
        status: 'pending',
      })

    if (notifError) {
      results.push({ caseId: c.id, email, status: `error: ${notifError.message}` })
      continue
    }

    // Enviar email vía Resend
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'noreply@bizdoctor.site',
          to: email,
          subject: `⚡ Check-in semanal — ${c.company_name}`,
          html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e">
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Check-in semanal 📋</h2>
  <p style="color:#555;margin-bottom:20px">
    Es lunes. Hora de registrar el avance semanal de <strong>${c.company_name}</strong>.
  </p>
  <a href="${getBaseUrl()}/caso/${c.id}/checkin"
     style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
    Registrar check-in →
  </a>
  <p style="margin-top:24px;font-size:12px;color:#999">
    www.bizdoctor.site · <a href="${getBaseUrl()}" style="color:#6366f1">www.bizdoctor.site</a>
  </p>
  <p style="margin-top:4px;font-size:11px;color:#bbb">
    www.bizdoctor.site es una solución desarrollada por StartLab Global Business Competence School
  </p>
</div>`,
        }),
      })

      if (resendRes.ok) {
        await supabase
          .from('notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('case_id', c.id)
          .eq('notification_type', 'checkin_reminder')
          .eq('status', 'pending')

        results.push({ caseId: c.id, email, status: 'sent' })

        // Enviar WhatsApp al directivo si tiene número registrado
        const { data: director } = await supabase
          .from('case_users')
          .select('whatsapp_phone')
          .eq('case_id', c.id)
          .eq('role', 'director')
          .not('whatsapp_phone', 'is', null)
          .maybeSingle()

        if (director?.whatsapp_phone) {
          const waMsg = `⚡ *Check-in semanal — ${c.company_name}*\n\nEs lunes. Hora de registrar el avance de esta semana.\n\n👉 ${getBaseUrl()}/caso/${c.id}/checkin`
          await sendWhatsApp(director.whatsapp_phone, waMsg)
        }
      } else {
        results.push({ caseId: c.id, email, status: 'email_failed' })
      }
    } catch (e: any) {
      results.push({ caseId: c.id, email, status: `exception: ${e.message}` })
    }
  }

  console.log('[cron/checkin-reminder] results:', results)
  return NextResponse.json({ ok: true, processed: results.length, results })
}
