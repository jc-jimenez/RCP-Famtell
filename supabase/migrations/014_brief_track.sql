-- ============================================================
-- 014: Brief — campos para track de etapas, JTBD, segmentos y prioridades
-- ============================================================

ALTER TABLE brief_documents
  ADD COLUMN IF NOT EXISTS track_status   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS jtbd           JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS segments       JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS priorities     JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS modules_completed INT DEFAULT 0;

-- track_status shape:
-- {
--   "interviews":  { "status": "complete|active|pending", "completed_at": "..." },
--   "levantamiento": ...,
--   "analisis":    ...,
--   "jtbd":        ...,
--   "segmentos":   ...,
--   "diagnostico": ...,
--   "plan":        ...,
--   "publicado":   ...
-- }

-- jtbd shape:
-- [{ "id": "...", "statement": "...", "evidence": "...", "pain_level": "alto|medio|bajo", "approved": false }]

-- segments shape:
-- [{
--   "id": "...", "name": "...", "description": "...",
--   "jtbd_ids": [...], "priority": "90d|1a|futuro",
--   "channels": [...], "irresistible_offer": "...",
--   "funnel": "...", "copy_hook": "...", "approved": false
-- }]

-- priorities shape:
-- [{
--   "id": "...", "area": "...", "statement": "...",
--   "urgency": "urgente|importante|deseable",
--   "module_origin": "M1", "jtbd_ids": [...], "approved": false
-- }]
