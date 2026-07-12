'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  data: { week: number; value: number }[]
  height?: number
  domain?: [number, number]
}

export default function ProgressTrendChart({ data, height = 200, domain = [0, 10] }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--color-subtle))" strokeDasharray="3 3" />
        <XAxis dataKey="week" tickFormatter={w => `S${w}`} tick={{ fill: 'rgb(var(--color-faint))', fontSize: 11 }} />
        <YAxis domain={domain} tick={{ fill: 'rgb(var(--color-faint))', fontSize: 11 }} />
        <Tooltip
          labelFormatter={w => `Semana ${w}`}
          contentStyle={{
            background: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-subtle))',
            borderRadius: 10,
            fontSize: 12,
            color: 'rgb(var(--color-ink))',
          }}
        />
        <Line type="monotone" dataKey="value" stroke="rgb(var(--color-accent))" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
