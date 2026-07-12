import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

// El super-admin tiene acceso de soporte a los puestos de cualquier caso
// (sección 15 del PRD, Obs 1 ronda 2) — puede editar sin ser el dueño. Las
// mutaciones usan el cliente service-role porque RLS de case_job_positions
// solo permite al consultor dueño, no al super-admin.
async function verifyAccess(supabase: any, email: string, caseId: string) {
  if (isSuperAdminEmail(email)) return true
  const db = supabase as any
  const { data: account } = await db.from('accounts').select('id').eq('email', email).maybeSingle()
  if (!account) return false
  const { data: caseRow } = await db.from('cases').select('id').eq('id', caseId).eq('account_id', account.id).maybeSingle()
  return !!caseRow
}

// GET /api/consultant/case-job-positions?caseId=xxx — listar puestos del caso
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId requerido' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data, error } = await db
    .from('case_job_positions')
    .select('id, name, description, job_description, job_description_source_file, business_role_id, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ positions: data ?? [] })
}

// POST — crear puesto (descriptivo obligatorio)
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, name, description, jobDescription, jobDescriptionSourceFile, businessRoleId } = await req.json()
  if (!caseId || !name?.trim() || !jobDescription?.trim()) {
    return NextResponse.json({ error: 'caseId, name y jobDescription son requeridos' }, { status: 400 })
  }

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data, error } = await db
    .from('case_job_positions')
    .insert({
      case_id: caseId,
      name: name.trim(),
      description: description?.trim() || null,
      job_description: jobDescription.trim(),
      job_description_source_file: jobDescriptionSourceFile ?? null,
      business_role_id: businessRoleId ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ position: data })
}

// PATCH — editar nombre/descripción/descriptivo/rol de un puesto
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, positionId, name, description, jobDescription, jobDescriptionSourceFile, businessRoleId } = await req.json()
  if (!caseId || !positionId) return NextResponse.json({ error: 'caseId y positionId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description?.trim() || null
  if (jobDescription !== undefined) updates.job_description = jobDescription.trim()
  if (jobDescriptionSourceFile !== undefined) updates.job_description_source_file = jobDescriptionSourceFile
  if (businessRoleId !== undefined) updates.business_role_id = businessRoleId

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  const { data, error } = await db
    .from('case_job_positions')
    .update(updates)
    .eq('id', positionId)
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ position: data })
}

// DELETE — borrar puesto del catálogo del caso. Si ya tiene participantes
// asignados o respuestas de la encuesta de clima ligadas, se advierte antes
// (confirm: true para proceder) — no se bloquea el borrado.
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, positionId, confirm } = await req.json()
  if (!caseId || !positionId) return NextResponse.json({ error: 'caseId y positionId son requeridos' }, { status: 400 })

  const ok = await verifyAccess(supabase, session.user.email!, caseId)
  if (!ok) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  const db = admin as any

  if (!confirm) {
    const { count: occupants } = await db
      .from('case_users')
      .select('id', { count: 'exact', head: true })
      .eq('job_position_id', positionId)

    const { data: surveys } = await db.from('case_climate_surveys').select('id').eq('job_position_id', positionId)
    let climateResponses = 0
    if (surveys?.length) {
      const { count } = await db
        .from('case_climate_responses')
        .select('id', { count: 'exact', head: true })
        .in('survey_id', surveys.map((s: any) => s.id))
      climateResponses = count ?? 0
    }

    if ((occupants ?? 0) > 0 || climateResponses > 0) {
      const parts: string[] = []
      if (occupants) parts.push(`${occupants} participante${occupants !== 1 ? 's' : ''} asignado${occupants !== 1 ? 's' : ''} (quedarán sin puesto)`)
      if (climateResponses) parts.push(`${climateResponses} respuesta${climateResponses !== 1 ? 's' : ''} de la encuesta de clima ligada${climateResponses !== 1 ? 's' : ''} a este puesto (se borran)`)
      return NextResponse.json({
        needsConfirmation: true,
        message: `Este puesto tiene ${parts.join(' y ')}. ¿Confirmas que quieres eliminarlo?`,
      }, { status: 409 })
    }
  }

  await db.from('case_job_positions').delete().eq('id', positionId).eq('case_id', caseId)
  return NextResponse.json({ ok: true })
}
