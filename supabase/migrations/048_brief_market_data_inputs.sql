-- ============================================================
-- 048: brief_documents.market_data_inputs
-- El consultor captura tipo de cambio / tasa Banxico / inflación / PIB /
-- tendencia del sector antes de generar el Contexto de Mercado
-- (BriefConsultorClient.tsx) — la columna nunca se creó, así que cada
-- guardado posterior a tocar esa sección fallaba con
-- "Could not find the 'market_data_inputs' column ... in the schema cache"
-- y se perdía todo lo generado después (resumen ejecutivo, planes).
-- ============================================================

ALTER TABLE brief_documents
  ADD COLUMN IF NOT EXISTS market_data_inputs JSONB DEFAULT '{}'::jsonb;
