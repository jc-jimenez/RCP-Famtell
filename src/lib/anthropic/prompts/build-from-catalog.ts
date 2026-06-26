import { NOVA_BASE_SYSTEM } from './base'
import type { ModuleCode } from '@/types'

interface Question {
  text: string
  nova_hint: string | null
  sort_order: number
  suggested_roles: string[]
}

interface Section {
  code: string
  name: string
  description: string | null
  sort_order: number
  suggested_roles: string[]
  questions: Question[]
}

interface ModuleTemplate {
  code: string
  name: string
  description: string | null
}

const ROLE_LABEL: Record<string, string> = {
  director_general:  'Director General',
  gerente_comercial: 'Gerente Comercial',
  gerente_operativo: 'Gerente Operativo',
  cfo_contador:      'CFO / Contador',
  rrhh_admin:        'RRHH / Administración',
  gerente_marketing: 'Gerente de Marketing',
}

function formatRoles(roles: string[]): string {
  return roles.map(r => ROLE_LABEL[r] ?? r).join(', ')
}

/**
 * Construye el system prompt de Nova para un módulo dado,
 * usando el catálogo de la BD. Si no hay preguntas en BD
 * (migración no ejecutada), cae al prompt estático.
 */
export function buildModulePromptFromCatalog(
  module: ModuleTemplate,
  sections: Section[],
  userRole: string | null,
): string {
  // Filtrar secciones relevantes para este rol (si se especifica)
  const relevantSections = userRole
    ? sections.filter(s =>
        s.suggested_roles.length === 0 ||
        s.suggested_roles.includes(userRole) ||
        s.questions.some(q => q.suggested_roles.includes(userRole))
      )
    : sections

  const sectionBlocks = relevantSections.map((sec, idx) => {
    const relevantQuestions = userRole
      ? sec.questions.filter(q =>
          q.suggested_roles.length === 0 || q.suggested_roles.includes(userRole)
        )
      : sec.questions

    if (relevantQuestions.length === 0) return null

    const questionLines = relevantQuestions.map((q, qi) => {
      const hint = q.nova_hint ? `\n   [Nova: ${q.nova_hint}]` : ''
      return `  ${idx + 1}.${qi + 1}. ${q.text}${hint}`
    }).join('\n')

    const rolesLine = sec.suggested_roles.length > 0
      ? ` [${formatRoles(sec.suggested_roles)}]`
      : ''

    return `━━━ ${sec.code} — ${sec.name}${rolesLine} ━━━\n${questionLines}`
  }).filter(Boolean)

  const userRoleLabel = userRole ? (ROLE_LABEL[userRole] ?? userRole) : 'el participante'

  return `
${NOVA_BASE_SYSTEM}

MÓDULO ACTUAL: ${module.code} — ${module.name}
OBJETIVO: ${module.description ?? ''}
ROL DEL USUARIO: ${userRoleLabel}

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
CIERRE: Cuando hayas cubierto todas las secciones, confirma con el usuario y marca el módulo como completado.
`.trim()
}

/**
 * Genera el prompt de inicio automático de Nova para este módulo y rol.
 * Se usa cuando el usuario abre el módulo por primera vez (__NOVA_START__).
 */
export function buildStartMessage(moduleName: string, userRole: string | null): string {
  const roleLabel = userRole ? (ROLE_LABEL[userRole] ?? userRole) : ''
  const roleIntro = roleLabel ? ` Como ${roleLabel},` : ''
  return `Inicia la sesión presentándote brevemente como Nova y di: "Vamos a comenzar con ${moduleName}.${roleIntro} te haré preguntas una a la vez sobre este tema. Tómate el tiempo que necesites para responder. ¿Listo para empezar?"`
}
