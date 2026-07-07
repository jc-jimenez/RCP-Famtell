-- ============================================================
-- 027: Brief — columna jtbd_comercial que nunca se creó
-- ============================================================
-- Detectado en QA de Fase 4 (docs/PRD_RCPFAMTELL3PL.md sección 10):
-- la etapa "JTBD Comercial" del wizard del Brief existía en la UI
-- (BriefConsultorClient) y en el endpoint de generación, pero la
-- columna nunca se agregó en ninguna migración — todo guardado de
-- esa sección fallaba en silencio (api/brief/route.ts ignoraba el
-- error de PostgREST y devolvía 200 con brief: null).
-- ============================================================

ALTER TABLE brief_documents
  ADD COLUMN IF NOT EXISTS jtbd_comercial JSONB DEFAULT '[]'::jsonb;

-- jtbd_comercial shape:
-- [{
--   "id": "jc_1", "statement": "Cuando..., necesito..., para...",
--   "situation": "...", "job": "...", "outcome": "...",
--   "client_type": "...", "frequency": "recurrente|estacional|ocasional",
--   "market_size": "grande|mediano|nicho", "evidence": "...",
--   "source_module": "M1|M3", "approved": false
-- }]
