-- ═══════════════════════════════════════════════════════════════════════════════
-- RCP.ai — Registros pendientes de verificación (auto-registro de consultores)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pending_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL,
  phone               TEXT NOT NULL,
  nombre              TEXT NOT NULL,
  empresa             TEXT NOT NULL,
  password_hash       TEXT,                    -- temporal, se borra al activar
  whatsapp_code       TEXT,
  whatsapp_expires_at TIMESTAMPTZ,
  whatsapp_verified   BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pending_registrations_email_key UNIQUE (email)
);

-- Limpieza automática: registros de más de 24 horas se eliminan
-- (el cron de Vercel o una función scheduled puede hacer esto)
-- Por ahora no habilitamos RLS — solo se accede via service role desde API routes
