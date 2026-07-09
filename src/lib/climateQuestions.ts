// Cuestionario de Clima y Diagnóstico Interno — Kit 6.1 (preguntas exactas del documento)
export type ClimateQuestionType = 'open' | 'number' | 'scale_1_5' | 'choice' | 'choice_text'

export interface ClimateQuestion {
  key: string
  label: string
  type: ClimateQuestionType
  options?: string[]
  minLabel?: string
  maxLabel?: string
}

export const DEFAULT_CLIMATE_QUESTIONS: ClimateQuestion[] = [
  { key: 'problema_principal', label: '¿Cuál es el principal problema que frena el crecimiento de la empresa?', type: 'open' },
  { key: 'capacidad_no_aprovechada', label: '¿Hay capacidad de operación que no estamos aprovechando? ¿Cuál?', type: 'open' },
  { key: 'servicio_no_ofrecido', label: '¿Algún cliente te ha pedido un servicio que no ofrecemos?', type: 'choice_text', options: ['Sí', 'No'] },
  { key: 'proceso_lento', label: '¿Qué proceso interno te quita más tiempo del necesario?', type: 'open' },
  { key: 'que_harias_diferente', label: '¿Qué harías diferente si tuvieras autorización para hacerlo?', type: 'open' },
  { key: 'comunicacion_interna', label: '¿Cómo calificarías la comunicación interna del equipo?', type: 'scale_1_5', minLabel: 'Muy mala', maxLabel: 'Excelente' },
  { key: 'conoce_meta_3_meses', label: '¿Sabes cuál es la meta de la empresa para los próximos 3 meses?', type: 'choice', options: ['Sí', 'No', 'Parcialmente'] },
  { key: 'herramientas_necesarias', label: '¿Tienes las herramientas necesarias para hacer bien tu trabajo?', type: 'choice_text', options: ['Sí', 'No'] },
  { key: 'clientes_nuevos_estimado', label: '¿Cuántos clientes nuevos crees que podríamos incorporar este mes?', type: 'number' },
  { key: 'recomendaria_trabajar', label: '¿Recomendarías esta empresa como lugar de trabajo?', type: 'scale_1_5', minLabel: 'No', maxLabel: 'Definitivamente sí' },
]

export const AREA_OPTIONS = ['Operación', 'Comercial', 'Administración', 'Dirección']
