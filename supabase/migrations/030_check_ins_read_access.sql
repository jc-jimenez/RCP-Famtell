-- ============================================================
-- 030: Acceso de lectura a check_ins para todos los roles del caso
-- ============================================================
-- La política original (migración 001) solo dejaba leer/escribir a quien
-- había SUBMITEADO la fila (user_id = auth.uid()) o al consultor dueño del
-- caso. Un directivo que no capturó una semana, o un colaborador, no podían
-- leer NINGÚN check-in del caso — ni siquiera los suyos de semanas
-- anteriores capturados desde otra sesión. Se separa lectura (amplia, todo
-- miembro del caso + consultor) de escritura (se mantiene restringida:
-- quien lo capturó, o el consultor).
-- Ver docs/PRD_RCPFAMTELL3PL.md sección "Check-in semanal".
-- ============================================================

DROP POLICY IF EXISTS "check_ins_access" ON check_ins;

CREATE POLICY "check_ins_member_read" ON check_ins
  FOR SELECT TO authenticated
  USING (
    case_id IN (SELECT my_member_case_ids())
    OR case_id IN (SELECT my_consultant_case_ids())
  );

CREATE POLICY "check_ins_write" ON check_ins
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR case_id IN (SELECT my_consultant_case_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR case_id IN (SELECT my_consultant_case_ids())
  );
