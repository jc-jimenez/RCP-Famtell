-- El consultor dueño del caso puede gestionar participantes (invitar/editar/quitar).
-- Antes solo existían políticas SELECT, así que invitar fallaba por RLS.
-- Usa la función SECURITY DEFINER my_consultant_case_ids() para evitar recursión.

DROP POLICY IF EXISTS "case_users_consultant_insert" ON case_users;
CREATE POLICY "case_users_consultant_insert" ON case_users FOR INSERT WITH CHECK (
  case_id IN (SELECT my_consultant_case_ids())
);

DROP POLICY IF EXISTS "case_users_consultant_update" ON case_users;
CREATE POLICY "case_users_consultant_update" ON case_users FOR UPDATE USING (
  case_id IN (SELECT my_consultant_case_ids())
);

DROP POLICY IF EXISTS "case_users_consultant_delete" ON case_users;
CREATE POLICY "case_users_consultant_delete" ON case_users FOR DELETE USING (
  case_id IN (SELECT my_consultant_case_ids())
);

-- El propio usuario puede actualizar su fila (p.ej. last_seen_at al entrar)
DROP POLICY IF EXISTS "case_users_self_update" ON case_users;
CREATE POLICY "case_users_self_update" ON case_users FOR UPDATE USING (
  user_id = auth.uid()
);
