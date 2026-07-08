'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import AppShell from '@/components/shared/AppShell'
import Link from 'next/link'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro:     'Pro',
  enterprise: 'Enterprise',
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-surface-2 text-muted',
  pro:     'bg-accent-soft text-accent',
  enterprise: 'bg-amber-50 text-amber-700',
}

export default function SettingsPage() {
  const [account, setAccount]         = useState<any>(null)
  const [companyName, setCompanyName] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  const [currentPw, setCurrentPw]     = useState('')
  const [newPw, setNewPw]             = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [pwMsg, setPwMsg]             = useState('')
  const [pwSaving, setPwSaving]       = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetch('/api/account')
      .then(r => r.json())
      .then(({ account }) => {
        setAccount(account)
        setCompanyName(account?.company_name ?? '')
      })
  }, [])

  async function saveProfile() {
    setSaving(true)
    await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function changePassword() {
    if (newPw !== confirmPw) { setPwMsg('Las contraseñas no coinciden.'); return }
    if (newPw.length < 8)    { setPwMsg('Mínimo 8 caracteres.'); return }
    setPwSaving(true)
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) { setPwMsg(error.message); return }
    setPwMsg('✓ Contraseña actualizada correctamente.')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  }

  const creditsTotal = account?.credits_total ?? 0
  const creditsUsed  = account?.credits_used  ?? 0
  const creditsLeft  = creditsTotal - creditsUsed
  const pct          = creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0
  const plan         = account?.plan_id ?? 'starter'

  return (
    <AppShell email={account?.email ?? ''} role="consultant">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-ink">Configuración</h1>
          <p className="text-sm text-muted mt-0.5">Gestiona tu cuenta, seguridad y plan.</p>
        </div>

        {/* ── Perfil ── */}
        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Perfil</h2>

          <div>
            <label className="text-xs text-muted block mb-1">Email</label>
            <input
              className="input-field w-full text-sm bg-surface-2 text-faint cursor-not-allowed"
              value={account?.email ?? ''}
              disabled
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Nombre de empresa / consultoría</label>
            <input
              className="input-field w-full text-sm"
              placeholder="Ej. Estrategia & Crecimiento S.A."
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {saved && <span className="text-xs text-emerald-600">✓ Guardado</span>}
          </div>
        </section>

        {/* ── Seguridad ── */}
        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Seguridad</h2>

          <div>
            <label className="text-xs text-muted block mb-1">Nueva contraseña</label>
            <input
              type="password"
              className="input-field w-full text-sm"
              placeholder="Mínimo 8 caracteres"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Confirmar contraseña</label>
            <input
              type="password"
              className="input-field w-full text-sm"
              placeholder="Repite la contraseña"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
            />
          </div>

          {pwMsg && (
            <p className={`text-xs ${pwMsg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-500'}`}>
              {pwMsg}
            </p>
          )}

          <button
            onClick={changePassword}
            disabled={pwSaving || !newPw || !confirmPw}
            className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
          >
            {pwSaving ? 'Actualizando…' : 'Cambiar contraseña'}
          </button>
        </section>

        {/* ── Plan y créditos ── */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Plan y créditos</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[plan] ?? PLAN_COLORS.starter}`}>
              {PLAN_LABELS[plan] ?? plan}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>Créditos usados</span>
              <span className="font-medium text-ink">{creditsUsed} / {creditsTotal}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#6366f1',
                }}
              />
            </div>
            <p className="text-xs text-muted">
              {creditsLeft} créditos disponibles
            </p>
          </div>

          {plan === 'starter' && (
            <Link href="/dashboard/creditos" className="btn-primary text-sm px-4 py-2 inline-block">
              Subir a Pro →
            </Link>
          )}

          <div className="pt-2 border-t border-subtle">
            <p className="text-xs text-faint">
              Miembro desde {account?.created_at
                ? new Date(account.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })
                : '—'}
            </p>
          </div>
        </section>

        {/* ── Zona de peligro ── */}
        <section className="card p-5 space-y-3 border-rose-200">
          <h2 className="text-sm font-semibold text-rose-600">Zona de peligro</h2>
          <p className="text-xs text-muted">
            Si deseas cancelar tu cuenta o eliminar todos tus datos, contáctanos en{' '}
            <a href="mailto:soporte@bizdoctor.site" className="text-accent underline">
              soporte@bizdoctor.site
            </a>
          </p>
        </section>

      </div>
    </AppShell>
  )
}
