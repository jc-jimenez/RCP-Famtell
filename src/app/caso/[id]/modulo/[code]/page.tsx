export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { ensureModulesInitialized } from '@/lib/modules'
import ModuleStartClient from './ModuleStartClient'
import type { ModuleCode } from '@/types'

const MODULE_LABELS: Record<ModuleCode, string> = {
  M1: 'Radiografía Comercial',
  M2: 'Radiografía Operativa',
  M3: 'Base de Contactos',
  M4: 'Radiografía Financiera',
  M5: 'Radiografía Competitiva',
  M6: 'Radiografía Interna',
  M7: 'Síntesis y Plan RCP',
}

const MODULE_DESCRIPTIONS: Record<ModuleCode, string> = {
  M1: 'Vamos a entender el origen real de tus ingresos, el estado actual de tu base de clientes y cómo opera tu modelo comercial. Nova te guiará con preguntas una a la vez.',
  M2: 'Mapearemos tus procesos operativos, capacidad instalada y los principales cuellos de botella que afectan tu eficiencia.',
  M3: 'Identificaremos los 30 contactos clave de tu red: clientes, prospectos y aliados estratégicos. Serán la base de tu CRM.',
  M4: 'Analizaremos tu situación financiera: rentabilidad, deuda, flujo de caja y capacidad de inversión. Toda la información es confidencial.',
  M5: 'Mapearemos a tus competidores, tu posicionamiento en el mercado CTT y las oportunidades que aún no estás aprovechando.',
  M6: 'Evaluaremos tu estructura organizacional, cultura, liderazgo y las brechas de talento que limitan tu crecimiento.',
  M7: 'Consolidaremos todos los hallazgos en un diagnóstico completo y un Plan RCP de 90 días. Este módulo genera tu Brief final.',
}

const MODULE_DURATION: Record<ModuleCode, string> = {
  M1: '20-35 minutos',
  M2: '20-30 minutos',
  M3: '25-40 minutos',
  M4: '30-45 minutos',
  M5: '20-30 minutos',
  M6: '25-40 minutos',
  M7: '15-25 minutos',
}

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ id: string; code: string }>
}) {
  const { id: caseId, code } = await params
  const moduleCode = code.toUpperCase() as ModuleCode

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  // Verificar acceso al caso
  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!caseUser) redirect('/login')

  // Verificar que el módulo esté activo o completado
  const { data: moduleData } = await db
    .from('modules')
    .select('status, session_id')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .maybeSingle()

  // Si no existe el módulo aún (caso nuevo), inicializar todos
  if (!moduleData) {
    await ensureModulesInitialized(db, caseId)
  }

  const status = moduleData?.status ?? 'active'
  if (status === 'locked') redirect(`/caso/${caseId}`)

  // Cargar sesión existente si hay
  let existingSession = null
  if (moduleData?.session_id) {
    const { data: sess } = await db
      .from('sessions')
      .select('id, messages')
      .eq('id', moduleData.session_id)
      .single()
    existingSession = sess
  }

  const label = MODULE_LABELS[moduleCode] ?? moduleCode
  const description = MODULE_DESCRIPTIONS[moduleCode] ?? ''
  const duration = MODULE_DURATION[moduleCode] ?? '20-30 minutos'
  const isCompleted = status === 'completed'

  // Para M6: cargar sesiones de colaboradores
  let collaboratorVoices: any[] = []
  if (moduleCode === 'M6') {
    const { data: collabSessions } = await db
      .from('sessions')
      .select('id, messages, completed, last_message_at, user_id')
      .eq('case_id', caseId)
      .eq('module_code', 'M6')
      .neq('user_id', session.user.id)

    if (collabSessions?.length) {
      const collabUserIds = collabSessions.map((s: any) => s.user_id)
      const { data: collabUsers } = await db
        .from('case_users')
        .select('user_id, job_title, invitation_email')
        .eq('case_id', caseId)
        .in('user_id', collabUserIds)

      const userMap: Record<string, { jobTitle: string; email: string }> = {}
      ;(collabUsers ?? []).forEach((u: any) => {
        userMap[u.user_id] = { jobTitle: u.job_title ?? 'Colaborador', email: u.invitation_email ?? '' }
      })

      collaboratorVoices = collabSessions.map((s: any) => ({
        jobTitle: userMap[s.user_id]?.jobTitle ?? 'Colaborador',
        email: userMap[s.user_id]?.email ?? '',
        messages: s.messages ?? [],
        completedAt: s.completed ? s.last_message_at : null,
      }))
    }
  }

  return (
    <ModuleStartClient
      caseId={caseId}
      moduleCode={moduleCode}
      label={label}
      description={description}
      duration={duration}
      isCompleted={isCompleted}
      existingSessionId={existingSession?.id ?? null}
      existingMessages={existingSession?.messages ?? []}
      userEmail={session.user.email!}
      userRole={caseUser.role === 'collaborator' ? 'collaborator' : 'director'}
      collaboratorVoices={collaboratorVoices}
    />
  )
}
