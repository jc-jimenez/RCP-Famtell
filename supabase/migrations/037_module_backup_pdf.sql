-- ============================================================
-- 037: PDF de respaldo por módulo completado (sección 16, Obs 9)
-- ============================================================
-- Cuando un módulo queda en verde (todos los puestos mapeados ya
-- contestaron), se genera un PDF con la transcripción completa de cada
-- entrevista de ese módulo y se guarda en Storage — respaldo del trabajo
-- de campo, independiente de la app. Bucket privado: todo el acceso pasa
-- por rutas de API con service role (igual que el resto del proyecto),
-- no hay políticas para "anon"/"authenticated" a propósito.
-- ============================================================

ALTER TABLE modules ADD COLUMN IF NOT EXISTS backup_pdf_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('module-backups', 'module-backups', false)
ON CONFLICT (id) DO NOTHING;
