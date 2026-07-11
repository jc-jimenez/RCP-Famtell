interface CaseContextForCatalog {
  company_name: string
  industry: string | null
  description: string | null
  products_services: string | null
  case_type: string
  department_name: string | null
  diagnostic_objectives: string | null
  strategic_notes: string | null
}

// Prompt para generar, a la medida del caso, el catálogo completo de
// módulos → secciones → preguntas que hoy es fijo (M1-M7) para el catálogo
// global. Solo se usa para casos con case_type (v2) — ver
// src/app/api/consultant/case-catalog/generate/route.ts.
export function buildCaseCatalogPrompt(caseData: CaseContextForCatalog): string {
  const isDepartamento = caseData.case_type === 'departamento'

  const contextBlock = isDepartamento
    ? `- Este diagnóstico es SOLO del departamento/área: ${caseData.department_name ?? 'sin nombre'}
- Hipótesis o problemática del departamento: ${caseData.strategic_notes?.trim() || 'no especificada'}
- Objetivos del diagnóstico: ${caseData.diagnostic_objectives?.trim() || 'no especificados'}`
    : `- Hipótesis o problemática de la empresa: ${caseData.strategic_notes?.trim() || 'no especificada'}`

  const scopeInstruction = isDepartamento
    ? 'Diseña entre 3 y 6 módulos ENFOCADOS ÚNICAMENTE en el funcionamiento de ese departamento/área — no cubras toda la empresa, solo lo relevante a esa área y su relación con el resto del negocio.'
    : 'Diseña entre 5 y 7 módulos que cubran integralmente el diagnóstico de la empresa (comercial, operativo, financiero, competitivo, talento/interno, y una síntesis final con plan de acción) — adapta nombres y enfoque al giro real de la empresa, no uses nombres genéricos de plantilla.'

  return `Eres un consultor senior de diagnóstico empresarial. Vas a diseñar el catálogo de módulos de entrevista para un caso específico — una batería a la medida de este negocio, no preguntas genéricas.

CONTEXTO DEL CASO:
- Empresa: ${caseData.company_name}
- Giro/industria: ${caseData.industry?.trim() || 'no especificado'}
- Descripción: ${caseData.description?.trim() || 'no especificada'}
- Productos/servicios: ${caseData.products_services?.trim() || 'no especificados'}
${contextBlock}

INSTRUCCIONES:
${scopeInstruction}

Cada módulo tiene entre 3 y 6 secciones, y cada sección entre 3 y 6 preguntas. Las preguntas las hará un asistente de IA (Nova) en una entrevista conversacional — deben ser claras, específicas del contexto real de este negocio (usa el giro, los productos/servicios y la hipótesis para orientar cada pregunta), y permitir profundizar en la problemática planteada. El último módulo debe servir de síntesis: hallazgos clave y plan de acción.

Para cada pregunta agrega "nova_hint": una instrucción interna breve (no se lee al usuario) sobre qué debe buscar Nova en la respuesta.

Responde ÚNICAMENTE con un JSON array de módulos, sin texto antes ni después:
[{
  "name": "Nombre del módulo",
  "description": "Objetivo de este módulo en una frase",
  "sections": [{
    "name": "Nombre de la sección",
    "questions": [{
      "text": "Pregunta que Nova hará",
      "nova_hint": "Qué debe buscar Nova en la respuesta"
    }]
  }]
}]`
}
