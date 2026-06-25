-- Campos de invitación en case_users
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE case_users
  ADD COLUMN IF NOT EXISTS invitation_email    TEXT,
  ADD COLUMN IF NOT EXISTS invitation_token    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_case_users_invitation_token
  ON case_users (invitation_token)
  WHERE invitation_token IS NOT NULL;
