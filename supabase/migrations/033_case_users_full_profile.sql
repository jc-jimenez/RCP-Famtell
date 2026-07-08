-- ============================================================
-- 033: Campos completos del catálogo de usuarios del consultor (Obs 3)
-- ============================================================
-- El consultor crea los participantes (case_users) y ahora puede capturar:
-- Nombre del Usuario, Antigüedad, Teléfono Fijo (WhatsApp y Password ya
-- existían como flujo — WhatsApp pasa a obligatorio en la UI, Password se
-- usa solo en el flujo de alta directa, no se persiste aquí porque vive en
-- auth.users). Ver docs/PRD_RCPFAMTELL3PL.md sección 15.
-- ============================================================

ALTER TABLE case_users
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS landline_phone text,
  ADD COLUMN IF NOT EXISTS seniority text;
