-- cases tenía RLS habilitado pero SIN políticas → deny total.
-- Nadie podía leer ni crear casos con el cliente de usuario.
-- Esto rompía: crear caso (consultor), dashboard del consultor y
-- la vista del caso del directivo/colaborador.

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Lectura: el consultor dueño de la cuenta, o cualquier participante del caso
DROP POLICY IF EXISTS "cases_select" ON cases;
CREATE POLICY "cases_select" ON cases FOR SELECT USING (
  account_id IN (
    SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
  )
  OR id IN (
    SELECT case_id FROM case_users WHERE user_id = auth.uid()
  )
);

-- Alta: solo el consultor dueño de la cuenta
DROP POLICY IF EXISTS "cases_insert" ON cases;
CREATE POLICY "cases_insert" ON cases FOR INSERT WITH CHECK (
  account_id IN (
    SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
  )
);

-- Edición: solo el consultor dueño de la cuenta
DROP POLICY IF EXISTS "cases_update" ON cases;
CREATE POLICY "cases_update" ON cases FOR UPDATE USING (
  account_id IN (
    SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
  )
);

-- Borrado: solo el consultor dueño de la cuenta
DROP POLICY IF EXISTS "cases_delete" ON cases;
CREATE POLICY "cases_delete" ON cases FOR DELETE USING (
  account_id IN (
    SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
  )
);
