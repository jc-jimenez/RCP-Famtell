import type { AgendaSignalType } from '@/types'

export interface DetectedSignal {
  type: AgendaSignalType
  text: string
}

// Extrae señales [AGENDA_SIGNAL: ...] del texto de respuesta de Nova
export function extractAgendaSignals(assistantText: string): DetectedSignal[] {
  const signals: DetectedSignal[] = []
  const regex = /\[AGENDA_SIGNAL:\s*type=(blue|yellow|red),\s*text="([^"]+)"\]/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(assistantText)) !== null) {
    signals.push({
      type: match[1] as AgendaSignalType,
      text: match[2],
    })
  }

  return signals
}

// Limpia el texto visible al usuario (elimina los tags internos)
export function stripAgendaTags(text: string): string {
  return text
    .replace(/\[AGENDA_SIGNAL:[^\]]+\]/g, '')
    .replace(/\[MODULE_CLOSE_CONFIRM\]/g, '')
    .replace(/\[QUESTION_ADVANCE\]/g, '')
    .trim()
}

// Nova incluye este tag (oculto para el usuario) cuando, tras preguntar si
// falta algo por agregar al cerrar el módulo, el usuario confirma que no.
// El backend usa esto como disparador real para marcar el módulo completado
// y desbloquear el siguiente — Nova nunca lo hace por su cuenta, solo avisa.
export function hasModuleCloseConfirm(assistantText: string): boolean {
  return /\[MODULE_CLOSE_CONFIRM\]/.test(assistantText)
}

// Nova incluye este tag (oculto) cada vez que termina de cubrir una pregunta
// del guion y pasa a la SIGUIENTE pregunta numerada (o al cierre, tras la
// última) — nunca en preguntas de profundización sobre la misma pregunta.
// El backend cuenta sus ocurrencias para llevar el avance real de la
// entrevista en vez de aproximarlo contando mensajes de chat (eso contaba de
// más cada follow-up de Nova y cada archivo adjunto como si fueran preguntas
// nuevas del guion).
export function countQuestionAdvances(assistantText: string): number {
  const matches = assistantText.match(/\[QUESTION_ADVANCE\]/g)
  return matches ? matches.length : 0
}

// Determina la intención estratégica dominante a partir de todas las señales
export function getDominantIntent(
  signals: { signal_type: AgendaSignalType }[],
): 'growth' | 'restructure' | 'exit' | 'mixed' {
  const counts = { blue: 0, yellow: 0, red: 0 }
  signals.forEach((s) => counts[s.signal_type]++)

  const total = counts.blue + counts.yellow + counts.red
  if (total === 0) return 'mixed'

  if (counts.red >= 4) return 'exit'

  const max = Math.max(counts.blue, counts.yellow, counts.red)
  const dominantPct = max / total

  if (dominantPct < 0.5) return 'mixed'
  if (counts.blue === max) return 'growth'
  if (counts.yellow === max) return 'restructure'
  return 'exit'
}
