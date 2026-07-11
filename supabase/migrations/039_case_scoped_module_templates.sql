-- v2: permite que module_templates tenga catálogos propios por caso (case_id
-- no nulo), sin afectar el catálogo global compartido (case_id nulo, los
-- 7 módulos M1-M7 de siempre). sections/questions no necesitan columna
-- nueva: ya heredan el scope vía module_template_id.
ALTER TABLE module_templates ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES cases(id) ON DELETE CASCADE;

-- El UNIQUE(code) global se reemplaza por dos índices únicos parciales:
-- si se deja UNIQUE(case_id, code) a secas, Postgres trata cada fila con
-- case_id NULL como distinta entre sí y se pierde la unicidad global que
-- el catálogo compartido necesita.
ALTER TABLE module_templates DROP CONSTRAINT IF EXISTS module_templates_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS module_templates_code_global_key
  ON module_templates (code) WHERE case_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS module_templates_code_per_case_key
  ON module_templates (case_id, code) WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS module_templates_case_id_idx ON module_templates (case_id);
