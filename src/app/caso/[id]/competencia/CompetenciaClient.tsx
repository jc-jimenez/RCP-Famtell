'use client'

import { useState, useId } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import DirectorTabs from '@/components/director/DirectorTabs'
import type { UserRole } from '@/types'

interface Props {
  caseId: string
  companyName: string
  role: string
  email: string
}

const ATRIBUTOS = [
  'Precio',
  'Calidad de servicio',
  'Velocidad de entrega',
  'Cobertura geográfica',
  'Tecnología / Sistema',
  'Reputación de marca',
  'Capacidad instalada',
  'Atención al cliente',
]

type Puntaje = Record<string, number> // atributo → 1-5

interface Competidor {
  id: string
  nombre: string
  tipo: 'directo' | 'indirecto' | 'potencial'
  notas: string
  puntajes: Puntaje
  fortalezas: string
  debilidades: string
  amenaza: 'alta' | 'media' | 'baja'
}

const TIPO_LABEL: Record<string, string> = {
  directo: 'Directo', indirecto: 'Indirecto', potencial: 'Potencial',
}
const AMENAZA_COLOR: Record<string, string> = {
  alta: 'text-rose-600 bg-rose-50 border-rose-200',
  media: 'text-amber-600 bg-amber-50 border-amber-200',
  baja: 'text-emerald-700 bg-emerald-50 border-emerald-200',
}

const TIPO_COLOR: Record<string, string> = {
  directo: 'bg-rose-50 text-rose-700',
  indirecto: 'bg-amber-50 text-amber-700',
  potencial: 'bg-blue-50 text-blue-700',
}

function newCompetidor(nombre = ''): Competidor {
  const puntajes: Puntaje = {}
  ATRIBUTOS.forEach(a => { puntajes[a] = 3 })
  return {
    id: Math.random().toString(36).slice(2),
    nombre,
    tipo: 'directo',
    notas: '',
    puntajes,
    fortalezas: '',
    debilidades: '',
    amenaza: 'media',
  }
}

function newEmpresa(nombre: string): Competidor {
  const e = newCompetidor(nombre)
  e.tipo = 'directo'
  ATRIBUTOS.forEach(a => { e.puntajes[a] = 3 })
  return e
}

const DOT_COLORS = ['bg-accent', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']
const LINE_COLORS = ['stroke-accent', 'stroke-rose-500', 'stroke-emerald-500', 'stroke-amber-500', 'stroke-purple-500']

export default function CompetenciaClient({ caseId, companyName, role, email }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'
  const isDirector = role === 'director'

  const [empresa, setEmpresa] = useState<Competidor>(() => newEmpresa(companyName))
  const [competidores, setCompetidores] = useState<Competidor[]>([
    newCompetidor('Competidor A'),
    newCompetidor('Competidor B'),
  ])
  const [selectedId, setSelected] = useState(competidores[0].id)
  const [showForm, setShowForm] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [activeTab, setActiveTab] = useState<'tabla' | 'radar' | 'fichas'>('tabla')

  const selected = competidores.find(c => c.id === selectedId)

  function updateEmpresaPuntaje(attr: string, val: number) {
    setEmpresa(prev => ({ ...prev, puntajes: { ...prev.puntajes, [attr]: val } }))
  }

  function updateComp(id: string, field: keyof Competidor, val: any) {
    setCompetidores(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  function updatePuntaje(id: string, attr: string, val: number) {
    setCompetidores(prev => prev.map(c =>
      c.id === id ? { ...c, puntajes: { ...c.puntajes, [attr]: val } } : c
    ))
  }

  function addCompetidor() {
    if (!nuevoNombre.trim()) return
    const c = newCompetidor(nuevoNombre.trim())
    setCompetidores(prev => [...prev, c])
    setSelected(c.id)
    setNuevoNombre('')
    setShowForm(false)
  }

  function removeCompetidor(id: string) {
    setCompetidores(prev => {
      const next = prev.filter(c => c.id !== id)
      if (selectedId === id && next.length > 0) setSelected(next[0].id)
      return next
    })
  }

  // Puntaje promedio
  function avg(puntajes: Puntaje) {
    const vals = Object.values(puntajes)
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }

  // Radar SVG — polígono simple
  const N = ATRIBUTOS.length
  const CX = 120, CY = 120, R = 90
  const allEntities = [empresa, ...competidores]

  function radarPoint(idx: number, val: number, maxVal = 5) {
    const angle = (idx / N) * 2 * Math.PI - Math.PI / 2
    const r = (val / maxVal) * R
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
  }

  function radarPolygon(puntajes: Puntaje) {
    return ATRIBUTOS.map((a, i) => {
      const p = radarPoint(i, puntajes[a] ?? 3)
      return `${p.x},${p.y}`
    }).join(' ')
  }

  const FILL_COLORS = ['fill-accent/10', 'fill-rose-500/10', 'fill-emerald-500/10', 'fill-amber-500/10', 'fill-purple-500/10']
  const STROKE_COLORS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#a855f7']

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName}>
      <div className="max-w-5xl mx-auto space-y-5">

        {isDirector && <DirectorTabs caseId={caseId} />}
        {!isDirector && (
          <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink inline-block">
            ← {companyName}
          </Link>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">Monitor de Competencia</h1>
            <p className="text-sm text-muted mt-1">Mapea y compara tu posicionamiento frente a la competencia</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary text-xs px-3 py-2 flex-shrink-0"
          >
            + Competidor
          </button>
        </div>

        {/* Modal nuevo competidor */}
        {showForm && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="card p-6 w-full max-w-sm space-y-4">
              <h2 className="text-base font-semibold text-ink">Agregar competidor</h2>
              <input
                autoFocus
                type="text"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCompetidor()}
                placeholder="Nombre del competidor"
                className="input-field w-full text-sm"
              />
              <div className="flex gap-2">
                <button onClick={addCompetidor} className="btn-primary text-sm flex-1">Agregar</button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[200px_1fr]">

          {/* ── Sidebar ── */}
          <div className="space-y-1">
            {/* Empresa propia */}
            <button
              onClick={() => setSelected('__empresa__')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                selectedId === '__empresa__' ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                <span className="text-xs font-semibold truncate">{empresa.nombre}</span>
                <span className="text-xs text-faint ml-auto">(tú)</span>
              </div>
            </button>

            <p className="text-xs text-faint px-3 pt-2 pb-1 uppercase tracking-wide">Competidores</p>

            {competidores.map((c, i) => (
              <div key={c.id} className="group relative">
                <button
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                    selectedId === c.id ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[i + 1] ?? 'bg-faint'}`} />
                    <span className="text-xs truncate">{c.nombre}</span>
                  </div>
                  <div className="flex gap-1 mt-1 ml-4">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${AMENAZA_COLOR[c.amenaza]}`}>
                      {c.amenaza}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${TIPO_COLOR[c.tipo]}`}>
                      {TIPO_LABEL[c.tipo]}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => removeCompetidor(c.id)}
                  className="absolute top-2 right-2 text-faint hover:text-rose-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >✕</button>
              </div>
            ))}
          </div>

          {/* ── Panel principal ── */}
          <div className="space-y-4">

            {/* Tabs de vista */}
            <div className="flex gap-1 border-b border-subtle">
              {(['tabla', 'radar', 'fichas'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === t ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
                  }`}>
                  {t === 'tabla' ? 'Tabla comparativa' : t === 'radar' ? 'Radar' : 'Fichas'}
                </button>
              ))}
            </div>

            {/* ── TABLA ── */}
            {activeTab === 'tabla' && (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle">
                      <th className="text-left text-xs text-muted p-3 font-medium w-40">Atributo</th>
                      <th className="text-center text-xs p-3 font-medium text-accent">{empresa.nombre} <span className="text-faint">(tú)</span></th>
                      {competidores.map((c, i) => (
                        <th key={c.id} className={`text-center text-xs p-3 font-medium`}>
                          <span className={`inline-block w-2 h-2 rounded-full ${DOT_COLORS[i + 1]} mr-1`} />
                          {c.nombre}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {ATRIBUTOS.map(attr => (
                      <tr key={attr} className="hover:bg-surface-2/50">
                        <td className="p-3 text-xs text-muted">{attr}</td>
                        {/* Empresa propia */}
                        <td className="p-2 text-center">
                          <div className="flex justify-center gap-0.5">
                            {[1,2,3,4,5].map(v => (
                              <button key={v} onClick={() => updateEmpresaPuntaje(attr, v)}
                                className={`w-5 h-5 rounded text-[10px] font-bold transition-colors ${
                                  empresa.puntajes[attr] >= v ? 'bg-accent text-white' : 'bg-surface-2 text-faint'
                                }`}>{v}</button>
                            ))}
                          </div>
                        </td>
                        {/* Competidores */}
                        {competidores.map(c => (
                          <td key={c.id} className="p-2 text-center">
                            <div className="flex justify-center gap-0.5">
                              {[1,2,3,4,5].map(v => (
                                <button key={v} onClick={() => updatePuntaje(c.id, attr, v)}
                                  className={`w-5 h-5 rounded text-[10px] font-bold transition-colors ${
                                    c.puntajes[attr] >= v ? 'bg-rose-400 text-white' : 'bg-surface-2 text-faint'
                                  }`}>{v}</button>
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Fila promedio */}
                    <tr className="border-t-2 border-subtle bg-surface-2/50">
                      <td className="p-3 text-xs font-semibold text-ink">Promedio</td>
                      <td className="p-3 text-center text-sm font-bold text-accent">
                        {avg(empresa.puntajes).toFixed(1)}
                      </td>
                      {competidores.map(c => (
                        <td key={c.id} className="p-3 text-center text-sm font-bold text-ink">
                          {avg(c.puntajes).toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── RADAR ── */}
            {activeTab === 'radar' && (
              <div className="card p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <svg viewBox="0 0 240 240" className="w-60 h-60 flex-shrink-0">
                    {/* Anillos */}
                    {[1,2,3,4,5].map(level => (
                      <polygon key={level}
                        points={ATRIBUTOS.map((_, i) => {
                          const p = radarPoint(i, level)
                          return `${p.x},${p.y}`
                        }).join(' ')}
                        fill="none" stroke="#e5e7eb" strokeWidth="0.5"
                      />
                    ))}
                    {/* Ejes */}
                    {ATRIBUTOS.map((_, i) => {
                      const p = radarPoint(i, 5)
                      return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="0.5" />
                    })}
                    {/* Polígonos de datos */}
                    {allEntities.map((ent, ei) => (
                      <polygon key={ent.id}
                        points={radarPolygon(ent.puntajes)}
                        fill={STROKE_COLORS[ei] + '18'}
                        stroke={STROKE_COLORS[ei]}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    ))}
                    {/* Etiquetas */}
                    {ATRIBUTOS.map((a, i) => {
                      const p = radarPoint(i, 5.8)
                      return (
                        <text key={i} x={p.x} y={p.y}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize="7" fill="#6b7280"
                        >
                          {a.length > 12 ? a.slice(0, 12) + '…' : a}
                        </text>
                      )
                    })}
                  </svg>

                  {/* Leyenda */}
                  <div className="space-y-2">
                    {allEntities.map((ent, ei) => (
                      <div key={ent.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: STROKE_COLORS[ei] }} />
                        <span className="text-xs text-ink">
                          {ent.nombre}
                          {ent.id === empresa.id && <span className="text-faint ml-1">(tú)</span>}
                        </span>
                        <span className="text-xs font-semibold ml-auto" style={{ color: STROKE_COLORS[ei] }}>
                          {avg(ent.puntajes).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FICHAS ── */}
            {activeTab === 'fichas' && (
              <div className="space-y-4">
                {/* Ficha empresa propia */}
                <div className="card p-5 border-accent/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <h3 className="text-sm font-semibold text-ink">{empresa.nombre} <span className="text-faint text-xs">(tu empresa)</span></h3>
                    <span className="text-xs font-bold text-accent ml-auto">{avg(empresa.puntajes).toFixed(1)}/5</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted block mb-1">Fortalezas clave</label>
                      <textarea rows={2} className="input-field w-full text-sm resize-none"
                        value={empresa.fortalezas}
                        onChange={e => setEmpresa(prev => ({ ...prev, fortalezas: e.target.value }))}
                        placeholder="¿En qué eres mejor?" />
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">Áreas de mejora</label>
                      <textarea rows={2} className="input-field w-full text-sm resize-none"
                        value={empresa.debilidades}
                        onChange={e => setEmpresa(prev => ({ ...prev, debilidades: e.target.value }))}
                        placeholder="¿Qué necesitas reforzar?" />
                    </div>
                  </div>
                </div>

                {/* Fichas de competidores */}
                {competidores.map((c, i) => (
                  <div key={c.id} className="card p-5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`w-2 h-2 rounded-full ${DOT_COLORS[i + 1]}`} />
                      <input
                        className="text-sm font-semibold text-ink bg-transparent border-b border-subtle focus:border-accent outline-none pb-0.5 flex-1 min-w-0"
                        value={c.nombre}
                        onChange={e => updateComp(c.id, 'nombre', e.target.value)}
                      />
                      <select value={c.tipo} onChange={e => updateComp(c.id, 'tipo', e.target.value)}
                        className="input-field text-xs py-1 px-2">
                        <option value="directo">Directo</option>
                        <option value="indirecto">Indirecto</option>
                        <option value="potencial">Potencial</option>
                      </select>
                      <select value={c.amenaza} onChange={e => updateComp(c.id, 'amenaza', e.target.value)}
                        className={`text-xs px-2 py-1 rounded border ${AMENAZA_COLOR[c.amenaza]}`}>
                        <option value="alta">Amenaza alta</option>
                        <option value="media">Amenaza media</option>
                        <option value="baja">Amenaza baja</option>
                      </select>
                      <span className="text-xs font-bold text-muted ml-auto">{avg(c.puntajes).toFixed(1)}/5</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted block mb-1">Fortalezas</label>
                        <textarea rows={2} className="input-field w-full text-sm resize-none"
                          value={c.fortalezas}
                          onChange={e => updateComp(c.id, 'fortalezas', e.target.value)}
                          placeholder="¿Por qué los clientes los eligen?" />
                      </div>
                      <div>
                        <label className="text-xs text-muted block mb-1">Debilidades</label>
                        <textarea rows={2} className="input-field w-full text-sm resize-none"
                          value={c.debilidades}
                          onChange={e => updateComp(c.id, 'debilidades', e.target.value)}
                          placeholder="¿Dónde son vulnerables?" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">Notas adicionales</label>
                      <textarea rows={2} className="input-field w-full text-sm resize-none"
                        value={c.notas}
                        onChange={e => updateComp(c.id, 'notas', e.target.value)}
                        placeholder="Precios, clientes clave, movimientos recientes…" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resumen de posicionamiento */}
            {activeTab === 'tabla' && competidores.length > 0 && (
              <div className="card p-4 bg-accent-soft border-accent/20">
                <h2 className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">Posicionamiento</h2>
                <div className="space-y-2">
                  {ATRIBUTOS.map(attr => {
                    const propio = empresa.puntajes[attr]
                    const mejor = Math.max(...competidores.map(c => c.puntajes[attr]))
                    const diff = propio - mejor
                    return (
                      <div key={attr} className="flex items-center gap-3 text-xs">
                        <span className="text-muted w-36 flex-shrink-0">{attr}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <div className="flex-1 bg-surface rounded-full h-1.5">
                            <div className="bg-accent h-1.5 rounded-full" style={{ width: `${(propio / 5) * 100}%` }} />
                          </div>
                        </div>
                        <span className={`font-semibold w-16 text-right ${
                          diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-600' : 'text-muted'
                        }`}>
                          {diff > 0 ? `+${diff} ventaja` : diff < 0 ? `${diff} brecha` : 'empate'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
