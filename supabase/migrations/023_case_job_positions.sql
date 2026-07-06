-- ============================================================
-- 023: Catálogo de puestos por caso + mapeo de preguntas
-- ============================================================
-- Ver docs/PRD_RCPFAMTELL3PL.md sección 7. Reemplaza el enum fijo
-- de 6 perfiles (director_general, gerente_comercial, ...) por un
-- catálogo de puestos que el consultor da de alta para cada caso,
-- con descriptivo de puesto obligatorio (usado luego para el
-- hallazgo de alineación descriptivo-vs-actividad-real en el Brief).
--
-- El mapeo pregunta↔puesto se guarda como columna array
-- (job_position_ids uuid[]) directamente en case_question_overrides
-- (preguntas del catálogo base) y case_custom_questions (preguntas
-- propias del caso) — mismo patrón que ya usa el proyecto para
-- suggested_roles/roles_override (array en la fila, no tabla puente).
-- Una tabla puente no serviría aquí: las preguntas custom viven en
-- una tabla distinta a las del catálogo, y un solo join table no
-- puede referenciar limpiamente a las dos.
-- ============================================================

-- 1. Catálogo de puestos del caso
CREATE TABLE IF NOT EXISTS case_job_positions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name            text NOT NULL,
  job_description text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- 2. El usuario del caso ocupa un puesto del catálogo (independiente
--    de case_users.role, que sigue siendo el rol de plataforma:
--    consultant/director/collaborator)
ALTER TABLE case_users
  ADD COLUMN IF NOT EXISTS job_position_id uuid REFERENCES case_job_positions(id) ON DELETE SET NULL;

-- 3. Mapeo pregunta↔puesto: preguntas del catálogo base (por caso)
ALTER TABLE case_question_overrides
  ADD COLUMN IF NOT EXISTS job_position_ids uuid[] NOT NULL DEFAULT '{}';

-- 4. Mapeo pregunta↔puesto: preguntas personalizadas del caso
ALTER TABLE case_custom_questions
  ADD COLUMN IF NOT EXISTS job_position_ids uuid[] NOT NULL DEFAULT '{}';

-- ============================================================
-- RLS: mismo patrón que el resto del catálogo por caso —
-- el consultor dueño del caso gestiona (ALL) el catálogo de
-- puestos, los miembros del caso (directivo/colaborador) solo
-- necesitan leer (SELECT) para que Nova filtre sus preguntas.
-- Usa las funciones SECURITY DEFINER de la migración 008.
-- ============================================================

ALTER TABLE case_job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_job_positions_consultant_write" ON case_job_positions
  FOR ALL TO authenticated
  USING (case_id IN (SELECT my_consultant_case_ids()))
  WITH CHECK (case_id IN (SELECT my_consultant_case_ids()));

CREATE POLICY "case_job_positions_member_read" ON case_job_positions
  FOR SELECT TO authenticated
  USING (case_id IN (SELECT my_member_case_ids()));

-- ============================================================
-- FIX: case_question_overrides solo dejaba leer al consultor
-- (accounts.email), así que el directivo/colaborador que en
-- realidad responde en el chat de Nova nunca podía leer los
-- overrides de su propio caso (pregunta desactivada, texto
-- personalizado, y ahora job_position_ids) — la RLS los bloqueaba
-- en silencio. Se agrega lectura para miembros del caso.
-- ============================================================
CREATE POLICY "overrides_member_read" ON case_question_overrides
  FOR SELECT TO authenticated
  USING (case_id IN (SELECT my_member_case_ids()));

-- Mismo fix para preguntas personalizadas: hoy solo el consultor
-- (accounts.email) puede leerlas, el miembro del caso que las
-- responde en Nova también necesita poder leerlas.
CREATE POLICY "custom_questions_member_read" ON case_custom_questions
  FOR SELECT TO authenticated
  USING (case_id IN (SELECT my_member_case_ids()));
