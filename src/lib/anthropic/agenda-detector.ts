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
  return text.replace(/\[AGENDA_SIGNAL:[^\]]+\]/g, '').trim()
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
