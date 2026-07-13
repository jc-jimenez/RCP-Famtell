import { NOVA_BASE_SYSTEM } from './base'

interface Question {
  text: string
  nova_hint: string | null
  sort_order: number
  job_position_ids: string[]
}

interface Section {
  code: string
  name: string
  description: string | null
  sort_order: number
  questions: Question[]
}

interface ModuleTemplate {
  code: string
  name: string
  description: string | null
}

export interface CaseBusinessContext {
  companyName: string
  industry: string | null
  description: string | null
  productsServices: string | null
  isDepartamento: boolean
  departmentName: string | null
  diagnosticObjectives: string | null
  hypothesis: string | null
}

function buildBusinessContextBlock(ctx: CaseBusinessContext): string {
  const lines = [
    `- Empresa: ${ctx.companyName}`,
    `- Giro: ${ctx.industry?.trim() || 'no especificado'}`,
    `- Descripción: ${ctx.description?.trim() || 'no especificada'}`,
    `- Productos/servicios: ${ctx.productsServices?.trim() || 'no especificados'}`,
  ]
  if (ctx.isDepartamento) {
    lines.push(`- Este diagnóstico es del departamento/área: ${ctx.departmentName ?? 'sin nombre'}`)
    lines.push(`- Objetivos del diagnóstico: ${ctx.diagnosticObjectives?.trim() || 'no especificados'}`)
  }
  lines.push(`- Hipótesis/problemática a contrastar (NO asumir como verdad, profundizar cuando la respuesta se relacione con ella): ${ctx.hypothesis?.trim() || 'no especificada'}`)

  return `CONTEXTO DEL NEGOCIO (úsalo para enfocar tus preguntas de seguimiento, no lo leas literalmente al usuario):
${lines.join('\n')}
`
}

/**
 * Construye el system prompt de Nova para un módulo dado, usando el
 * catálogo de la BD. Filtra por el puesto (job_position_id) del caso al
 * que pertenece el usuario — ver docs/PRD_RCPFAMTELL3PL.md sección 7.
 * Una pregunta sin ningún puesto mapeado en este caso se excluye del
 * guion (no se le pregunta a nadie), no se le muestra "a todos" por
 * defecto — a diferencia del enum de roles anterior.
 *
 * caseContext es opcional a propósito: solo se pasa para casos v2 (con
 * case_type) — los casos legacy siguen generando el prompt exactamente
 * igual que antes, sin este bloque.
 */
export function buildModulePromptFromCatalog(
  module: ModuleTemplate,
  sections: Section[],
  jobPositionId: string | null,
  jobPositionName: string | null,
  caseContext?: CaseBusinessContext,
): string {
  const sectionBlocks = sections.map((sec, idx) => {
    const relevantQuestions = jobPositionId
      ? sec.questions.filter(q => q.job_position_ids.includes(jobPositionId))
      : []

    if (relevantQuestions.length === 0) return null

    const questionLines = relevantQuestions
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q, qi) => {
        const hint = q.nova_hint ? `\n   [Nova: ${q.nova_hint}]` : ''
        return `  ${idx + 1}.${qi + 1}. ${q.text}${hint}`
      }).join('\n')

    return `━━━ ${sec.code} — ${sec.name} ━━━\n${questionLines}`
  }).filter(Boolean)

  const userRoleLabel = jobPositionName ?? 'el participante'
  // Sin caseContext, contextSection queda vacío y el prompt es idéntico al
  // de antes de esta fase — ni una línea en blanco de diferencia.
  const contextSection = caseContext ? `${buildBusinessContextBlock(caseContext)}\n` : ''

  return `
${NOVA_BASE_SYSTEM}

${contextSection}MÓDULO ACTUAL: ${module.code} — ${module.name}
OBJETIVO: ${module.description ?? ''}
PUESTO DEL USUARIO: ${userRoleLabel}

GUION DE ENTREVISTA (sigue este orden, una pregunta a la vez):
Las preguntas entre corchetes [Nova: ...] son orientaciones internas — úsalas para profundizar pero no las leas literalmente al usuario.
Adapta el lenguaje al contexto de la conversación, pero no te saltes preguntas sin cubrirlas.

${sectionBlocks.join('\n\n')}

SEÑALES DE AGENDA OCULTA (aplica en las secciones finales):
- 🔵 CRECIMIENTO: expansión, nuevas inversiones, más clientes
- 🟡 REDIMENSIONAMIENTO: simplificar, reducir, reiniciar
- 🔴 SALIDA: abierto a fusión, venta, socio estratégico
Cuando detectes señal, incluye al final: [AGENDA_SIGNAL: type=blue|yellow|red, text="fragmento exacto"]

INICIO: Saluda mencionando el módulo (${module.name}) y que harás preguntas una a la vez.
CIERRE: Cuando hayas cubierto todas las secciones, pregunta si falta algo por agregar.
Cuando el usuario confirme que no, agradece brevemente y agrega al final de tu
respuesta (oculto) el tag [MODULE_CLOSE_CONFIRM] — tú no marcas el módulo ni sabes cuál
es el siguiente, eso lo hace el sistema automáticamente después de tu mensaje.
`.trim()
}

/**
 * Genera el prompt de inicio automático de Nova para este módulo y puesto.
 * Se usa cuando el usuario abre el módulo por primera vez (__NOVA_START__).
 */
export function buildStartMessage(moduleName: string, jobPositionName: string | null): string {
  const roleIntro = jobPositionName ? ` Como ${jobPositionName},` : ''
  return `Inicia la sesión presentándote brevemente como Nova y di: "Vamos a comenzar con ${moduleName}.${roleIntro} te haré preguntas una a la vez sobre este tema. Tómate el tiempo que necesites para responder. ¿Listo para empezar?"`
}
