import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken  = process.env.TWILIO_AUTH_TOKEN!
const from       = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

export const twilioClient = twilio(accountSid, authToken)

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  try {
    await twilioClient.messages.create({ from, to: toFormatted, body })
    return true
  } catch (e) {
    console.error('[twilio] sendWhatsApp error:', e)
    return false
  }
}
