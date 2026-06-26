-- Permite que cada usuario lea SUS PROPIAS filas en case_users.
-- Sin esta política, directivos y colaboradores rebotan al login porque
-- el server component no puede confirmar su acceso al caso (RLS lo bloquea).

DROP POLICY IF EXISTS "case_users_self_read" ON case_users;
CREATE POLICY "case_users_self_read" ON case_users
  FOR SELECT USING (user_id = auth.uid());

-- El consultor (dueño de la cuenta del caso) también puede ver los participantes
DROP POLICY IF EXISTS "case_users_consultant_read" ON case_users;
CREATE POLICY "case_users_consultant_read" ON case_users
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM cases WHERE account_id IN (
        SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
      )
    )
  );
