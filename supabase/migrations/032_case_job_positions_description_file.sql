-- ============================================================
-- 032: Descripción corta + procedencia del descriptivo de puesto (Obs 5 del super-admin)
-- ============================================================
-- El catálogo de puestos del caso (case_job_positions) ya tiene "job_description"
-- (el descriptivo completo, obligatorio, usado por la IA en el Brief — ver
-- migración 023 y sección 15 del PRD). Esta migración agrega:
--   - description: descripción corta/resumen del puesto (opcional, para listas)
--   - job_description_source_file: nombre del archivo del que se extrajo el
--     descriptivo (cuando el consultor sube un PDF/Word en vez de escribirlo a
--     mano). El texto extraído se guarda en job_description, que ya alimenta
--     el Brief — no se persiste el archivo binario, solo su procedencia.
-- ============================================================

ALTER TABLE case_job_positions
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS job_description_source_file text;
