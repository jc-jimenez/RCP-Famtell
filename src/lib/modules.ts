// Inicialización de módulos de un caso — compartido entre la ruta API
// (api/modules GET) y componentes de servidor que necesitan garantizar que
// las filas de `modules` existan antes de leerlas, sin depender de un
// fetch() HTTP a sí mismo (ese patrón nunca reenvía cookies de sesión y
// además usaba NEXT_PUBLIC_APP_URL, que en dev local apunta a producción).
export async function ensureModulesInitialized(db: any, caseId: string): Promise<void> {
  const { data: existing } = await db
    .from('modules')
    .select('id')
    .eq('case_id', caseId)
    .limit(1)

  if (existing && existing.length > 0) return

  const { data: templates } = await db
    .from('module_templates')
    .select('code')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const toInsert = (templates ?? []).map((t: any, i: number) => ({
    case_id: caseId,
    module_code: t.code,
    status: i === 0 ? 'active' : 'locked',
  }))

  if (toInsert.length > 0) {
    await db.from('modules').insert(toInsert)
  }
}
