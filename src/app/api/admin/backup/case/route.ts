import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import { buildCaseBackup } from '@/lib/caseBackup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/admin/backup/case?caseId=xxx — respaldo manual bajo demanda,
// solo super-admin. Se genera y transmite directo, no se persiste en
// Storage (a diferencia del PDF automático por módulo).
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  try {
    const backup = await buildCaseBackup(admin, caseId)
    const filename = `respaldo-${backup.case.company_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error al generar el respaldo' }, { status: 500 })
  }
}
