import { anthropic, NOVA_MODEL } from './anthropic/client'
import type { AnsweredItem } from './hypothesisAudit'

export interface HypothesisFundamento {
  quote: string
  participant: string
  moduleCode: string
  questionIndex: number
}

export interface HypothesisCandidate {
  id: string
  statement: string
  area: string
  module_origin: string
  fundamento: HypothesisFundamento[]
  draft_conclusion: string
  status: 'pending'
  final_conclusion: null
  created_at: string
}

// Genera hipótesis candidatas a partir del universo de respuestas de TODO
// el caso (no un módulo o participante aislado — una hipótesis puede
// necesitar cruzar lo que dijeron varios participantes sobre el mismo
// tema). Los índices de fundamento los resuelve este código, NUNCA el
// modelo — se le pide que cite por índice de la lista numerada que se le
// da, y aquí se reconstruye el objeto real (quote/participante/módulo/
// #pregunta) desde el AnsweredItem correspondiente. Cero riesgo de que la
// IA invente o desfase una cita.
export async function generateHypothesisCandidates(items: AnsweredItem[]): Promise<HypothesisCandidate[]> {
  if (items.length === 0) return []

  const listText = items
    .map((it, i) => `[${i}] (${it.participantName}, ${it.moduleCode}, P${it.questionIndex}): "${it.questionText}" → "${it.answer}"`)
    .join('\n')

  const prompt = `Eres un consultor senior de diagnóstico empresarial, especializado en detectar afirmaciones no sustentadas que podrían convertirse en la base equivocada de una recomendación estratégica.

Abajo está TODO lo que se contestó en las entrevistas de este caso, numerado por índice, con la referencia exacta de quién lo dijo, en qué módulo y en qué pregunta:

${listText}

Identifica HIPÓTESIS: afirmaciones cualitativas de alto impacto — sobre canales de venta, capacidades de ejecución, procesos, tecnología, alianzas, o cualquier tema que pueda alimentar directamente una iniciativa del plan de acción (90 días, 6 meses, 1 año o 3 años) — que el participante mencionó SIN sustento verificable (sin cifras duras, sin evidencia externa, sin documento adjunto que lo confirme).

Ejemplo del tipo de caso que buscas: un participante dice "hacemos marketing por LinkedIn y Facebook" — eso podría significar una campaña profesional gestionada por una agencia, o publicidad casera sin presupuesto. Si un plan de 90 días asume lo primero y la realidad es lo segundo, la iniciativa completa parte de una premisa falsa.

Reglas:
- No generes una hipótesis por cada dato cualitativo — solo cuando, de tomarse literalmente y resultar falsa, cambiaría una recomendación real del plan.
- Si varios participantes tocan el mismo tema (de acuerdo o en contradicción), cítalos todos en la misma hipótesis — eso es más valioso que hipótesis sueltas por persona.
- No repitas como hipótesis un dato que ya viene con cifra dura o evidencia clara (ej. "13 clientes activos" no es una hipótesis, es un hecho reportado).
- fundamento_ids debe listar SOLO índices [n] que existen arriba — nunca inventes un índice.

Para cada hipótesis, responde:
- statement: la afirmación a confirmar, redactada con claridad (ej. "Famtell ejecuta marketing profesional gestionado por una agencia en LinkedIn y Facebook")
- area: una de [Comercial, Operativo, Financiero, Organizacional, Tecnología, Estrategia, Capital Humano]
- module_origin: código del módulo principal de origen (ej. "M1")
- fundamento_ids: array de los índices [n] de la lista que sustentan o contradicen la hipótesis
- draft_conclusion: tu mejor propuesta de afirmación corregida y matizada — la que el consultor podría aprobar tal cual o ajustar después de confirmar con el directivo (ej. "Famtell tiene presencia en LinkedIn y Facebook, pero sin gestión profesional ni inversión formal confirmada — validar antes de asumir ejecución con agencia")

MUY IMPORTANTE — formato JSON válido: dentro de cualquier valor de texto, si necesitas citar una frase dentro de otra cita, usa comillas simples ('...'), nunca comillas dobles rectas ("...").

Responde ÚNICAMENTE con un array JSON:
[{ "statement": "...", "area": "...", "module_origin": "...", "fundamento_ids": [3, 17], "draft_conclusion": "..." }]`

  const response = await anthropic.messages.create({
    model: NOVA_MODEL,
    max_tokens: 6000,
    system: prompt,
    messages: [{ role: 'user', content: 'Genera las hipótesis solicitadas.' }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)?.[0]
  if (!jsonMatch) return []

  let raw: any[]
  try {
    raw = JSON.parse(jsonMatch)
  } catch {
    return []
  }

  const now = new Date().toISOString()
  return raw
    .map((h: any, i: number): HypothesisCandidate | null => {
      const fundamento: HypothesisFundamento[] = (h.fundamento_ids ?? [])
        .filter((idx: number) => Number.isInteger(idx) && items[idx])
        .map((idx: number) => ({
          quote: items[idx].answer,
          participant: items[idx].participantName,
          moduleCode: items[idx].moduleCode,
          questionIndex: items[idx].questionIndex,
        }))
      if (fundamento.length === 0) return null // sin sustento real, no se guarda
      return {
        id: `hip_${i + 1}`,
        statement: h.statement ?? '',
        area: h.area ?? '',
        module_origin: h.module_origin ?? '',
        fundamento,
        draft_conclusion: h.draft_conclusion ?? '',
        status: 'pending',
        final_conclusion: null,
        created_at: now,
      }
    })
    .filter((h: HypothesisCandidate | null): h is HypothesisCandidate => h !== null)
}
