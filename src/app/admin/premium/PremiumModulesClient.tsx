'use client'

import { useState } from 'react'
import Link from 'next/link'

const PREMIUM_MODULES = [
  { code: 'A', name: 'Inteligencia Comercial', desc: 'Análisis avanzado de pipeline y conversión' },
  { code: 'B', name: 'Talento & Cultura', desc: 'Diagnóstico de equipo y engagement' },
  { code: 'C', name: 'Operaciones & Procesos', desc: 'Mapeo y optimización de flujos' },
  { code: 'D', name: 'M&A Readiness', desc: 'Preparación para fusión o adquisición' },
  { code: 'E', name: 'Transformación Digital', desc: 'Hoja de ruta tecnológica' },
  { code: 'F', name: 'Internacionalización', desc: 'Expansión a nuevos mercados' },
  { code: 'G', name: 'Sostenibilidad & ESG', desc: 'Estrategia de impacto y gobierno' },
]

interface Account { id: string; email: string; company_name: string; subscription_plan: string }
interface PremiumModule { id: string; account_id: string; module_code: string; activated_at: string }
interface Props { accounts: Account[]; premiumModules: PremiumModule[] }

export default function PremiumModulesClient({ accounts, premiumModules: initial }: Props) {
  const [modules, setModules] = useState<PremiumModule[]>(initial)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [activating, setActivating] = useState<string | null>(null)

  const accountModules = new Set(
    modules.filter(m => m.account_id === selectedAccount).map(m => m.module_code)
  )

  async function toggleModule(code: string) {
    if (!selectedAccount) return
    setActivating(code)

    const isActive = accountModules.has(code)
    const res = await fetch('/api/admin/premium', {
      method: isActive ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: selectedAccount, moduleCode: code }),
    })
    const data = await res.json()
    setActivating(null)

    if (res.ok) {
      if (isActive) {
        setModules(prev => prev.filter(m => !(m.account_id === selectedAccount && m.module_code === code)))
      } else {
        setModules(prev => [...prev, data.module])
      }
    }
  }

  const selectedAcc = accounts.find(a => a.id === selectedAccount)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href={'/admin' as any} className="text-xs text-slate-500 hover:text-slate-300">← Panel</Link>
        <h1 className="text-2xl font-bold text-white mt-1">Módulos Premium</h1>
        <p className="text-slate-400 text-sm mt-0.5">Activa módulos A-G por cuenta de consultor</p>
      </div>

      {/* Selector de consultor */}
      <div className="card p-4">
        <label className="label-text mb-2 block">Seleccionar consultor</label>
        <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="input-field">
          <option value="">— Elige un consultor —</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.company_name} ({a.email})</option>
          ))}
        </select>
        {selectedAcc && (
          <p className="text-xs text-slate-500 mt-2">Plan: <span className="text-slate-300 capitalize">{selectedAcc.subscription_plan}</span></p>
        )}
      </div>

      {/* Grid de módulos */}
      {selectedAccount && (
        <div className="grid sm:grid-cols-2 gap-3">
          {PREMIUM_MODULES.map((m) => {
            const active = accountModules.has(m.code)
            const loading = activating === m.code
            return (
              <div key={m.code} className={`card p-4 border transition-colors ${
                active ? 'border-purple-700/60 bg-purple-950/20' : 'border-slate-800'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center ${
                        active ? 'bg-purple-800 text-purple-200' : 'bg-slate-800 text-slate-400'
                      }`}>{m.code}</span>
                      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>{m.name}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 ml-8">{m.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleModule(m.code)}
                    disabled={loading}
                    className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      active
                        ? 'border-red-800/60 text-red-300 hover:bg-red-950/40'
                        : 'border-purple-700/60 text-purple-300 hover:bg-purple-950/40'
                    }`}
                  >
                    {loading ? '…' : active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!selectedAccount && (
        <div className="card p-12 text-center">
          <p className="text-slate-500">Selecciona un consultor para gestionar sus módulos premium</p>
        </div>
      )}
    </div>
  )
}
