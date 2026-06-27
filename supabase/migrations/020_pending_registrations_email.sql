-- Agregar columnas de verificación de email a pending_registrations
ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS email_token          TEXT,
  ADD COLUMN IF NOT EXISTS email_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified        BOOLEAN NOT NULL DEFAULT false;
