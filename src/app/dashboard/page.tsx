export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
          <h1 className="text-4xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-slate-400">Panel de control principal para consultores y administradores.</p>
        </header>
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">Resumen de casos</div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">Resumen de créditos</div>
        </section>
      </div>
    </div>
  );
}
