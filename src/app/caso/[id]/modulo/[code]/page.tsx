export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { ensureModulesInitialized } from '@/lib/modules'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'
import { countQuestionsForPosition } from '@/lib/moduleQuestions'
import ModuleStartClient from './ModuleStartClient'
import type { ModuleCode } from '@/types'

// Ver [[feedback_module_unlock_per_participant]]: el desbloqueo es por
// participante, así que este check usa las SESIONES de este usuario (no la
// fila compartida `modules` del caso, que antes bloqueaba a alguien que ya
// había terminado su propia entrevista solo porque otro compañero no había
// empezado la suya).
async function resolveMyModuleAccess(db: any, caseId: string, userId: string, moduleCode: string) {
  const scope = await resolveCatalogScope(db, caseId)
  const templatesQuery = db.from('module_templates').select('code').eq('is_active', true)
  const { data: templates } = await applyCatalogScope(templatesQuery, scope, caseId).order('sort_order', { ascending: true })
  const moduleOrder: string[] = (templates ?? []).map((t: any) => t.code)

  const { data: mySessions } = await db
    .from('sessions')
    .select('module_code, completed')
    .eq('case_id', caseId)
    .eq('user_id', userId)

  const myCompleted = new Set((mySessions ?? []).filter((s: any) => s.completed).map((s: any) => s.module_code))
  const myNextModule = moduleOrder.find(code => !myCompleted.has(code))
  const isCompleted = myCompleted.has(moduleCode)
  const isLocked = !isCompleted && moduleCode !== myNextModule

  return { isLocked, isCompleted }
}

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
    .select('role, job_position_id')
    .eq('case_id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!caseUser) redirect('/login')

  const totalQuestions = await countQuestionsForPosition(db, caseId, moduleCode, caseUser.job_position_id)

  // Asegura que existan las filas de `modules` del caso (se siguen usando
  // para reportes case-wide: Brief, "X/7 módulos" del consultor) — pero ya
  // NO deciden si YO puedo entrar a este módulo.
  await ensureModulesInitialized(db, caseId)

  const { isLocked, isCompleted } = await resolveMyModuleAccess(db, caseId, session.user.id, moduleCode)
  if (isLocked) redirect(`/caso/${caseId}`)

  // Cargar MI sesión existente de este módulo (no la de otro participante).
  // No se usa .maybeSingle(): si hay más de una fila (datos históricos) se
  // toma la más reciente en vez de fallar en silencio.
  const { data: existingSessionRows } = await db
    .from('sessions')
    .select('id, messages')
    .eq('case_id', caseId)
    .eq('module_code', moduleCode)
    .eq('user_id', session.user.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
  const existingSession = existingSessionRows?.[0] ?? null

  const catalogScope = await resolveCatalogScope(db, caseId)
  const templateQuery = db.from('module_templates').select('name, description').eq('code', moduleCode)
  const { data: template } = await applyCatalogScope(templateQuery, catalogScope, caseId).maybeSingle()

  const label = template?.name ?? MODULE_LABELS[moduleCode] ?? moduleCode
  const description = template?.description ?? MODULE_DESCRIPTIONS[moduleCode] ?? ''
  const duration = MODULE_DURATION[moduleCode] ?? '20-30 minutos'

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
      totalQuestions={totalQuestions}
      userEmail={session.user.email!}
      userRole={caseUser.role === 'collaborator' ? 'collaborator' : 'director'}
      collaboratorVoices={collaboratorVoices}
    />
  )
}
