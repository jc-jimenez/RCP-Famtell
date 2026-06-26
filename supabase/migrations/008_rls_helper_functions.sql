-- Rompe la recursión infinita entre cases y case_users usando
-- funciones SECURITY DEFINER (saltan RLS en sus subconsultas internas).

-- Cuentas (accounts) del usuario actual, por email del JWT
CREATE OR REPLACE FUNCTION public.my_account_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
$$;

-- Casos donde el usuario es participante (directivo/colaborador)
CREATE OR REPLACE FUNCTION public.my_member_case_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT case_id FROM case_users WHERE user_id = auth.uid()
$$;

-- Casos que pertenecen a las cuentas del usuario (consultor dueño)
CREATE OR REPLACE FUNCTION public.my_consultant_case_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM cases
  WHERE account_id IN (SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email')
$$;

-- ── cases: políticas sin recursión ──────────────────────────────
DROP POLICY IF EXISTS "cases_select" ON cases;
CREATE POLICY "cases_select" ON cases FOR SELECT USING (
  account_id IN (SELECT my_account_ids())
  OR id IN (SELECT my_member_case_ids())
);

DROP POLICY IF EXISTS "cases_insert" ON cases;
CREATE POLICY "cases_insert" ON cases FOR INSERT WITH CHECK (
  account_id IN (SELECT my_account_ids())
);

DROP POLICY IF EXISTS "cases_update" ON cases;
CREATE POLICY "cases_update" ON cases FOR UPDATE USING (
  account_id IN (SELECT my_account_ids())
);

DROP POLICY IF EXISTS "cases_delete" ON cases;
CREATE POLICY "cases_delete" ON cases FOR DELETE USING (
  account_id IN (SELECT my_account_ids())
);

-- ── case_users: self-read + consultor sin recursión ─────────────
DROP POLICY IF EXISTS "case_users_self_read" ON case_users;
CREATE POLICY "case_users_self_read" ON case_users FOR SELECT USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "case_users_consultant_read" ON case_users;
CREATE POLICY "case_users_consultant_read" ON case_users FOR SELECT USING (
  case_id IN (SELECT my_consultant_case_ids())
);
