-- ============================================================
-- 047: sessions — caché de auditoría pregunta↔respuesta
-- ============================================================
-- auditModuleCoverage (participantBackupAudit.ts) le pide a un modelo que
-- lea la transcripción completa de una sesión y la compare contra el
-- catálogo de preguntas del puesto — se llama una vez por sesión desde dos
-- lugares (respaldo PDF por participante, y la auditoría de todo el caso
-- para "Hipótesis a Confirmar"). Sin caché, cada llamada a cualquiera de
-- los dos vuelve a pagar la misma auditoría de las mismas sesiones ya
-- cerradas — encontrado en vivo: generar hipótesis para un caso de 9
-- participantes disparó ~46 llamadas a IA, la mayoría repetidas de
-- ejecuciones anteriores.
--
-- Cacheable con seguridad porque una sesión con completed:true no vuelve a
-- recibir mensajes — el único caso real de invalidación es que el CATÁLOGO
-- de preguntas cambie después (el consultor agrega una pregunta
-- personalizada, o activa/desactiva una) — por eso el caché guarda también
-- el catálogo exacto usado, no solo el resultado, y se invalida si no
-- coincide con el catálogo actual.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS qa_audit_cache JSONB;

-- qa_audit_cache shape:
-- {
--   "questions": ["texto pregunta 1", "texto pregunta 2", ...],  -- catálogo exacto usado
--   "coverage": [{ "question": "...", "answer": "...", "covered": true }, ...],
--   "cached_at": "2026-07-20T..."
-- }
-- null mientras no se ha auditado nunca esta sesión.
