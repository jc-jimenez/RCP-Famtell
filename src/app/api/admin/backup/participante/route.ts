import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'
import { buildParticipantBackupPdf } from '@/lib/participantBackup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// La auditoría de cobertura (una llamada a IA por módulo, en paralelo)
// midió ~50s reales con 5 módulos para un participante con transcripciones
// largas — dejamos margen. Si el plan de Vercel tiene un tope más bajo, esta
// ruta puede fallar por timeout con participantes muy avanzados; confirmar
// el límite real del plan si eso llega a pasar en producción.
export const maxDuration = 120

// GET /api/admin/backup/participante?caseId=xxx&caseUserId=yyy — PDF de
// TODO lo que este participante haya contestado hasta el momento, completado
// o no. Solo super-admin. Se genera y transmite directo, no se persiste.
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')
  const caseUserId = searchParams.get('caseUserId')
  if (!caseId || !caseUserId) return NextResponse.json({ error: 'caseId y caseUserId son requeridos' }, { status: 400 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  try {
    const pdfBuffer = await buildParticipantBackupPdf(admin, caseId, caseUserId)
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="respaldo-entrevistas-${caseUserId}.pdf"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error al generar el respaldo' }, { status: 500 })
  }
}
