'use client'

// Vista previa ilustrativa del producto para el panel central del login:
// "TÚ" al mando → 4 frentes del negocio → IA que los analiza → un
// adelanto del Centro de Control. Los números del Centro de Control son
// de ejemplo a propósito (nadie ha iniciado sesión todavía, no hay un
// caso real que mostrar) — por eso lleva la etiqueta "Vista previa" bien
// visible, para que nunca se lea como un dato real de alguien.

import ModuleRadarChart from './ModuleRadarChart'

// Clases completas y estáticas a propósito — Tailwind JIT no detecta
// nombres de clase armados en runtime con template strings.
const CATEGORIES = [
  { icon: '👥', badge: 'bg-role-consultor-soft text-role-consultor', label: 'Comercial', desc: 'Más y mejores clientes' },
  { icon: '💰', badge: 'bg-role-directivo-soft text-role-directivo', label: 'Finanzas', desc: 'Rentabilidad y control' },
  { icon: '⚙️', badge: 'bg-role-colaborador-soft text-role-colaborador', label: 'Operaciones', desc: 'Procesos escalables' },
  { icon: '💡', badge: 'bg-role-admin-soft text-role-admin', label: 'Estrategia', desc: 'Decisiones inteligentes' },
]

const RADAR_SAMPLE = [
  { axis: 'Finanzas', value: 72 },
  { axis: 'Comercial', value: 65 },
  { axis: 'Operaciones', value: 58 },
  { axis: 'Capital Humano', value: 80 },
  { axis: 'Estrategia', value: 70 },
]

export default function BizdoctorProductPreview() {
  return (
    <div className="relative flex flex-col items-center">
      {/* TÚ */}
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-role-consultor-soft text-role-consultor flex items-center justify-center text-2xl">
          🙂
        </div>
        <p className="mt-2 text-sm font-bold text-ink">TÚ</p>
        <p className="text-xs text-muted">Lideras el cambio</p>
      </div>

      <div className="h-6 w-px border-l border-dashed border-subtle" />

      {/* 4 frentes del negocio */}
      <div className="grid grid-cols-4 gap-2.5 w-full max-w-sm">
        {CATEGORIES.map((c) => (
          <div key={c.label} className="flex flex-col items-center text-center">
            <div className="w-6 h-px border-t border-dashed border-subtle mb-1.5" />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${c.badge}`}>
              {c.icon}
            </div>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-ink">{c.label}</p>
            <p className="text-[10px] text-faint leading-tight">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="h-6 w-px border-l border-dashed border-subtle" />

      {/* IA */}
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold shadow-card">
          IA
        </div>
        <p className="mt-2 text-xs text-muted text-center max-w-[160px]">Inteligencia Artificial que analiza y recomienda</p>
      </div>

      <div className="h-6 w-px border-l border-dashed border-subtle" />

      {/* Adelanto del Centro de Control */}
      <div className="w-full max-w-sm rounded-2xl border border-subtle bg-surface shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-subtle">
          <p className="text-xs font-bold text-ink">Centro de Control</p>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-faint bg-surface-2 rounded-full px-2 py-0.5">Vista previa</span>
        </div>

        <div className="grid grid-cols-4 gap-px bg-subtle">
          {[
            { label: 'Salud', value: '—', sub: 'Tu caso' },
            { label: 'Riesgos', value: '—', sub: 'Detectados' },
            { label: 'Prioridades', value: '—', sub: 'Sugeridas' },
            { label: 'Avance', value: '—', sub: 'En curso' },
          ].map((k) => (
            <div key={k.label} className="bg-surface px-2 py-2.5 text-center">
              <p className="text-sm font-bold text-ink">{k.value}</p>
              <p className="text-[9px] font-semibold text-muted">{k.label}</p>
              <p className="text-[8px] text-faint">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="px-3 pt-1">
          <p className="text-[10px] text-faint text-center pt-2">Ejemplo ilustrativo — tus números reales aparecen aquí en cuanto empiezas tu diagnóstico</p>
          <ModuleRadarChart data={RADAR_SAMPLE} height={150} />
        </div>
      </div>
    </div>
  )
}
