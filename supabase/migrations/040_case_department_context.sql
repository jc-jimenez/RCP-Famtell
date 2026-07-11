-- v2 Fase 2: permite que un caso sea "empresa" (como hoy) o "departamento de
-- una empresa", con su propio contexto de diagnóstico. Todo nullable y
-- aditivo — los casos existentes quedan con case_type NULL (equivalente a
-- 'empresa') y sin ningún dato en los campos nuevos.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_type text
  CHECK (case_type IS NULL OR case_type IN ('empresa', 'departamento'));
ALTER TABLE cases ADD COLUMN IF NOT EXISTS products_services text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS department_name text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS diagnostic_objectives text;
