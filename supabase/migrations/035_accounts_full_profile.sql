-- ============================================================
-- 035: Nombre completo y WhatsApp de los consultores (Obs 2 y 3, ronda 2)
-- ============================================================
-- El super-admin necesita datos de contacto suficientes para comunicarse
-- con los consultores (Obs 3), y el catálogo de usuarios en /admin/usuarios
-- necesita poder mostrarlos/editarlos (Obs 2). case_users (participantes) ya
-- tenía full_name/whatsapp_phone desde la migración 033 — esta migración le
-- da el mismo perfil a accounts (consultores).
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;
