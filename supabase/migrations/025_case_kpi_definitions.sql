-- ============================================================
-- 025: Catálogo de KPIs por caso
-- ============================================================
-- Ver docs/PRD_RCPFAMTELL3PL.md sección 9.1. kpi_records tenía 6
-- métricas fijas como columnas (revenue_actual, active_clients, ...);
-- el Plan 90 días de cada caso necesita medir sus propios KPIs, no
-- solo los genéricos. kpi_records no tenía ninguna fila en todo el
-- sistema al momento de esta migración — no hace falta backfill.
-- ============================================================

-- 1. Catálogo de KPIs que el consultor define para este caso
CREATE TABLE IF NOT EXISTS case_kpi_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  metric_key  text NOT NULL,           -- identificador estable, ej. "ingresos"
  label       text NOT NULL,           -- texto que se muestra, ej. "Ingresos mensuales"
  target      numeric NOT NULL DEFAULT 0,
  unit        text NOT NULL DEFAULT '', -- "$", "%", "" (número simple)
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(case_id, metric_key)
);

-- 2. kpi_records pasa de columnas fijas a valores contra el catálogo.
--    Se agrega la columna nueva sin tocar las columnas viejas (quedan
--    sin uso, no se dropean — mismo criterio conservador del resto
--    de las migraciones de esta fase).
ALTER TABLE kpi_records
  ADD COLUMN IF NOT EXISTS values jsonb NOT NULL DEFAULT '{}';

-- ============================================================
-- RLS: mismo patrón — consultor gestiona el catálogo, miembros
-- del caso (directivo) solo necesitan leerlo para saber qué
-- capturar cada semana.
-- ============================================================
ALTER TABLE case_kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_kpi_definitions_consultant_write" ON case_kpi_definitions
  FOR ALL TO authenticated
  USING (case_id IN (SELECT my_consultant_case_ids()))
  WITH CHECK (case_id IN (SELECT my_consultant_case_ids()));

CREATE POLICY "case_kpi_definitions_member_read" ON case_kpi_definitions
  FOR SELECT TO authenticated
  USING (case_id IN (SELECT my_member_case_ids()));
