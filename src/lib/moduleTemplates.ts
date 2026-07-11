// Resuelve si un caso tiene catálogo propio (v2, generado por IA) o usa el
// catálogo global compartido (M1-M7, case_id nulo, comportamiento de siempre).
// Cada sitio que lee module_templates aplica el filtro correspondiente sobre
// su propio select — este helper solo decide CUÁL de los dos usar.
export async function resolveCatalogScope(db: any, caseId: string): Promise<'case' | 'global'> {
  const { data } = await db.from('module_templates').select('id').eq('case_id', caseId).limit(1)
  return data && data.length > 0 ? 'case' : 'global'
}

// Aplica el filtro de case_id resuelto sobre cualquier query builder de
// Supabase que ya traiga su propio .select(...) armado (plano o anidado).
export function applyCatalogScope<T extends { eq: Function; is: Function }>(
  query: T,
  scope: 'case' | 'global',
  caseId: string,
): T {
  return scope === 'case' ? (query.eq('case_id', caseId) as T) : (query.is('case_id', null) as T)
}
