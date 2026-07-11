export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import BriefConsultorClient from './BriefConsultorClient'
import BriefDirectorClient from './BriefDirectorClient'
import { computeAllModulesCompletion } from '@/lib/moduleCompletion'
import { resolveCatalogScope, applyCatalogScope } from '@/lib/moduleTemplates'

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = supabase as any

  const { data: caseData } = await db
    .from('cases')
    .select('id, company_name, industry, account_id')
    .eq('id', id)
    .single()

  if (!caseData) redirect('/login')

  const { data: account } = await db
    .from('accounts')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  const { data: caseUser } = await db
    .from('case_users')
    .select('role')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const isConsultant = !!(account && caseData.account_id === account.id)
  const isDirector = caseUser?.role === 'director'
  if (!isConsultant && !isDirector) redirect('/login')

  // Cargar brief de la nueva tabla
  const { data: brief } = await db
    .from('brief_documents')
    .select('*')
    .eq('case_id', id)
    .maybeSingle()

  // Señales IER
  const { data: signals } = await db
    .from('agenda_signals')
    .select('module_code, signal_type, signal_text')
    .eq('case_id', id)

  const ierCounts = { blue: 0, yellow: 0, red: 0 }
  ;(signals ?? []).forEach((s: any) => ierCounts[s.signal_type as keyof typeof ierCounts]++)

  // Avance REAL por módulo: todos los puestos con preguntas mapeadas deben
  // haber terminado su entrevista, no solo "existe una sesión" (ver moduleCompletion.ts).
  const allCompletion = await computeAllModulesCompletion(db, id)
  const modulesCompleted = allCompletion.filter(m => m.colorStatus === 'green').length
  const incompleteModules = allCompletion.filter(m => m.colorStatus !== 'green')

  // Catálogo real del caso (propio si existe, si no el global M1-M7) — el
  // stage de Análisis y el copy de JTBD Comercial ya no asumen M1-M7 fijo.
  const catalogScope = await resolveCatalogScope(db, id)
  const modulesQuery = db.from('module_templates').select('code, name').eq('is_active', true)
  const { data: caseModules } = await applyCatalogScope(modulesQuery, catalogScope, id).order('sort_order', { ascending: true })

  if (isConsultant) {
    return (
      <BriefConsultorClient
        caseId={id}
        companyName={caseData.company_name}
        industry={caseData.industry ?? '3PL / Logística'}
        email={session.user.email!}
        initialBrief={brief ?? null}
        ierCounts={ierCounts}
        modulesCompleted={modulesCompleted}
        incompleteModules={incompleteModules}
        modules={caseModules ?? []}
      />
    )
  }

  const moduleNames: Record<string, string> = {}
  ;(caseModules ?? []).forEach((m: any) => { moduleNames[m.code] = m.name })

  // Director — solo puede ver el brief si está publicado
  if (!brief || brief.status !== 'published') {
    return (
      <BriefDirectorClient
        caseId={id}
        companyName={caseData.company_name}
        email={session.user.email!}
        brief={null}
        role="director"
        moduleNames={moduleNames}
      />
    )
  }

  return (
    <BriefDirectorClient
      caseId={id}
      companyName={caseData.company_name}
      email={session.user.email!}
      brief={brief}
      role="director"
      moduleNames={moduleNames}
    />
  )
}
