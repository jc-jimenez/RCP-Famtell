-- Onboarding obligatorio de primera vez, por rol. NULL = no lo ha visto todavía.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_dismissed_at timestamptz;
ALTER TABLE case_users ADD COLUMN IF NOT EXISTS onboarding_dismissed_at timestamptz;
