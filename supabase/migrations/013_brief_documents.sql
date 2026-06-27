-- ============================================================
-- 013: Brief de Cierre — tabla brief_documents
-- Guarda el entregable ejecutivo por caso
-- Estado: draft → published
-- Visibilidad: el consultor controla qué roles pueden verlo
-- ============================================================

CREATE TABLE IF NOT EXISTS brief_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),

  -- Estado del documento
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at    TIMESTAMPTZ,

  -- Visibilidad: array de user_ids que pueden ver el brief publicado
  -- Si es NULL y published, lo ven todos los case_users del caso
  visible_to      UUID[],

  -- Metadata del brief
  title           TEXT NOT NULL DEFAULT 'Brief de Cierre',
  executive_summary TEXT,

  -- Contexto de mercado (generado por Nova + subida de docs)
  market_context  JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "sector": "3PL",
  --   "macro": "texto generado",
  --   "short_term": "perspectiva 0-12 meses",
  --   "mid_term": "perspectiva 1-3 años",
  --   "long_term": "perspectiva 3-5 años",
  --   "opportunities": ["..."],
  --   "risks": ["..."],
  --   "sources": ["nombre del reporte/estudio"]
  -- }

  -- Hallazgos por módulo (resumen ejecutivo M1-M7)
  module_findings JSONB DEFAULT '{}'::jsonb,
  -- { "M1": "hallazgo...", "M2": "...", ... }

  -- Índice de Intención Estratégica (snapshot al momento de generar)
  ier_snapshot    JSONB DEFAULT '{}'::jsonb,
  -- { "dominant": "growth", "score": 35, "blue": 4, "yellow": 2, "red": 1 }

  -- Planes por horizonte
  plan_90d        JSONB DEFAULT '[]'::jsonb,
  -- [{ "area": "Comercial", "accion": "...", "responsable": "...", "kpi": "..." }]

  plan_6m         JSONB DEFAULT '[]'::jsonb,
  plan_1a         JSONB DEFAULT '[]'::jsonb,
  plan_3a         JSONB DEFAULT '[]'::jsonb,

  -- Notas del consultor (texto libre, no publicado al directivo)
  consultant_notes TEXT,

  -- Documentos adjuntos subidos por el consultor
  attachments     JSONB DEFAULT '[]'::jsonb,
  -- [{ "name": "Reporte CBRE Q1 2025.pdf", "size": 204800, "uploaded_at": "..." }]

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS brief_documents_case_id_idx ON brief_documents(case_id);
CREATE INDEX IF NOT EXISTS brief_documents_status_idx  ON brief_documents(status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_brief_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER brief_documents_updated_at
  BEFORE UPDATE ON brief_documents
  FOR EACH ROW EXECUTE FUNCTION update_brief_updated_at();

-- RLS
ALTER TABLE brief_documents ENABLE ROW LEVEL SECURITY;

-- El consultor (creador) puede hacer todo
CREATE POLICY "brief_owner_all" ON brief_documents
  FOR ALL USING (created_by = auth.uid());

-- Directivos y colaboradores ven el brief si está publicado y son case_users del caso
CREATE POLICY "brief_published_read" ON brief_documents
  FOR SELECT USING (
    status = 'published'
    AND (
      -- Sin restricción de visible_to → todos los case_users
      visible_to IS NULL
      OR auth.uid() = ANY(visible_to)
    )
    AND EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = brief_documents.case_id
        AND case_users.user_id = auth.uid()
    )
  );
