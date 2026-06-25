-- ═══════════════════════════════════════════════════════════════════════════════
-- RCP.ai — Tablas faltantes + RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── modules ──────────────────────────────────────────────────────────────────
-- Estado de cada módulo dentro de un caso
CREATE TABLE IF NOT EXISTS modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  module_code     TEXT NOT NULL,        -- M1..M7, A..G
  status          TEXT NOT NULL DEFAULT 'locked'
                    CHECK (status IN ('locked', 'active', 'completed')),
  credits_used    INT  NOT NULL DEFAULT 0,
  session_id      UUID,                 -- FK a sessions al crear
  unlocked_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, module_code)
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_case_access" ON modules FOR ALL USING (
  case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
    UNION
    SELECT case_id FROM case_users WHERE user_id = auth.uid()
  )
);

-- ─── sessions ─────────────────────────────────────────────────────────────────
-- Historial de mensajes del chat IA (Nova) por módulo y usuario
CREATE TABLE IF NOT EXISTS sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  module_code      TEXT NOT NULL,
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  messages         JSONB NOT NULL DEFAULT '[]',
  last_message_at  TIMESTAMPTZ,
  completed        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- El dueño del mensaje puede leer/escribir; el consultor puede leer
CREATE POLICY "sessions_owner" ON sessions FOR ALL USING (
  user_id = auth.uid()
  OR case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
  )
);

-- ─── agenda_signals ───────────────────────────────────────────────────────────
-- Señales 🔵🟡🔴 detectadas por Nova — SOLO visibles para Consultor y SA
CREATE TABLE IF NOT EXISTS agenda_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  module_code  TEXT NOT NULL,
  signal_type  TEXT NOT NULL CHECK (signal_type IN ('blue', 'yellow', 'red')),
  signal_text  TEXT NOT NULL,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agenda_signals ENABLE ROW LEVEL SECURITY;

-- Solo el consultor (dueño del caso) puede ver las señales
CREATE POLICY "agenda_signals_consultant_only" ON agenda_signals FOR ALL USING (
  case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
  )
);

-- ─── consultant_notes ─────────────────────────────────────────────────────────
-- Notas privadas del consultor — NUNCA visibles para directivos/colaboradores
CREATE TABLE IF NOT EXISTS consultant_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, account_id)
);

ALTER TABLE consultant_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultant_notes_private" ON consultant_notes FOR ALL USING (
  account_id IN (
    SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
  )
);

-- ─── documents ────────────────────────────────────────────────────────────────
-- Archivos subidos: estados financieros (M4), descriptivos de puesto (M6)
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id),
  document_type   TEXT NOT NULL
                    CHECK (document_type IN (
                      'financial_statement','bank_statement','tax_return',
                      'job_description','other'
                    )),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  extracted_data  JSONB,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_case_access" ON documents FOR ALL USING (
  case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
    UNION
    SELECT case_id FROM case_users WHERE user_id = auth.uid()
  )
);

-- ─── contacts ─────────────────────────────────────────────────────────────────
-- Base de contactos del Módulo 3 (pre-carga el CRM 8.1 con 30 contactos)
CREATE TABLE IF NOT EXISTS contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  company           TEXT,
  role              TEXT,
  email             TEXT,
  phone             TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'other'
                      CHECK (relationship_type IN (
                        'client','prospect','supplier','partner','other'
                      )),
  -- Campos CRM (Módulo 8.1)
  pipeline_stage    TEXT DEFAULT 'pending'
                      CHECK (pipeline_stage IN (
                        'pending','contacted','proposal_sent',
                        'negotiating','closed_won','closed_lost'
                      )),
  potential_value_monthly NUMERIC(12,2) DEFAULT 0,
  close_probability TEXT DEFAULT 'medium'
                      CHECK (close_probability IN ('high','medium','low')),
  last_activity_at  TIMESTAMPTZ,
  next_action       TEXT,
  next_action_date  DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_case_access" ON contacts FOR ALL USING (
  case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
    UNION
    SELECT case_id FROM case_users
      WHERE user_id = auth.uid() AND role = 'director'
  )
);

-- ─── premium_modules ──────────────────────────────────────────────────────────
-- Módulos A-G activados por el Super Admin para un caso específico
CREATE TABLE IF NOT EXISTS premium_modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  module_code   TEXT NOT NULL CHECK (module_code IN ('A','B','C','D','E','F','G')),
  activated_by  UUID NOT NULL REFERENCES auth.users(id),
  activated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  credits_cost  INT NOT NULL DEFAULT 0,
  UNIQUE (case_id, module_code)
);

ALTER TABLE premium_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "premium_modules_access" ON premium_modules FOR ALL USING (
  case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
    UNION
    SELECT case_id FROM case_users WHERE user_id = auth.uid()
  )
);

-- ─── briefs ───────────────────────────────────────────────────────────────────
-- Brief final (M7) y Brief de cierre semana 12 (M8.14)
CREATE TABLE IF NOT EXISTS briefs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  brief_type    TEXT NOT NULL CHECK (brief_type IN ('diagnostic','closing')),
  version       INT NOT NULL DEFAULT 1,
  content_json  JSONB NOT NULL DEFAULT '{}',
  pdf_url       TEXT,
  word_url      TEXT,
  generated_by  UUID NOT NULL REFERENCES auth.users(id),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefs_case_access" ON briefs FOR ALL USING (
  case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
    UNION
    SELECT case_id FROM case_users WHERE user_id = auth.uid()
  )
);

-- ─── notifications ────────────────────────────────────────────────────────────
-- Log de emails (Resend) y WhatsApp (Twilio) enviados
CREATE TABLE IF NOT EXISTS notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            UUID REFERENCES cases(id) ON DELETE SET NULL,
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  channel            TEXT NOT NULL CHECK (channel IN ('email','whatsapp')),
  notification_type  TEXT NOT NULL
                       CHECK (notification_type IN (
                         'invitation','reminder_48h','module_completed',
                         'brief_ready','checkin_reminder'
                       )),
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','sent','failed')),
  sent_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_self" ON notifications FOR SELECT USING (
  user_id = auth.uid()
  OR case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
  )
);

-- ─── check_ins ────────────────────────────────────────────────────────────────
-- Check-in semanal del Directivo (Módulo 8.5) — lunes 8AM
CREATE TABLE IF NOT EXISTS check_ins (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id              UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id),
  week_number          INT NOT NULL CHECK (week_number BETWEEN 1 AND 12),
  contacts_made        INT NOT NULL DEFAULT 0,
  new_clients          BOOLEAN NOT NULL DEFAULT false,
  new_clients_detail   TEXT,
  obstacles            TEXT,
  warehouse_occupancy  NUMERIC(5,2) NOT NULL DEFAULT 0,
  progress_score       INT NOT NULL CHECK (progress_score BETWEEN 1 AND 10),
  ai_analysis          TEXT,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, week_number)
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "check_ins_access" ON check_ins FOR ALL USING (
  user_id = auth.uid()
  OR case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
  )
);

-- ─── kpi_records ──────────────────────────────────────────────────────────────
-- KPIs semanales del Tablero en Vivo (Módulo 8.4)
CREATE TABLE IF NOT EXISTS kpi_records (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                    UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  week                       INT NOT NULL CHECK (week BETWEEN 1 AND 12),
  revenue_actual             NUMERIC(14,2) NOT NULL DEFAULT 0,
  revenue_target             NUMERIC(14,2) NOT NULL DEFAULT 0,
  active_clients             INT NOT NULL DEFAULT 0,
  active_clients_target      INT NOT NULL DEFAULT 0,
  new_clients                INT NOT NULL DEFAULT 0,
  reactivated_clients        INT NOT NULL DEFAULT 0,
  warehouse_occupancy        NUMERIC(5,2) NOT NULL DEFAULT 0,
  fiscal_warehouse_occupancy NUMERIC(5,2) NOT NULL DEFAULT 0,
  commercial_contacts        INT NOT NULL DEFAULT 0,
  proposals_sent             INT NOT NULL DEFAULT 0,
  close_rate                 NUMERIC(5,2) NOT NULL DEFAULT 0,
  overdue_recovered          NUMERIC(14,2) NOT NULL DEFAULT 0,
  recorded_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, week)
);

ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_records_access" ON kpi_records FOR ALL USING (
  case_id IN (
    SELECT id FROM cases WHERE account_id IN (
      SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'
    )
    UNION
    SELECT case_id FROM case_users
      WHERE user_id = auth.uid() AND role = 'director'
  )
);

-- ─── Supabase Storage Buckets ─────────────────────────────────────────────────
-- Ejecutar también desde Dashboard → Storage o CLI:
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('documents', 'documents', false),
--   ('job-descriptions', 'job-descriptions', false),
--   ('briefs', 'briefs', false),
--   ('avatars', 'avatars', true);
