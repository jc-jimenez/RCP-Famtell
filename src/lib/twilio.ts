import twilio from 'twilio'

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

  if (!accountSid || !authToken) {
    console.error('[twilio] Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN')
    return false
  }

  const client = twilio(accountSid, authToken)
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  try {
    await client.messages.create({ from, to: toFormatted, body })
    return true
  } catch (e) {
    console.error('[twilio] sendWhatsApp error:', e)
    return false
  }
}
