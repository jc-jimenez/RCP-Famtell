export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

  if (!accountSid || !authToken) {
    console.error('[twilio] Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN')
    return false
  }

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

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
      console.error('[twilio] API error:', res.status, err)
      return false
    }
    return true
  } catch (e) {
    console.error('[twilio] sendWhatsApp error:', e)
    return false
  }
}
