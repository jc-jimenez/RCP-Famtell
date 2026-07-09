-- ============================================================
-- 024: Costo en créditos configurable por módulo
-- ============================================================
-- Ver docs/PRD_RCPFAMTELL3PL.md sección 9.2. module_templates ya
-- tenía sort_order (migración 011) pero el costo en créditos seguía
-- hardcodeado en src/lib/credits.ts (MODULE_CREDITS) y el orden
-- duplicado como array literal en varios archivos. Este cambio hace
-- que api/modules y api/sessions lean el costo desde esta columna.
-- ============================================================

ALTER TABLE module_templates
  ADD COLUMN IF NOT EXISTS credit_cost int NOT NULL DEFAULT 10;

UPDATE module_templates SET credit_cost = 15 WHERE code = 'M7';
-- M1-M6 se quedan en el default de 10, que ya coincide con MODULE_CREDITS hoy.
