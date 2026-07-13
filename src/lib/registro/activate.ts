// Activación de cuenta de consultor: se ejecuta una vez que el código de
// verificación (enviado por correo, ver send-code/route.ts) fue validado.
// Los nombres de columna (whatsapp_code/whatsapp_verified) son un remanente
// de cuando el código se mandaba por WhatsApp — se reutilizan tal cual para
// no requerir una migración, pero hoy solo significan "código verificado".

type ActivateResult =
  | { ok: true }
  | { ok: false; error: string; status: number }

export async function activateAccountIfReady(
  admin: any,
  pending: any
): Promise<ActivateResult> {
  // Solo activar si el código ya fue verificado
  if (!pending.whatsapp_verified || !pending.email_verified) {
    return { ok: false, error: 'Verificación incompleta', status: 400 }
  }

  if (!pending.password) {
    return { ok: false, error: 'Falta la contraseña del registro. Vuelve a registrarte.', status: 400 }
  }

  // Crear usuario en Supabase Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: pending.email,
    password: pending.password,
    email_confirm: true,
    user_metadata: {
      nombre: pending.nombre,
      empresa: pending.empresa,
      phone: pending.phone,
      role: 'consultor',
    },
  })

  if (authErr || !authData?.user) {
    // Si ya está registrado (p.ej. condición de carrera con otro registro en curso), no es éxito
    if (authErr?.message?.includes('already registered') || authErr?.message?.includes('already been registered')) {
      await admin.from('pending_registrations').delete().eq('email', pending.email)
      return {
        ok: false,
        error: 'Este correo ya está registrado. Inicia sesión o usa "Olvidé mi contraseña".',
        status: 409,
      }
    }
    return { ok: false, error: authErr?.message ?? 'No se pudo crear el usuario', status: 500 }
  }

  // Crear cuenta con 100 créditos de bienvenida (si no existe ya)
  const { data: existingAccount } = await admin
    .from('accounts')
    .select('id')
    .eq('email', pending.email)
    .maybeSingle()

  if (!existingAccount) {
    await admin.from('accounts').insert({
      email: pending.email,
      company_name: pending.empresa,
      plan_id: 'starter',
      credits_total: 100,
      credits_used: 0,
      status: 'active',
    })
  }

  // Limpiar registro pendiente (incluye borrar el password almacenado)
  await admin.from('pending_registrations').delete().eq('email', pending.email)

  return { ok: true }
}
