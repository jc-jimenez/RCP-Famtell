'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  caseId: string
  companyName: string
  caseType: 'empresa' | 'departamento'
  departmentName: string | null
}

export default function GenerateCatalogPanel({ caseId, companyName, caseType, departmentName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/consultant/case-catalog/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'No se pudo generar el catálogo')
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="card p-8 text-center max-w-lg mx-auto">
      <p className="text-3xl mb-3">✨</p>
      <h2 className="text-lg font-bold text-ink mb-2">Genera el catálogo de este caso con IA</h2>
      <p className="text-sm text-muted mb-1">
        {caseType === 'departamento'
          ? `Este caso diagnostica el departamento "${departmentName}" de ${companyName}.`
          : `Este caso diagnostica a ${companyName}.`}
      </p>
      <p className="text-sm text-muted mb-6">
        La IA va a diseñar los módulos, secciones y preguntas a la medida de este contexto — después podrás editarlos y mapearlos a puestos igual que en cualquier caso.
      </p>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</p>}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="btn-primary disabled:opacity-50"
      >
        {loading ? 'Generando… (puede tardar un minuto)' : 'Generar catálogo con IA'}
      </button>
    </div>
  )
}
