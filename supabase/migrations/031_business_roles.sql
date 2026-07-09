-- ============================================================
-- 031: Catálogo global de ROLES de negocio (Obs 4 del super-admin)
-- ============================================================
-- Etiqueta descriptiva (nombre + descripción de funciones), NO un RBAC.
-- Los permisos del sistema siguen usando los 4 roles de plataforma fijos
-- (super_admin/consultant/director/collaborator). Este catálogo es GLOBAL,
-- lo crea el super-admin, y el consultor asigna un rol a cada PUESTO y un
-- rol + puesto a cada USUARIO. Ver docs/PRD_RCPFAMTELL3PL.md sección 15.
-- ============================================================

CREATE TABLE IF NOT EXISTS business_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,               -- ej. "Dirección", "Mando Medio", "Operativo"
  description text,                          -- descripción de funciones del rol
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- Referencia de rol en el catálogo de puestos del caso (consultor lo asigna)
ALTER TABLE case_job_positions
  ADD COLUMN IF NOT EXISTS business_role_id uuid REFERENCES business_roles(id) ON DELETE SET NULL;

-- Referencia de rol en cada participante (consultor lo asigna al crear el usuario)
ALTER TABLE case_users
  ADD COLUMN IF NOT EXISTS business_role_id uuid REFERENCES business_roles(id) ON DELETE SET NULL;

-- ============================================================
-- RLS: lectura para cualquier autenticado (los consultores necesitan ver el
-- catálogo para asignar roles). Las mutaciones (crear/editar/borrar) las hace
-- el super-admin a través de la API con el service role, que bypassa RLS —
-- por eso NO hay políticas de escritura (mismo patrón que otros catálogos admin).
-- ============================================================
ALTER TABLE business_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_roles_read" ON business_roles
  FOR SELECT TO authenticated
  USING (true);

-- Semilla inicial sugerida (el super-admin puede editarla/borrarla).
INSERT INTO business_roles (name, description, sort_order) VALUES
  ('Dirección',   'Toma de decisiones estratégicas y responsabilidad sobre resultados del negocio.', 0),
  ('Mando Medio', 'Coordinación y supervisión de áreas o equipos; ejecuta la estrategia y reporta a dirección.', 1),
  ('Operativo',   'Ejecución de las actividades del día a día del área o proceso.', 2)
ON CONFLICT DO NOTHING;
