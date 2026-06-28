export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

  if (!accountSid || !authToken) {
    console.error('[twilio] Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN')
    return false
  }

  // México móvil: WhatsApp usa +521XXXXXXXXXX (no +52)
  let toE164 = to
  if (!to.startsWith('whatsapp:') && !to.startsWith('+')) {
    const digits = to.replace(/\D/g, '')
    toE164 = digits.length === 10 ? `+521${digits}` : `+${digits}`
  }
  const toFormatted = toE164.startsWith('whatsapp:') ? toE164 : `whatsapp:${toE164}`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  // btoa funciona en Edge y Node.js (no Buffer)
  const credentials = btoa(`${accountSid}:${authToken}`)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: toFormatted, Body: body }).toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[twilio] API error:', res.status, err.slice(0, 300))
      return false
    }
    return true
  } catch (e) {
    console.error('[twilio] sendWhatsApp error:', e)
    return false
  }
}
