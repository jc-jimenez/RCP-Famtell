import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AppShell from '@/components/shared/AppShell'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminFacturacionPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    redirect('/login')
  }

  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO)

  return (
    <AppShell role="super_admin" email={session.user.email!}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href={'/admin' as any} className="text-xs text-slate-500 hover:text-slate-300">← Panel</Link>
          <h1 className="text-2xl font-bold text-white mt-1">Facturación</h1>
        </div>

        {!stripeConfigured && (
          <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
            <p className="text-sm font-semibold text-amber-300 mb-2">Stripe no configurado</p>
            <p className="text-xs text-amber-200/70 mb-3">Para activar pagos, agrega las siguientes variables en .env.local:</p>
            <pre className="text-xs bg-slate-900 rounded-lg p-3 text-slate-300 overflow-x-auto">{`STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`}</pre>
          </div>
        )}

        {stripeConfigured && (
          <div className="card p-6 text-center space-y-3">
            <p className="text-slate-300 text-sm">Accede al dashboard de Stripe para ver pagos, suscripciones y facturas.</p>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block btn-primary text-sm bg-[#635bff]"
            >
              Abrir Stripe Dashboard →
            </a>
          </div>
        )}

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Configuración de precios</h2>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Plan Starter</span>
              <span className="text-slate-300">$299/mes · 100 créditos</span>
            </div>
            <div className="flex justify-between">
              <span>Plan Pro</span>
              <span className="text-slate-300">$699/mes · 500 créditos</span>
            </div>
            <div className="flex justify-between">
              <span>Plan Enterprise</span>
              <span className="text-slate-300">Contactar · 2000 créditos</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
