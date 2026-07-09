-- ============================================================
-- 036: Encuesta de clima segmentada por puesto (sección 16, Obs 10)
-- ============================================================
-- Tensión original (migración 029): el cuestionario es anónimo a propósito
-- (sin user_id, sin IP), lo que impedía saber de qué puesto venía cada
-- respuesta. Resuelto con la opción que eligió el usuario: en vez de un
-- solo link genérico por caso, cada puesto tiene su propio link/token
-- (misma encuesta, mismas preguntas) — el consultor puede segmentar por
-- puesto sin que la respuesta individual dentro de ese puesto deje de ser
-- anónima. job_position_id es NULLABLE a propósito: si el caso todavía no
-- tiene puestos dados de alta, se sigue permitiendo un link general
-- (comportamiento previo) para no bloquear la funcionalidad.
-- ============================================================

ALTER TABLE case_climate_surveys
  ADD COLUMN IF NOT EXISTS job_position_id uuid REFERENCES case_job_positions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS case_climate_surveys_job_position_id_idx ON case_climate_surveys(job_position_id);
