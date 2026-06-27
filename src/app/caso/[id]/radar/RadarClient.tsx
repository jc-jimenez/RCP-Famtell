'use client'

import { useState, useEffect, useRef } from 'react'
import {
  SCIAN_SECTORS,
  RADAR_PROFILES,
  type SCIANSector,
  type SCIANSubsector,
} from '@/lib/radar-profiles'

const ESTADOS = [
  { code: '00', name: 'Todo México' },
  { code: '01', name: 'Aguascalientes' },
  { code: '02', name: 'Baja California' },
  { code: '03', name: 'Baja California Sur' },
  { code: '04', name: 'Campeche' },
  { code: '05', name: 'Coahuila' },
  { code: '06', name: 'Colima' },
  { code: '07', name: 'Chiapas' },
  { code: '08', name: 'Chihuahua' },
  { code: '09', name: 'Ciudad de México' },
  { code: '10', name: 'Durango' },
  { code: '11', name: 'Guanajuato' },
  { code: '12', name: 'Guerrero' },
  { code: '13', name: 'Hidalgo' },
  { code: '14', name: 'Jalisco' },
  { code: '15', name: 'Estado de México' },
  { code: '16', name: 'Michoacán' },
  { code: '17', name: 'Morelos' },
  { code: '18', name: 'Nayarit' },
  { code: '19', name: 'Nuevo León' },
  { code: '20', name: 'Oaxaca' },
  { code: '21', name: 'Puebla' },
  { code: '22', name: 'Querétaro' },
  { code: '23', name: 'Quintana Roo' },
  { code: '24', name: 'San Luis Potosí' },
  { code: '25', name: 'Sinaloa' },
  { code: '26', name: 'Sonora' },
  { code: '27', name: 'Tabasco' },
  { code: '28', name: 'Tamaulipas' },
  { code: '29', name: 'Tlaxcala' },
  { code: '30', name: 'Veracruz' },
  { code: '31', name: 'Yucatán' },
  { code: '32', name: 'Zacatecas' },
]

const ESTRATOS = [
  { code: '0', name: 'Todos los tamaños' },
  { code: '2', name: 'Pequeña' },
  { code: '3', name: 'Mediana' },
  { code: '4', name: 'Grande' },
]

interface Empresa {
  Id: string
  Nombre: string
  Razon_social: string
  Clase_actividad: string
  Estrato: string
  Tipo_vialidad: string
  Nombre_vialidad: string
  Numero_Exterior: string
  Nombre_asentamiento: string
  Municipio: string
  Entidad: string
  Codigo_Postal: string
  Telefono: string
  Correo_e: string
  Latitud: string
  Longitud: string
}

interface Props {
  caseId: string
  companyName: string
}

function buildAddress(e: Empresa): string {
  return [
    e.Tipo_vialidad && e.Nombre_vialidad ? `${e.Tipo_vialidad} ${e.Nombre_vialidad} ${e.Numero_Exterior || ''}`.trim() : '',
    e.Nombre_asentamiento ? `Col. ${e.Nombre_asentamiento}` : '',
    e.Municipio,
    e.Entidad,
    e.Codigo_Postal,
  ].filter(Boolean).join(', ')
}

function estratoLabel(e: string) {
  const map: Record<string, string> = { '1': 'Micro', '2': 'Pequeña', '3': 'Mediana', '4': 'Grande' }
  return map[e] ?? e
}

export default function RadarClient({ caseId, companyName }: Props) {
  const defaultProfile = RADAR_PROFILES[0] // Famtell 3PL

  // IA sugerencias
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiSummary, setAiSummary]   = useState<string | null>(null)
  const [aiReasoning, setAiReasoning] = useState<{ code: string; reason: string }[]>([])

  async function suggestWithAI() {
    setAiLoading(true)
    setAiSummary(null)
    setAiReasoning([])
    try {
      const res = await fetch('/api/radar/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      })
      const json = await res.json()
      if (res.ok && json.codes?.length) {
        setSelectedCodes(json.codes)
        setAiReasoning(json.reasoning ?? [])
        setAiSummary(json.summary ?? null)
        // Expandir el primer sector que tenga códigos seleccionados
        const firstMatch = SCIAN_SECTORS.find(s => s.subsectors.some(sub => json.codes.includes(sub.code)))
        if (firstMatch) setSelectedSector(firstMatch)
      } else {
        setAiSummary('No se pudo generar sugerencias. Verifica que el brief esté completo.')
      }
    } catch {
      setAiSummary('Error al conectar con el servicio de IA.')
    }
    setAiLoading(false)
  }

  // Modo
  const [searchMode, setSearchMode] = useState<'scian' | 'nombre'>('scian')

  // Filtros SCIAN
  const [profileId, setProfileId]       = useState(defaultProfile.id)
  const [selectedSector, setSelectedSector] = useState<SCIANSector | null>(null)
  const [selectedCodes, setSelectedCodes]   = useState<string[]>([])
  const [entidad, setEntidad]               = useState('00')
  const [estrato, setEstrato]               = useState('0')

  // Modo nombre
  const [keyword, setKeyword] = useState('')

  // Resultados
  const [results, setResults]   = useState<Empresa[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [view, setView]         = useState<'list' | 'map'>('list')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [msg, setMsg]           = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const [page, setPage]         = useState(1)
  const PAGE_SIZE = 50

  const mapRef    = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)

  const profile = RADAR_PROFILES.find(p => p.id === profileId) ?? defaultProfile

  function toggleCode(code: string) {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  function selectAll(codes: string[]) {
    setSelectedCodes(prev => {
      const allSelected = codes.every(c => prev.includes(c))
      if (allSelected) return prev.filter(c => !codes.includes(c))
      return [...new Set([...prev, ...codes])]
    })
  }

  // Al cambiar perfil, pre-seleccionar códigos recomendados
  useEffect(() => {
    const p = RADAR_PROFILES.find(r => r.id === profileId)
    if (p && p.recommendedCodes.length > 0) {
      setSelectedCodes(p.recommendedCodes)
    } else {
      setSelectedCodes([])
    }
    setSelectedSector(null)
  }, [profileId])

  async function search() {
    if (searchMode === 'scian' && selectedCodes.length === 0) return
    if (searchMode === 'nombre' && !keyword.trim()) return

    setLoading(true)
    setError(null)
    setResults([])
    setPage(1)

    if (searchMode === 'nombre') {
      const params = new URLSearchParams({ mode: 'nombre', keyword, entidad, inicio: '1', fin: String(PAGE_SIZE) })
      const res = await fetch(`/api/radar/search?${params}`)
      const json = await res.json()
      if (!res.ok || json.error) setError(json.error ?? 'Error al buscar')
      else {
        setResults(json.results ?? [])
        if (!json.results?.length) setError('Sin resultados. Prueba con otro término o estado.')
      }
      setLoading(false)
      return
    }

    // Modo SCIAN: buscar cada código seleccionado en paralelo (máx 5 a la vez)
    const allResults: Empresa[] = []
    const batches: string[][] = []
    for (let i = 0; i < selectedCodes.length; i += 5) batches.push(selectedCodes.slice(i, i + 5))

    for (const batch of batches) {
      const fetches = batch.map(code => {
        const params = new URLSearchParams({ mode: 'scian', cveAct: code, entidad, estrato, inicio: '1', fin: '20' })
        return fetch(`/api/radar/search?${params}`).then(r => r.json()).catch(() => ({ results: [] }))
      })
      const responses = await Promise.all(fetches)
      for (const json of responses) {
        if (json.results) allResults.push(...json.results)
      }
    }

    // Deduplicar por Id
    const seen = new Set<string>()
    const unique = allResults.filter(e => { if (seen.has(e.Id)) return false; seen.add(e.Id); return true })

    setResults(unique)
    if (unique.length === 0) setError('Sin resultados. Ajusta los filtros o selecciona más subsectores.')
    setLoading(false)
  }

  async function addToCRM(e: Empresa) {
    setAddingId(e.Id)
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        name: e.Nombre || e.Razon_social,
        company: e.Razon_social || e.Nombre,
        role: e.Clase_actividad,
        phone: e.Telefono || null,
        email: e.Correo_e || null,
        relationship_type: 'prospect',
        notes: `Sector SCIAN: ${e.Clase_actividad}. ${buildAddress(e)}. Tamaño: ${estratoLabel(e.Estrato)}. Fuente: DENUE/INEGI`,
        pipeline_stage: 'pending',
      }),
    })
    const json = await res.json()
    setAddingId(null)
    if (res.ok) {
      setAddedIds(prev => new Set([...prev, e.Id]))
      setMsg({ id: e.Id, text: 'Agregado al CRM', ok: true })
    } else {
      setMsg({ id: e.Id, text: json.error ?? 'Error al agregar', ok: false })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  // Mapa Leaflet
  useEffect(() => {
    if (view !== 'map' || !mapRef.current || results.length === 0) return
    const withCoords = results.filter(e => e.Latitud && e.Longitud)
    if (withCoords.length === 0) return

    import('leaflet').then(L => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null }
      const map = L.map(mapRef.current!, { scrollWheelZoom: true })
      leafletRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap · DENUE/INEGI', maxZoom: 18,
      }).addTo(map)
      const bounds: [number, number][] = []
      withCoords.forEach(e => {
        const lat = parseFloat(e.Latitud), lng = parseFloat(e.Longitud)
        if (isNaN(lat) || isNaN(lng)) return
        bounds.push([lat, lng])
        L.marker([lat, lng]).bindPopup(`
          <div style="font-family:sans-serif;min-width:180px;">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">${e.Nombre || e.Razon_social}</p>
            <p style="font-size:11px;color:#64748b;margin:0 0 4px">${e.Clase_actividad}</p>
            ${e.Telefono ? `<p style="font-size:11px;margin:0">📞 ${e.Telefono}</p>` : ''}
            <p style="font-size:11px;color:#64748b;margin:4px 0 0">${e.Municipio}, ${e.Entidad}</p>
          </div>`
        ).addTo(map)
      })
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] })
    })
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null } }
  }, [view, results])

  const paged = results.slice(0, page * PAGE_SIZE)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Radar de Prospectos</h2>
            <p className="text-xs text-muted mt-0.5">
              Encuentra empresas objetivo usando el directorio DENUE del INEGI
            </p>
          </div>
          {/* Toggle modo */}
          <div className="flex gap-1 border border-subtle rounded-xl p-0.5 bg-surface">
            <button
              onClick={() => setSearchMode('scian')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${searchMode === 'scian' ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
            >
              Por sector SCIAN
            </button>
            <button
              onClick={() => setSearchMode('nombre')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${searchMode === 'nombre' ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
            >
              Por nombre
            </button>
          </div>
        </div>

        {/* ── Modo SCIAN ── */}
        {searchMode === 'scian' && (
          <div className="space-y-4">

            {/* Perfil */}
            <div>
              <p className="text-xs font-medium text-muted mb-1.5">Perfil de búsqueda</p>
              <div className="flex gap-2 flex-wrap">
                {RADAR_PROFILES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProfileId(p.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${profileId === p.id ? 'bg-accent text-white border-accent' : 'border-subtle text-muted hover:text-ink hover:border-accent/40'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {profile.description && (
                <p className="text-xs text-muted mt-1.5 italic">{profile.description}</p>
              )}

              {/* Botón IA */}
              <button
                onClick={suggestWithAI}
                disabled={aiLoading}
                className="mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-accent/30 text-accent bg-accent-soft hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
              >
                {aiLoading
                  ? <><span className="animate-spin">⟳</span> Analizando el diagnóstico…</>
                  : <>✨ Sugerir sectores con IA</>
                }
              </button>

              {/* Panel de razonamiento IA */}
              {aiSummary && (
                <div className="mt-2 rounded-xl border border-accent/20 bg-accent-soft/40 p-3 space-y-2">
                  <p className="text-xs font-medium text-accent">✨ Sugerencia de IA</p>
                  <p className="text-xs text-ink">{aiSummary}</p>
                  {aiReasoning.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {aiReasoning.map(r => (
                        <div key={r.code} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-accent shrink-0">{r.code}</span>
                          <span className="text-muted">{r.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Árbol SCIAN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-muted">Sectores y subsectores</p>
                {selectedCodes.length > 0 && (
                  <span className="text-xs text-accent font-medium">{selectedCodes.length} seleccionados</span>
                )}
              </div>

              <div className="space-y-2">
                {SCIAN_SECTORS.map(sector => {
                  const isOpen = selectedSector?.code === sector.code
                  const sectorCodes = sector.subsectors.map(s => s.code)
                  const selectedInSector = sectorCodes.filter(c => selectedCodes.includes(c))
                  const allSelected = sectorCodes.every(c => selectedCodes.includes(c))

                  return (
                    <div key={sector.code} className="border border-subtle rounded-xl overflow-hidden">
                      {/* Cabecera sector */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-surface">
                        <button
                          onClick={() => setSelectedSector(isOpen ? null : sector)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          <span className="text-base">{sector.icon}</span>
                          <span className="text-xs font-semibold text-ink">{sector.name}</span>
                          <span className="text-xs text-faint">({sector.code}xx)</span>
                          {selectedInSector.length > 0 && (
                            <span className="ml-1 text-xs bg-accent text-white rounded-full px-1.5 py-0.5">
                              {selectedInSector.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => selectAll(sectorCodes)}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${allSelected ? 'border-accent text-accent' : 'border-subtle text-muted hover:text-ink'}`}
                        >
                          {allSelected ? 'Quitar todos' : 'Todos'}
                        </button>
                        <button
                          onClick={() => setSelectedSector(isOpen ? null : sector)}
                          className="text-muted hover:text-ink text-xs ml-1"
                        >
                          {isOpen ? '▲' : '▼'}
                        </button>
                      </div>

                      {/* Subsectores */}
                      {isOpen && (
                        <div className="px-3 pb-3 pt-1 grid grid-cols-1 gap-1 border-t border-subtle bg-white">
                          {sector.subsectors.map(sub => {
                            const isRec = profile.recommendedCodes.includes(sub.code)
                            const isAI  = aiReasoning.some(r => r.code === sub.code)
                            const isSelected = selectedCodes.includes(sub.code)
                            return (
                              <label
                                key={sub.code}
                                className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-accent-soft' : 'hover:bg-surface'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleCode(sub.code)}
                                  className="mt-0.5 accent-accent"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-medium text-ink">{sub.name}</span>
                                    <span className="text-xs text-faint font-mono">{sub.code}</span>
                                    {isAI && (
                                      <span className="text-xs bg-accent/10 text-accent px-1.5 rounded-full font-medium">✨ IA</span>
                                    )}
                                    {isRec && !isAI && (
                                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">★ Perfil</span>
                                    )}
                                  </div>
                                  {sub.pitch && (
                                    <p className="text-xs text-muted mt-0.5">{sub.pitch}</p>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Filtros geo/tamaño */}
            <div className="flex gap-2 flex-wrap">
              <select className="input flex-1 min-w-[180px] text-sm" value={entidad} onChange={e => setEntidad(e.target.value)}>
                {ESTADOS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              <select className="input w-44 text-sm" value={estrato} onChange={e => setEstrato(e.target.value)}>
                {ESTRATOS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              <button
                onClick={search}
                disabled={loading || selectedCodes.length === 0}
                className="btn-primary text-sm px-6 disabled:opacity-50"
              >
                {loading ? 'Buscando…' : `Buscar${selectedCodes.length > 0 ? ` (${selectedCodes.length} subsectores)` : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Modo nombre ── */}
        {searchMode === 'nombre' && (
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              className="input flex-1 min-w-[200px] text-sm"
              placeholder="Ej: Grupo Bimbo, FEMSA, Lala…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
            <select className="input w-48 text-sm" value={entidad} onChange={e => setEntidad(e.target.value)}>
              {ESTADOS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <button
              onClick={search}
              disabled={loading || !keyword.trim()}
              className="btn-primary text-sm px-5 disabled:opacity-50"
            >
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted">{results.length} empresas encontradas</p>
            <div className="flex gap-1">
              <button
                onClick={() => setView('list')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${view === 'list' ? 'bg-accent text-white border-accent' : 'border-subtle text-muted hover:text-ink'}`}
              >Lista</button>
              <button
                onClick={() => setView('map')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${view === 'map' ? 'bg-accent text-white border-accent' : 'border-subtle text-muted hover:text-ink'}`}
              >Mapa</button>
            </div>
          </div>

          {/* Lista */}
          {view === 'list' && (
            <div className="space-y-2">
              {paged.map(e => {
                const isAdded  = addedIds.has(e.Id)
                const isAdding = addingId === e.Id
                const feedback = msg?.id === e.Id ? msg : null
                return (
                  <div key={e.Id} className="card p-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                      {(e.Nombre || e.Razon_social || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{e.Nombre || e.Razon_social}</p>
                      {e.Razon_social && e.Nombre && e.Razon_social !== e.Nombre && (
                        <p className="text-xs text-muted truncate">{e.Razon_social}</p>
                      )}
                      <p className="text-xs text-faint mt-0.5 truncate">{e.Clase_actividad}</p>
                      <p className="text-xs text-faint">{e.Municipio}{e.Entidad ? `, ${e.Entidad}` : ''}{e.Codigo_Postal ? ` CP ${e.Codigo_Postal}` : ''}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {e.Telefono && <span className="text-xs text-muted">📞 {e.Telefono}</span>}
                        {e.Estrato && <span className="text-xs bg-surface border border-subtle rounded px-1.5 py-0.5 text-faint">{estratoLabel(e.Estrato)}</span>}
                        {feedback && (
                          <span className={`text-xs font-medium ${feedback.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                            {feedback.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => !isAdded && addToCRM(e)}
                      disabled={isAdded || isAdding}
                      className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap flex-shrink-0 transition-colors ${
                        isAdded ? 'border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default' : 'btn-secondary'
                      }`}
                    >
                      {isAdding ? '…' : isAdded ? '✓ En CRM' : '+ CRM'}
                    </button>
                  </div>
                )
              })}

              {paged.length < results.length && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full py-3 text-xs text-muted border border-subtle rounded-xl hover:text-ink hover:border-accent/40 transition-colors"
                >
                  Ver más ({results.length - paged.length} restantes)
                </button>
              )}
            </div>
          )}

          {/* Mapa */}
          {view === 'map' && (
            <>
              <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
              <div ref={mapRef} className="w-full rounded-2xl border border-subtle overflow-hidden" style={{ height: 480 }} />
              {results.filter(e => e.Latitud && e.Longitud).length === 0 && (
                <p className="text-xs text-muted text-center mt-2">Estos resultados no tienen coordenadas disponibles en DENUE.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {results.length === 0 && !loading && !error && (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-sm font-medium text-ink">Selecciona sectores y busca prospectos</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            El perfil <strong>Famtell 3PL</strong> ya tiene pre-seleccionados los subsectores con mayor potencial de necesitar operación logística tercerizada.
          </p>
        </div>
      )}

    </div>
  )
}
