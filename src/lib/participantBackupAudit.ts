import { anthropic, NOVA_MODEL } from './anthropic/client'

// Auditoría de cobertura real por módulo, para el respaldo PDF por
// participante (opción C, jul 2026): en vez de confiar en el contador
// answered_questions (poco confiable — depende de que Nova recuerde emitir
// [QUESTION_ADVANCE] en medio de una conversación fluida, ver hallazgo de
// Gerardo Téllez Alcaraz: 9/27 contadas mientras que ~26/27 sí se cubrieron
// en sustancia), un modelo lee la transcripción completa YA CERRADA y la
// compara contra el catálogo real de preguntas del puesto — determinista
// respecto al catálogo, no dependiente de un tag en vivo.

export interface QuestionCoverage {
  question: string
  answer: string | null
  covered: boolean
}

export async function auditModuleCoverage(
  catalogQuestions: string[],
  transcript: { role: string; content: string }[],
): Promise<QuestionCoverage[]> {
  if (catalogQuestions.length === 0) return []
  if (transcript.length === 0) {
    return catalogQuestions.map(q => ({ question: q, answer: null, covered: false }))
  }

  const transcriptText = transcript
    .map(m => `[${m.role === 'user' ? 'Participante' : 'Nova'}]: ${m.content}`)
    .join('\n\n')

  const prompt = `Eres un auditor de entrevistas de diagnóstico empresarial. Tu única tarea es comparar una lista de preguntas de catálogo contra la transcripción real de una entrevista, y determinar para CADA pregunta si el participante la contestó en sustancia — aunque Nova la haya formulado con otras palabras, la haya combinado con otra pregunta, o la respuesta haya salido en un momento distinto de la conversación.

CATÁLOGO DE PREGUNTAS (numeradas, en el orden del guion):
${catalogQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

TRANSCRIPCIÓN COMPLETA DE LA ENTREVISTA:
${transcriptText}

Para cada pregunta del catálogo:
- Si el participante dio información real sobre ese tema en algún punto de la conversación, marca covered:true y en "answer" resume su respuesta real en 1-2 líneas, citando literalmente cuando sea corto y relevante.
- Si el tema nunca se abordó, marca covered:false y answer:null. No inventes ni infieras una respuesta que no esté en la transcripción.
- No repitas la pregunta del catálogo tal cual como "answer" — answer es lo que dijo el PARTICIPANTE, no la pregunta.

MUY IMPORTANTE — formato JSON válido: dentro de cualquier valor de texto, si necesitas citar una frase dentro de otra cita, usa comillas simples ('...'), nunca comillas dobles rectas ("...").

Responde ÚNICAMENTE con un array JSON, un elemento por cada pregunta del catálogo, en el mismo orden:
[{ "question": "texto exacto de la pregunta del catálogo", "answer": "resumen de la respuesta real, o null", "covered": true }]`

  const response = await anthropic.messages.create({
    model: NOVA_MODEL,
    max_tokens: 4000,
    system: prompt,
    messages: [{ role: 'user', content: 'Genera la auditoría solicitada.' }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)?.[0]
  if (!jsonMatch) {
    // Degrada con gracia: si el modelo no devolvió JSON válido, el PDF
    // igual debe generarse — solo sin tabla de cobertura para este módulo.
    return catalogQuestions.map(q => ({ question: q, answer: null, covered: false }))
  }

  try {
    const parsed = JSON.parse(jsonMatch) as QuestionCoverage[]
    return parsed
  } catch {
    return catalogQuestions.map(q => ({ question: q, answer: null, covered: false }))
  }
}

// Misma auditoría, pero cacheada en sessions.qa_audit_cache (migración 047).
// Una sesión completada no vuelve a recibir mensajes, así que el resultado
// es válido indefinidamente MIENTRAS el catálogo de preguntas no cambie —
// por eso el caché guarda el catálogo exacto usado y se invalida si ya no
// coincide con el catálogo actual (el consultor agregó/quitó una pregunta).
// Usar esta función en vez de auditModuleCoverage() en cualquier lugar que
// audite sesiones ya cerradas (respaldo PDF, universo de hipótesis) — evita
// repetir la misma llamada a IA cada vez que se regenera cualquiera de los
// dos (encontrado en vivo: ~46 llamadas repetidas por corrida en un caso de
// 9 participantes).
export async function getCachedAuditModuleCoverage(
  db: any,
  sessionId: string,
  catalogQuestions: string[],
  transcript: { role: string; content: string }[],
): Promise<QuestionCoverage[]> {
  const { data: sessionRow } = await db
    .from('sessions')
    .select('qa_audit_cache')
    .eq('id', sessionId)
    .maybeSingle()

  const cache = sessionRow?.qa_audit_cache as { questions?: string[]; coverage?: QuestionCoverage[] } | null
  const cacheValid =
    cache?.questions &&
    cache.questions.length === catalogQuestions.length &&
    cache.questions.every((q, i) => q === catalogQuestions[i])

  if (cacheValid && cache?.coverage) return cache.coverage

  const coverage = await auditModuleCoverage(catalogQuestions, transcript)

  await db
    .from('sessions')
    .update({ qa_audit_cache: { questions: catalogQuestions, coverage, cached_at: new Date().toISOString() } })
    .eq('id', sessionId)

  return coverage
}
