-- Marca explícita de cuentas de prueba/demo dentro de un caso real. Se
-- encontró en vivo que una cuenta "Demo Director Comercial" ocupaba el
-- puesto real de Gerente Comercial del caso Famtell y ya había completado
-- todos sus módulos, inflando el avance case-wide (computeAllModulesCompletion
-- / isCaseFullyComplete, el bloqueo duro antes de generar el Brief) sin que
-- el ocupante real del puesto hubiera contestado nada. Ver moduleCompletion.ts.

alter table case_users
  add column if not exists is_test_account boolean not null default false;
