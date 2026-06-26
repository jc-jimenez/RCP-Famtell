-- accounts tenía RLS activado pero SIN políticas → deny total.
-- El consultor no podía leer su propia cuenta, así que el middleware
-- no detectaba su rol y rebotaba silenciosamente al login.

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Cada usuario lee su propia cuenta (match por email del JWT)
DROP POLICY IF EXISTS "accounts_self_read" ON accounts;
CREATE POLICY "accounts_self_read" ON accounts FOR SELECT USING (
  email = auth.jwt() ->> 'email'
);

-- El consultor puede actualizar su propia cuenta (p.ej. datos de perfil)
DROP POLICY IF EXISTS "accounts_self_update" ON accounts;
CREATE POLICY "accounts_self_update" ON accounts FOR UPDATE USING (
  email = auth.jwt() ->> 'email'
);
