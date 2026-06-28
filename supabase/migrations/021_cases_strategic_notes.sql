-- Motivo del diagnóstico / dolores del cliente (hipótesis inicial del consultor)
-- Texto libre que complementa la clasificación strategic_intent.
-- Se inyecta en los motores de IA (brief y propuesta) como hipótesis a contrastar.
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS strategic_notes TEXT;
