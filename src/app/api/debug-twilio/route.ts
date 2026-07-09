export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

function info(v: string | undefined) {
  if (!v) return { exists: false, length: 0, prefix: null }
  return { exists: true, length: v.length, prefix: v.slice(0, 6) }
}

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    TWILIO_ACCOUNT_SID: info(process.env.TWILIO_ACCOUNT_SID),
    TWILIO_AUTH_TOKEN: info(process.env.TWILIO_AUTH_TOKEN),
    TWILIO_WHATSAPP_FROM: info(process.env.TWILIO_WHATSAPP_FROM),
  })
}
