-- ============================================================
-- 028: Tablas de datos por caso (instrumentos de tabla del Kit)
-- ============================================================
-- Ver docs/PRD_RCPFAMTELL3PL.md sección 11, decisión 1. Varios
-- instrumentos del Kit de Diagnóstico son tablas de muchas filas
-- (mapa de clientes, inventario de equipos, benchmark de tarifas,
-- mapa de talento, etc.) que no funcionan como entrevista
-- conversacional. Mecanismo genérico reutilizable, no una tabla
-- fija por instrumento: el consultor define las columnas, los
-- participantes (por puesto, igual que las preguntas) llenan filas.
-- ============================================================

-- 1. Definición de la tabla (qué columnas tiene, a qué puesto(s) le toca)
CREATE TABLE IF NOT EXISTS case_table_instruments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  module_code     text NOT NULL,           -- M1..M7, para agrupar en la UI
  name            text NOT NULL,           -- ej. "Mapa de Clientes Activos vs. Inactivos"
  description     text,                    -- instrucciones para quien la llena
  columns         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- columns shape: [{ "key": "empresa", "label": "Empresa", "type": "text" }, ...]
  -- type: "text" | "number" | "currency" | "percent" | "select"
  -- para "select": { ..., "options": ["Activo","Inactivo","Prospecto"] }
  job_position_ids uuid[] NOT NULL DEFAULT '{}',
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- 2. Filas de datos reales
CREATE TABLE IF NOT EXISTS case_table_rows (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id   uuid NOT NULL REFERENCES case_table_instruments(id) ON DELETE CASCADE,
  row_data        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { columnKey: value }
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- RLS: el consultor gestiona las definiciones (columnas). Las
-- FILAS las puede escribir tanto el consultor como cualquier
-- case_user cuyo puesto esté mapeado al instrumento — a
-- diferencia de preguntas/KPIs, aquí el directivo/colaborador
-- necesita ESCRIBIR, no solo leer.
-- ============================================================
ALTER TABLE case_table_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_table_rows        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_table_instruments_consultant_write" ON case_table_instruments
  FOR ALL TO authenticated
  USING (case_id IN (SELECT my_consultant_case_ids()))
  WITH CHECK (case_id IN (SELECT my_consultant_case_ids()));

CREATE POLICY "case_table_instruments_member_read" ON case_table_instruments
  FOR SELECT TO authenticated
  USING (case_id IN (SELECT my_member_case_ids()));

-- Consultor: control total sobre las filas de sus casos
CREATE POLICY "case_table_rows_consultant_write" ON case_table_rows
  FOR ALL TO authenticated
  USING (
    instrument_id IN (
      SELECT id FROM case_table_instruments WHERE case_id IN (SELECT my_consultant_case_ids())
    )
  )
  WITH CHECK (
    instrument_id IN (
      SELECT id FROM case_table_instruments WHERE case_id IN (SELECT my_consultant_case_ids())
    )
  );

-- Miembro del caso: puede leer/escribir filas solo de instrumentos
-- mapeados a SU puesto en ese caso.
CREATE POLICY "case_table_rows_member_write" ON case_table_rows
  FOR ALL TO authenticated
  USING (
    instrument_id IN (
      SELECT cti.id FROM case_table_instruments cti
      JOIN case_users cu ON cu.case_id = cti.case_id AND cu.user_id = auth.uid()
      WHERE cu.job_position_id = ANY(cti.job_position_ids)
    )
  )
  WITH CHECK (
    instrument_id IN (
      SELECT cti.id FROM case_table_instruments cti
      JOIN case_users cu ON cu.case_id = cti.case_id AND cu.user_id = auth.uid()
      WHERE cu.job_position_id = ANY(cti.job_position_ids)
    )
  );
