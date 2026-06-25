'use client';

import { useState } from 'react';

export default function CreateCaseForm() {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ companyName, industry, description })
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setStatus(result.error ?? 'Error al crear el caso');
      return;
    }

    setCompanyName('');
    setIndustry('');
    setDescription('');
    setStatus('Caso creado correctamente. Refresca la página para verlo.');
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-xl font-semibold">Crear nuevo caso</h2>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-300">Nombre del caso</label>
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            placeholder="Empresa Ejemplo S.A."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Industria</label>
          <input
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            placeholder="Logística / 3PL"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Descripción breve</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            rows={4}
            placeholder="Descripción breve del caso"
          />
        </div>

        {status ? <p className="text-sm text-slate-300">{status}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creando...' : 'Crear caso'}
        </button>
      </form>
    </div>
  );
}
