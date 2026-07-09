import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import mammoth from 'mammoth'
import { isSuperAdminEmail } from '@/lib/permissions'

export const runtime = 'nodejs'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function verifyAccess(supabase: any, email: string, caseId: string) {
  if (isSuperAdminEmail(email)) return true
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// POST — extraer el texto de un descriptivo de puesto subido como archivo
// (PDF, Word o texto plano), para que el consultor lo revise antes de
// guardarlo en job_description (el campo que ya usa el Brief IA — sección 15
// del PRD, Obs 5). No persiste el archivo binario, solo el texto extraído.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, attachment } = await request.json() as {
    caseId: string
    attachment: { base64: string; mimeType: string; fileName: string }
  }

  if (!caseId || !attachment) {
    return NextResponse.json({ error: 'caseId y attachment son requeridos' }, { status: 400 })
  }

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  try {
    if (attachment.mimeType === DOCX_MIME) {
      const buffer = Buffer.from(attachment.base64, 'base64')
      const { value: text } = await mammoth.extractRawText({ buffer })
      if (!text.trim()) return NextResponse.json({ error: 'El documento no tiene texto extraíble' }, { status: 400 })
      return NextResponse.json({ text: text.trim() })
    }

    if (attachment.mimeType === 'text/plain') {
      const text = Buffer.from(attachment.base64, 'base64').toString('utf-8')
      return NextResponse.json({ text: text.trim() })
    }

    if (attachment.mimeType === 'application/pdf') {
      const contentBlocks: ContentBlockParam[] = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: attachment.base64 },
        } as ContentBlockParam,
        {
          type: 'text',
          text: 'Transcribe TEXTUALMENTE el contenido de este documento (el descriptivo de un puesto de trabajo: funciones, responsabilidades, requisitos). No resumas, no comentes, no agregues nada tuyo. Si el documento tiene formato o secciones, consérvalas como texto plano. Responde ÚNICAMENTE con el texto transcrito.',
        },
      ]

      const response = await anthropic.messages.create({
        model: NOVA_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: contentBlocks as any }],
      })

      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      if (!text.trim()) return NextResponse.json({ error: 'No se pudo extraer texto del PDF' }, { status: 500 })
      return NextResponse.json({ text: text.trim() })
    }

    return NextResponse.json({ error: 'Formato no soportado. Usa PDF, Word (.docx) o texto plano (.txt).' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error al procesar el archivo' }, { status: 500 })
  }
}
