'use client';

import { useState } from 'react';

export default function AssignCaseUserForm() {
  const [caseId, setCaseId] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('director');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    const response = await fetch('/api/case-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caseId,
        userId,
        role,
        jobTitle,
        jobDescriptionText,
        permissionsJson: {}
      })
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setStatus(result.error ?? 'Error al asignar usuario');
      return;
    }

    setCaseId('');
    setUserId('');
    setRole('director');
    setJobTitle('');
    setJobDescriptionText('');
    setStatus('Usuario asignado correctamente al caso.');
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-xl font-semibold">Asignar usuario al caso</h2>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-300">ID del caso</label>
          <input
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            placeholder="UUID del caso"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">ID del usuario</label>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            placeholder="UUID del usuario"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Rol</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
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
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            placeholder="Director Comercial"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Descriptivo de puesto</label>
          <textarea
            value={jobDescriptionText}
            onChange={(event) => setJobDescriptionText(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            rows={4}
            placeholder="Responsable de ventas, clientes clave y estrategia comercial"
          />
        </div>

        {status ? <p className="text-sm text-slate-300">{status}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Asignando...' : 'Asignar usuario'}
        </button>
      </form>
    </div>
  );
}
