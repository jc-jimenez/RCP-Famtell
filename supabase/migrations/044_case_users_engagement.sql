-- Distintivo subjetivo de resistencia percibida en el onboarding, para
-- comparar después contra el comportamiento real de la entrevista (reacción,
-- ritmo, profundidad de respuesta) calculado en vivo desde sessions. Campo
-- estructurado (no texto libre) a propósito, para que sea comparable a
-- futuro entre participantes/casos, no solo una nota suelta.

alter table case_users
  add column if not exists onboarding_resistance_level text
    check (onboarding_resistance_level in ('baja', 'media', 'alta')),
  add column if not exists onboarding_resistance_note text;
