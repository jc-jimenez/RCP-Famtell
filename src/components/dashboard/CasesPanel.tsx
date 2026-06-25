'use client';

import { useEffect, useState } from 'react';

type CaseItem = {
  id: string;
  company_name: string;
  industry: string | null;
  status: string;
  created_at: string;
};

export default function CasesPanel() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCases() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/cases');
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? 'Error al cargar casos');
          return;
        }

        setCases(data.cases ?? []);
      } catch (err) {
        setError('Error de red al cargar casos');
      } finally {
        setLoading(false);
      }
    }

    loadCases();
  }, []);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-xl font-semibold">Casos del consultor</h2>
      {loading ? (
        <p className="mt-4 text-slate-400">Cargando casos...</p>
      ) : error ? (
        <p className="mt-4 text-rose-400">{error}</p>
      ) : cases.length === 0 ? (
        <p className="mt-4 text-slate-400">No hay casos registrados aún.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {cases.map((item) => (
            <div key={item.id} className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white">{item.company_name}</p>
                  <p className="text-sm text-slate-400">{item.industry ?? 'Sin industria'}</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">Creado el {new Date(item.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
