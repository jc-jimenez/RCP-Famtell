interface Props {
  percent: number
  colorClassName?: string
  trackClassName?: string
  heightClassName?: string
}

export default function ProgressBar({
  percent,
  colorClassName = 'bg-module-active',
  trackClassName = 'bg-surface-2',
  heightClassName = 'h-1.5',
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className={`w-full rounded-full overflow-hidden ${trackClassName} ${heightClassName}`}>
      <div
        className={`h-full rounded-full transition-all ${colorClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
