'use client';

import { useEffect, useState } from 'react';

type AssignmentItem = {
  id: string;
  case_id: string;
  user_id: string;
  role: string;
  job_title: string | null;
  job_description_text: string | null;
  activated_at: string | null;
  last_seen_at: string | null;
};

export default function AssignedUsersPanel() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignments() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/case-users');
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? 'Error al cargar usuarios asignados');
          return;
        }

        setAssignments(data.assignments ?? []);
      } catch (err) {
        setError('Error de red al cargar usuarios asignados');
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-xl font-semibold">Usuarios asignados</h2>
      {loading ? (
        <p className="mt-4 text-slate-400">Cargando asignaciones...</p>
      ) : error ? (
        <p className="mt-4 text-rose-400">{error}</p>
      ) : assignments.length === 0 ? (
        <p className="mt-4 text-slate-400">No hay usuarios asignados aún.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">Caso: {assignment.case_id}</p>
                  <p className="text-sm text-slate-400">Usuario: {assignment.user_id}</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {assignment.role}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">Título: {assignment.job_title ?? 'Sin título'}</p>
              {assignment.job_description_text ? (
                <p className="mt-2 text-sm text-slate-400">{assignment.job_description_text}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                <span>Activado: {assignment.activated_at ? new Date(assignment.activated_at).toLocaleDateString() : 'No activado'}</span>
                <span>Última conexión: {assignment.last_seen_at ? new Date(assignment.last_seen_at).toLocaleDateString() : 'Nunca'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
