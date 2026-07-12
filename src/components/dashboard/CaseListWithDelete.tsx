'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CaseItem {
  id: string
  company_name: string
  industry: string | null
  status: string
  created_at: string
  credits_used: number
}

const STATUS_STYLES: Record<string, string> = {
  active: 'badge-success',
  completed: 'badge-info',
  archived: 'badge-neutral',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
}

export default function CaseListWithDelete({ initialCases }: { initialCases: CaseItem[] }) {
  const [cases, setCases] = useState(initialCases)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function deleteCase(caseId: string) {
    setDeletingId(caseId)
    try {
      let res = await fetch('/api/cases', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      })
      if (res.status === 409) {
        const data = await res.json()
        if (!confirm(data.message ?? '¿Eliminar este caso?')) return
        res = await fetch('/api/cases', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId, confirm: true }),
        })
      }
      if (res.ok) setCases(prev => prev.filter(c => c.id !== caseId))
    } finally {
      setDeletingId(null)
    }
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-subtle bg-surface-2 p-12 text-center">
        <p className="text-ink font-medium mb-2">Aún no tienes casos</p>
        <p className="text-faint text-sm mb-6">Crea tu primer caso de diagnóstico para comenzar</p>
        <Link href="/dashboard/nuevo-caso" className="btn-primary inline-flex text-sm">
          Crear primer caso
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cases.map(caso => (
        <div key={caso.id} className="relative card p-5 hover:shadow-card-hover transition-shadow group">
          <Link href={`/dashboard/caso/${caso.id}`} className="block">
            <div className="flex items-start justify-between gap-3 pr-7">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink group-hover:text-accent transition-colors truncate">
                  {caso.company_name}
                </h3>
                {caso.industry && (
                  <p className="text-faint text-xs mt-0.5">{caso.industry}</p>
                )}
              </div>
              <span className={`badge ${STATUS_STYLES[caso.status] ?? STATUS_STYLES.archived}`}>
                {STATUS_LABELS[caso.status] ?? caso.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-faint">
              <span>{new Date(caso.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {caso.credits_used > 0 && (
                <span>{caso.credits_used} créditos usados</span>
              )}
            </div>
          </Link>
          <button
            onClick={() => deleteCase(caso.id)}
            disabled={deletingId === caso.id}
            className="absolute top-4 right-4 text-xs px-1.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Eliminar caso"
          >
            {deletingId === caso.id ? '…' : '🗑'}
          </button>
        </div>
      ))}
    </div>
  )
}
