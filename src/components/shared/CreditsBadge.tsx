'use client'

interface CreditsBadgeProps {
  total: number
  used: number
}

export default function CreditsBadge({ total, used }: CreditsBadgeProps) {
  const remaining = total - used
  const pct = total > 0 ? (remaining / total) * 100 : 0
  const color = pct > 40 ? 'text-emerald-400' : pct > 15 ? 'text-amber-400' : 'text-red-400'
  const barColor = pct > 40 ? 'bg-emerald-500' : pct > 15 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center gap-4">
      <div>
        <p className="text-xs text-slate-500 font-medium">Créditos disponibles</p>
        <p className={`text-xl font-bold ${color}`}>{remaining.toLocaleString()}</p>
        <p className="text-xs text-slate-600">de {total.toLocaleString()} totales</p>
      </div>
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
