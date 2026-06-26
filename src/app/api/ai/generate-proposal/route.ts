import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { anthropic, NOVA_MODEL } from '@/lib/anthropic/client'

export const runtime = 'nodejs'
export const maxDuration = 60

const PROPOSAL_COST = 5

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { caseId, prospectName, prospectCompany, prospectNeed, proposedValue, currency } = await request.json()
  if (!caseId || !prospectName || !prospectNeed) {
    return NextResponse.json({ error: 'caseId, prospectName y prospectNeed son requeridos' }, { status: 400 })
  }

  const db = supabase as any

  const { data: account } = await db
    .from('accounts')
    .select('id, credits_total, credits_used')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!account) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const remaining = account.credits_total - account.credits_used
  if (remaining < PROPOSAL_COST) {
    return NextResponse.json({ error: 'Créditos insuficientes (se requieren 5 créditos)' }, { status: 402 })
  }

  // Obtener datos del caso y brief
  const { data: caseData } = await db
    .from('cases')
    .select('company_name, industry, strategic_intent')
    .eq('id', caseId)
    .eq('account_id', account.id)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

  const { data: brief } = await db
    .from('briefs')
    .select('content_json')
    .eq('case_id', caseId)
    .eq('brief_type', 'diagnostic')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Contexto del brief (si existe)
  const briefContext = brief?.content_json
    ? `
## Brief de diagnóstico de ${caseData.company_name}

Resumen ejecutivo: ${(brief.content_json as any).executive_summary ?? 'No disponible'}

Intención estratégica: ${(brief.content_json as any).strategic_intent ?? caseData.strategic_intent ?? 'growth'}

Fortalezas clave:
${((brief.content_json as any).strengths ?? []).slice(0, 3).map((s: string) => `- ${s}`).join('\n')}

Plan RCP — Semanas 1-4:
${((brief.content_json as any).rcp_plan?.weeks_1_4 ?? []).slice(0, 3).map((a: string) => `- ${a}`).join('\n')}
`.trim()
    : `Empresa: ${caseData.company_name}, Industria: ${caseData.industry ?? 'No especificada'}`

  const prompt = `Eres Nova, una IA especializada en diagnóstico y desarrollo empresarial.

Genera una propuesta comercial profesional en español para el siguiente caso:

## Empresa oferente
${caseData.company_name} (${caseData.industry ?? 'Logística/Servicios'})

${briefContext}

## Propuesta para
- Prospecto: ${prospectName}
- Empresa: ${prospectCompany ?? 'No especificada'}
- Necesidad detectada: ${prospectNeed}
${proposedValue ? `- Valor propuesto: ${currency ?? 'MXN'} $${proposedValue.toLocaleString('es-MX')}` : ''}

## Instrucciones
Genera una propuesta comercial estructurada y persuasiva. Usa el contexto del diagnóstico para mostrar capacidades relevantes. Formato:

1. **Entendimiento del reto** — demuestra que entiendes su problema
2. **Nuestra solución** — cómo ${caseData.company_name} resuelve específicamente esa necesidad
3. **Por qué nosotros** — 3 diferenciadores concretos basados en las fortalezas del diagnóstico
4. **Alcance y entregables** — qué recibirán exactamente
5. **Inversión** — presenta el valor${proposedValue ? ` de $${Number(proposedValue).toLocaleString('es-MX')} ${currency ?? 'MXN'}` : ''} como inversión, no como gasto
6. **Próximos pasos** — 3 pasos concretos y fechas sugeridas

Tono: profesional pero cercano, orientado a resultados. Máximo 600 palabras.`

  const message = await anthropic.messages.create({
    model: NOVA_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const proposalText = (message.content[0] as any).text as string

  // Descontar créditos
  await db
    .from('accounts')
    .update({ credits_used: account.credits_used + PROPOSAL_COST })
    .eq('id', account.id)

  return NextResponse.json({ proposal: proposalText, creditsUsed: PROPOSAL_COST })
}
