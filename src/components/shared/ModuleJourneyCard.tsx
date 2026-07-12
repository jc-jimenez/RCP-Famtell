import Link from 'next/link'
import CircularProgress from './CircularProgress'

export type JourneyAccent = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'teal' | 'indigo'

const ACCENT_STYLES: Record<JourneyAccent, { border: string; ring: string; badgeBg: string; badgeText: string; button: string }> = {
  emerald: { border: 'border-t-emerald-400', ring: 'text-emerald-500', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', button: 'bg-emerald-600 hover:bg-emerald-700' },
  blue:    { border: 'border-t-blue-400',    ring: 'text-blue-500',    badgeBg: 'bg-blue-100',    badgeText: 'text-blue-700',    button: 'bg-blue-600 hover:bg-blue-700' },
  violet:  { border: 'border-t-violet-400',  ring: 'text-violet-500',  badgeBg: 'bg-violet-100',  badgeText: 'text-violet-700',  button: 'bg-violet-600 hover:bg-violet-700' },
  amber:   { border: 'border-t-amber-400',   ring: 'text-amber-500',   badgeBg: 'bg-amber-100',   badgeText: 'text-amber-700',   button: 'bg-amber-500 hover:bg-amber-600' },
  rose:    { border: 'border-t-rose-400',    ring: 'text-rose-500',    badgeBg: 'bg-rose-100',    badgeText: 'text-rose-700',    button: 'bg-rose-600 hover:bg-rose-700' },
  teal:    { border: 'border-t-teal-400',    ring: 'text-teal-500',    badgeBg: 'bg-teal-100',    badgeText: 'text-teal-700',    button: 'bg-teal-600 hover:bg-teal-700' },
  indigo:  { border: 'border-t-indigo-400',  ring: 'text-indigo-500',  badgeBg: 'bg-indigo-100',  badgeText: 'text-indigo-700',  button: 'bg-indigo-600 hover:bg-indigo-700' },
}

export const JOURNEY_ACCENTS: JourneyAccent[] = ['emerald', 'blue', 'violet', 'amber', 'rose', 'teal', 'indigo']

interface Props {
  index: number
  label: string
  emoji: string
  percent: number
  isCompleted: boolean
  isLocked: boolean
  subtext?: string
  href?: string
  ctaLabel?: string
  accent: JourneyAccent
}

export default function ModuleJourneyCard({
  index, label, emoji, percent, isCompleted, isLocked, subtext, href, ctaLabel, accent,
}: Props) {
  const style = ACCENT_STYLES[accent]

  return (
    <div className={`card border-t-4 ${isLocked ? 'border-t-subtle opacity-60' : style.border} p-4 flex flex-col items-center text-center`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${
        isCompleted ? 'bg-emerald-100 text-emerald-700' : isLocked ? 'bg-surface-2 text-faint' : `${style.badgeBg} ${style.badgeText}`
      }`}>
        {isCompleted ? '✓' : index}
      </div>
      <p className="text-lg mb-1">{emoji}</p>
      <p className="text-xs font-semibold text-ink leading-tight mb-2 min-h-[2rem]">{label}</p>
      <CircularProgress percent={isLocked ? 0 : percent} size={64} strokeWidth={5} colorClassName={isLocked ? 'text-subtle' : style.ring}>
        <span className={`text-sm font-bold ${isLocked ? 'text-faint' : 'text-ink'}`}>{isLocked ? '—' : `${percent}%`}</span>
      </CircularProgress>
      {subtext && <p className="text-xs text-faint mt-2">{subtext}</p>}
      {isLocked ? (
        <span className="mt-3 text-xs text-faint px-3 py-1.5">Bloqueado</span>
      ) : href && ctaLabel ? (
        <Link href={href as any} className={`mt-3 text-xs font-medium text-white rounded-lg px-3 py-1.5 transition-colors ${style.button}`}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
