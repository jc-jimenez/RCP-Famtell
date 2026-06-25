import { cookies, headers } from 'next/headers';
import { createServerComponentSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';
import CasesPanel from '@/components/dashboard/CasesPanel';
import AssignedUsersPanel from '@/components/dashboard/AssignedUsersPanel';

export default async function DashboardPage() {
  const supabase = createServerComponentSupabaseClient<Database>({ cookies, headers: () => headers() });
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
          <h1 className="text-3xl font-semibold">Acceso necesario</h1>
          <p className="mt-4 text-slate-400">Debes iniciar sesión para ver el dashboard.</p>
          <a href="/login" className="mt-6 inline-flex rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950">Ir a login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
          <h1 className="text-4xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-slate-400">Bienvenido, {data.session.user.email}</p>
        </header>
        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <CasesPanel />
            <AssignedUsersPanel />
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">Resumen de créditos</div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold">Crear caso</h2>
              <div className="mt-4">
                <form action="/api/cases" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Nombre del caso</label>
                    <input
                      name="companyName"
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                      placeholder="Empresa Ejemplo S.A."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Industria</label>
                    <input
                      name="industry"
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                      placeholder="Logística / 3PL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Descripción</label>
                    <textarea
                      name="description"
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                      placeholder="Breve descripción del caso"
                    />
                  </div>

                  <button type="submit" className="inline-flex rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
                    Crear caso
                  </button>
                </form>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold">Asignar usuario</h2>
              <div className="mt-4">
                <form action="/api/case-users" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">ID del caso</label>
                    <input
                      name="caseId"
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                      placeholder="UUID del caso"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">ID del usuario</label>
                    <input
                      name="userId"
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                      placeholder="UUID del usuario"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Rol</label>
                    <select
                      name="role"
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                    >
                      <option value="consultant">Consultor</option>
                      <option value="director">Directivo</option>
                      <option value="collaborator">Colaborador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Título del puesto</label>
                    <input
                      name="jobTitle"
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                      placeholder="Director Comercial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Descriptivo de puesto</label>
                    <textarea
                      name="jobDescriptionText"
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                      placeholder="Responsable de ventas, clientes clave y estrategia comercial"
                    />
                  </div>

                  <button type="submit" className="inline-flex rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
                    Asignar usuario
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
