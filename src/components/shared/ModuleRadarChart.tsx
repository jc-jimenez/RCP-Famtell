'use client'

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: { axis: string; value: number }[]
  height?: number
}

export default function ModuleRadarChart({ data, height = 260 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="rgb(var(--color-subtle))" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgb(var(--color-muted))', fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'rgb(var(--color-faint))', fontSize: 9 }} tickCount={5} />
        <Radar
          dataKey="value"
          stroke="rgb(var(--color-accent))"
          fill="rgb(var(--color-accent))"
          fillOpacity={0.25}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, 'Avance']}
          contentStyle={{
            background: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-subtle))',
            borderRadius: 10,
            fontSize: 12,
            color: 'rgb(var(--color-ink))',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
