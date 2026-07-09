import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

export const runtime = 'nodejs'

// GET /api/modules/backup?caseId=xxx&moduleCode=M1 — descarga el PDF de
// respaldo de un módulo completado. Solo el consultor dueño del caso o el
// super-admin (soporte) pueden descargarlo — es un respaldo de trabajo de
// campo, no un entregable para directivos/colaboradores.
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  const moduleCode = searchParams.get('moduleCode')
  if (!caseId || !moduleCode) return NextResponse.json({ error: 'caseId y moduleCode son requeridos' }, { status: 400 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const isSuperAdmin = isSuperAdminEmail(session.user.email)
  if (!isSuperAdmin) {
    const { data: caseRow } = await db.from('cases').select('account_id').eq('id', caseId).maybeSingle()
    const { data: account } = caseRow
      ? await db.from('accounts').select('id').eq('id', caseRow.account_id).eq('email', session.user.email).maybeSingle()
      : { data: null }
    if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: moduleRow } = await db
    .from('modules')
    .select('backup_pdf_path')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .maybeSingle()

  if (!moduleRow?.backup_pdf_path) return NextResponse.json({ error: 'Sin PDF de respaldo para este módulo' }, { status: 404 })

  const { data: file, error } = await db.storage.from('module-backups').download(moduleRow.backup_pdf_path)
  if (error || !file) return NextResponse.json({ error: 'No se pudo leer el PDF' }, { status: 500 })

  const buffer = Buffer.from(await file.arrayBuffer())
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${moduleCode}-respaldo.pdf"`,
    },
  })
}
