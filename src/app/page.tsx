import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/80 p-12 shadow-2xl shadow-slate-950/40">
        <h1 className="text-5xl font-semibold tracking-tight text-white">RCP.ai</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">
          Plataforma SaaS multi-tenant de diagnóstico empresarial con IA, créditos internos y módulos premium.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link className="rounded-2xl bg-slate-700 px-6 py-5 text-base font-medium text-white transition hover:bg-slate-600" href="/dashboard">
            Ir al dashboard
          </Link>
          <Link className="rounded-2xl border border-slate-700 px-6 py-5 text-base font-medium text-slate-200 transition hover:bg-slate-800" href="/settings">
            Configuración
          </Link>
        </div>
      </div>
    </main>
  );
}
