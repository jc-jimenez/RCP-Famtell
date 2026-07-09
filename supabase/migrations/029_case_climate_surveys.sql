-- ============================================================
-- 029: Encuesta de clima anónima (Kit 6.1)
-- ============================================================
-- Ver docs/PRD_RCPFAMTELL3PL.md sección 11, decisión 2. El Kit exige
-- que este cuestionario sea ANÓNIMO de verdad — decisión explícita
-- del usuario: NADA de IP, NADA de user_id. Solo clasificación
-- autodeclarada (área / si tiene gente a su cargo) para que el
-- consultor pueda leer patrones sin poder identificar a nadie.
-- Acceso público por token (mismo patrón que client_share_links,
-- migración 016), pero aquí es escritura (submit), no solo lectura.
-- ============================================================

CREATE TABLE IF NOT EXISTS case_climate_surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  token       uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  title       text NOT NULL DEFAULT 'Cuestionario de Clima y Diagnóstico Interno',
  questions   jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- questions shape: [{ "key": "problema_principal", "label": "...", "type": "open" }]
  -- type: "open" | "scale_1_5" | "yes_no" | "yes_no_text" | "number"
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

-- Sin user_id, sin ip_address, sin ningún campo identificable a propósito.
CREATE TABLE IF NOT EXISTS case_climate_responses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   uuid NOT NULL REFERENCES case_climate_surveys(id) ON DELETE CASCADE,
  area        text,      -- autodeclarada: Operación/Comercial/Administración/Dirección
  tiene_gente_a_cargo text, -- autodeclarada: Sí/No
  answers     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { questionKey: value }
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_climate_surveys_case_id_idx ON case_climate_surveys(case_id);
CREATE INDEX IF NOT EXISTS case_climate_surveys_token_idx ON case_climate_surveys(token);
CREATE INDEX IF NOT EXISTS case_climate_responses_survey_id_idx ON case_climate_responses(survey_id);

ALTER TABLE case_climate_surveys   ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_climate_responses ENABLE ROW LEVEL SECURITY;

-- Solo el consultor dueño del caso gestiona (crear/abrir/cerrar/borrar) la encuesta.
CREATE POLICY "case_climate_surveys_consultant_write" ON case_climate_surveys
  FOR ALL TO authenticated
  USING (case_id IN (SELECT my_consultant_case_ids()))
  WITH CHECK (case_id IN (SELECT my_consultant_case_ids()));

-- Solo el consultor puede leer las respuestas (agregado/lista, sin nombres porque no existen).
CREATE POLICY "case_climate_responses_consultant_read" ON case_climate_responses
  FOR SELECT TO authenticated
  USING (
    survey_id IN (
      SELECT id FROM case_climate_surveys WHERE case_id IN (SELECT my_consultant_case_ids())
    )
  );

-- NOTA: no hay política para "anon" — el envío público pasa por la
-- función SECURITY DEFINER de abajo, nunca por INSERT directo a la
-- tabla desde el cliente. Así el service role controla exactamente
-- qué se guarda (valida que la encuesta siga abierta).

CREATE OR REPLACE FUNCTION get_climate_survey_by_token(p_token uuid)
RETURNS TABLE (
  survey_id  uuid,
  title      text,
  questions  jsonb,
  status     text,
  company_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT s.id, s.title, s.questions, s.status, c.company_name
  FROM case_climate_surveys s
  JOIN cases c ON c.id = s.case_id
  WHERE s.token = p_token;
$$;

CREATE OR REPLACE FUNCTION submit_climate_response(
  p_token uuid,
  p_area text,
  p_tiene_gente_a_cargo text,
  p_answers jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_survey_id uuid;
  v_status text;
BEGIN
  SELECT id, status INTO v_survey_id, v_status
  FROM case_climate_surveys WHERE token = p_token;

  IF v_survey_id IS NULL OR v_status != 'open' THEN
    RETURN false;
  END IF;

  INSERT INTO case_climate_responses (survey_id, area, tiene_gente_a_cargo, answers)
  VALUES (v_survey_id, p_area, p_tiene_gente_a_cargo, p_answers);

  RETURN true;
END;
$$;
