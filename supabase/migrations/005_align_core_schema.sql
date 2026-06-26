-- Alinea el esquema real con lo que el código del núcleo espera.
-- Idempotente — seguro de re-ejecutar.

-- 1) Columnas de invitación en case_users (antes en 002, nunca aplicada)
ALTER TABLE case_users
  ADD COLUMN IF NOT EXISTS invitation_email      TEXT,
  ADD COLUMN IF NOT EXISTS invitation_token      TEXT,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_users_invitation_token
  ON case_users (invitation_token)
  WHERE invitation_token IS NOT NULL;

-- 2) Intención estratégica en cases (antes en 003, nunca aplicada)
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS strategic_intent TEXT DEFAULT 'mixed'
    CHECK (strategic_intent IN ('growth', 'restructure', 'exit', 'mixed'));

-- 3) Nombre de empresa/despacho del consultor en accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS company_name TEXT;
