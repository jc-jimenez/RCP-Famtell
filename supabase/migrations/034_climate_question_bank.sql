-- ============================================================
-- 034: Banco de preguntas de Clima Laboral, editable por el super-admin (Obs 6)
-- ============================================================
-- Hasta ahora las preguntas de la encuesta anónima de Clima Laboral (Kit 6.1)
-- estaban fijas en código (src/lib/climateQuestions.ts). Esta migración las
-- mueve a una tabla editable desde el Catálogo, para que el super-admin pueda
-- agregar/quitar/reordenar preguntas y usar la IA para proponer nuevas. Cada
-- encuesta nueva (case_climate_surveys) se sigue sembrando en el momento de
-- creación con una copia jsonb de este banco — el banco es la plantilla, no
-- afecta encuestas ya creadas. Ver docs/PRD_RCPFAMTELL3PL.md sección 15.
-- ============================================================

CREATE TABLE IF NOT EXISTS climate_question_bank (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL,
  label       text NOT NULL,
  type        text NOT NULL CHECK (type IN ('open','number','scale_1_5','choice','choice_text')),
  options     jsonb,
  min_label   text,
  max_label   text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE climate_question_bank ENABLE ROW LEVEL SECURITY;

-- El consultor necesita leerlo al crear una encuesta nueva; las mutaciones
-- (crear/editar/borrar) las hace el super-admin vía API con service role.
CREATE POLICY "climate_question_bank_read" ON climate_question_bank
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO climate_question_bank (key, label, type, options, min_label, max_label, sort_order) VALUES
  ('problema_principal',        '¿Cuál es el principal problema que frena el crecimiento de la empresa?', 'open', NULL, NULL, NULL, 0),
  ('capacidad_no_aprovechada',  '¿Hay capacidad de operación que no estamos aprovechando? ¿Cuál?', 'open', NULL, NULL, NULL, 1),
  ('servicio_no_ofrecido',      '¿Algún cliente te ha pedido un servicio que no ofrecemos?', 'choice_text', '["Sí","No"]'::jsonb, NULL, NULL, 2),
  ('proceso_lento',             '¿Qué proceso interno te quita más tiempo del necesario?', 'open', NULL, NULL, NULL, 3),
  ('que_harias_diferente',      '¿Qué harías diferente si tuvieras autorización para hacerlo?', 'open', NULL, NULL, NULL, 4),
  ('comunicacion_interna',      '¿Cómo calificarías la comunicación interna del equipo?', 'scale_1_5', NULL, 'Muy mala', 'Excelente', 5),
  ('conoce_meta_3_meses',       '¿Sabes cuál es la meta de la empresa para los próximos 3 meses?', 'choice', '["Sí","No","Parcialmente"]'::jsonb, NULL, NULL, 6),
  ('herramientas_necesarias',   '¿Tienes las herramientas necesarias para hacer bien tu trabajo?', 'choice_text', '["Sí","No"]'::jsonb, NULL, NULL, 7),
  ('clientes_nuevos_estimado',  '¿Cuántos clientes nuevos crees que podríamos incorporar este mes?', 'number', NULL, NULL, NULL, 8),
  ('recomendaria_trabajar',     '¿Recomendarías esta empresa como lugar de trabajo?', 'scale_1_5', NULL, 'No', 'Definitivamente sí', 9)
ON CONFLICT DO NOTHING;
