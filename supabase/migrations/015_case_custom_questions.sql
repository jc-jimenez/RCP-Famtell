-- ============================================================
-- 015: Preguntas personalizadas por caso + roles override
-- ============================================================

-- 1. Columna roles_override en case_question_overrides
ALTER TABLE case_question_overrides
  ADD COLUMN IF NOT EXISTS roles_override text[];

-- 2. Tabla de preguntas personalizadas creadas por el consultor para un caso específico
CREATE TABLE IF NOT EXISTS case_custom_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  section_id  uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  text        text NOT NULL,
  nova_hint   text,
  sort_order  int  NOT NULL DEFAULT 999,
  suggested_roles text[] NOT NULL DEFAULT '{}',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- RLS para preguntas custom: solo el consultor del caso
ALTER TABLE case_custom_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_questions_by_account" ON case_custom_questions
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT id FROM cases WHERE account_id IN (
        SELECT id FROM accounts WHERE email = auth.email()
      )
    )
  );
