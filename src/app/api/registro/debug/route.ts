export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

// ENDPOINT TEMPORAL DE DIAGNÓSTICO — eliminar después del fix.
// Solo expone si las env vars existen y un prefijo corto, nunca el valor completo.
export async function GET() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  return NextResponse.json({
    deployedCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
    runtime: 'nodejs',
    twilio: {
      TWILIO_ACCOUNT_SID: {
        exists: !!sid,
        length: sid?.length ?? 0,
        prefix: sid?.slice(0, 2) ?? null,
        startsWithAC: sid?.startsWith('AC') ?? false,
      },
      TWILIO_AUTH_TOKEN: {
        exists: !!token,
        length: token?.length ?? 0,
      },
      TWILIO_WHATSAPP_FROM: {
        exists: !!from,
        value: from ?? null,
      },
    },
    // Lista todas las keys que empiezan con TWILIO para detectar typos / espacios
    twilioKeysFound: Object.keys(process.env).filter((k) =>
      k.toUpperCase().includes('TWILIO')
    ),
  })
}
