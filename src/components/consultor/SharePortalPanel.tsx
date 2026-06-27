'use client'

import { useState, useEffect } from 'react'

interface ShareLink {
  id: string
  token: string
  label: string | null
  expires_at: string
  active: boolean
  created_at: string
}

interface Props {
  caseId: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SharePortalPanel({ caseId }: Props) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetchLinks()
  }, [])

  async function fetchLinks() {
    setLoading(true)
    const res = await fetch(`/api/share-links?caseId=${caseId}`)
    const json = await res.json()
    setLinks(json.links ?? [])
    setLoading(false)
  }

  async function createLink() {
    setCreating(true)
    const res = await fetch('/api/share-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, label: label.trim() || null }),
    })
    const json = await res.json()
    if (json.link) {
      setLinks(prev => [json.link, ...prev])
      setLabel('')
    }
    setCreating(false)
  }

  async function deactivateLink(id: string) {
    await fetch('/api/share-links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setLinks(prev => prev.map(l => l.id === id ? { ...l, active: false } : l))
  }

  function copyLink(token: string) {
    const url = `${baseUrl}/portal/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeLinks = links.filter(l => l.active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Portal del Cliente</h3>
          <p className="text-xs text-muted mt-0.5">Comparte el avance del diagnóstico con tu cliente</p>
        </div>
      </div>

      {/* Crear link */}
      <div className="bg-surface-2 rounded-xl p-4 space-y-3">
        <p className="text-xs text-muted">El link permite ver el progreso de módulos y el resumen ejecutivo (sin IER ni CRM).</p>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1 text-sm"
            placeholder="Etiqueta opcional (ej: 'Para María González')"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <button
            onClick={createLink}
            disabled={creating}
            className="btn-primary text-sm px-4 whitespace-nowrap"
          >
            {creating ? 'Creando...' : '+ Generar link'}
          </button>
        </div>
      </div>

      {/* Lista de links */}
      {loading ? (
        <p className="text-xs text-muted text-center py-4">Cargando...</p>
      ) : activeLinks.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">Sin links activos. Genera uno arriba.</p>
      ) : (
        <div className="space-y-2">
          {activeLinks.map(link => (
            <div key={link.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {link.label && <p className="text-xs font-medium text-ink truncate">{link.label}</p>}
                <p className="text-xs text-muted font-mono truncate">
                  {baseUrl}/portal/{link.token}
                </p>
                <p className="text-xs text-faint mt-0.5">Expira {formatDate(link.expires_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => copyLink(link.token)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  {copied === link.token ? '✓ Copiado' : 'Copiar link'}
                </button>
                <button
                  onClick={() => deactivateLink(link.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
                  title="Desactivar link"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Links desactivados */}
      {links.filter(l => !l.active).length > 0 && (
        <details className="text-xs text-muted cursor-pointer">
          <summary className="select-none">Links desactivados ({links.filter(l => !l.active).length})</summary>
          <div className="mt-2 space-y-1">
            {links.filter(l => !l.active).map(link => (
              <div key={link.id} className="flex items-center gap-2 opacity-50">
                <span className="font-mono truncate flex-1">/portal/{link.token.slice(0, 8)}...</span>
                <span className="text-faint">{formatDate(link.created_at)}</span>
                <span className="text-red-400">Desactivado</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
