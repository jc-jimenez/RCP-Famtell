-- Agregar campo de intención estratégica a cases
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS strategic_intent TEXT DEFAULT 'mixed'
    CHECK (strategic_intent IN ('growth', 'restructure', 'exit', 'mixed'));
