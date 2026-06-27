import type { ModuleCode, PremiumModuleCode } from '@/types'

export const MODULE_CREDITS: Record<ModuleCode, number> = {
  M1: 10,
  M2: 10,
  M3: 10,
  M4: 10, // +5 por documento procesado
  M5: 10,
  M6: 10, // +3 por colaborador
  M7: 15, // +20 al generar el brief
}

export const PREMIUM_CREDITS: Record<PremiumModuleCode, number> = {
  A: 25,
  B: 15,
  C: 15,
  D: 30,
  E: 15,
  F: 10,
  G: 15,
}

export const CREDIT_COSTS = {
  BRIEF_GENERATION:    20,
  DOCUMENT_PROCESSING:  5,
  COLLABORATOR_MODULE:  3,
  PROPOSAL_GENERATION:  5,
  WEEKLY_CHECKIN:       3,
  CLOSING_BRIEF:       20,
  BRIEF_SECTION:        2, // por sección generada en Brief de Cierre
}

// ── Core helpers ──────────────────────────────────────────────────────────────

/** Lee el account del usuario autenticado. Devuelve null si no existe. */
export async function getAccount(
  supabase: any,
  userEmail: string,
): Promise<{ id: string; credits_total: number; credits_used: number } | null> {
  const { data } = await supabase
    .from('accounts')
    .select('id, credits_total, credits_used')
    .eq('email', userEmail)
    .maybeSingle()
  return data ?? null
}

/** Verifica si hay créditos suficientes sin descontarlos. */
export async function checkCredits(
  supabase: any,
  accountId: string,
  amount: number,
): Promise<{ ok: boolean; remaining: number }> {
  const { data: account } = await supabase
    .from('accounts')
    .select('credits_total, credits_used')
    .eq('id', accountId)
    .single()

  if (!account) return { ok: false, remaining: 0 }
  const remaining = (account.credits_total ?? 0) - (account.credits_used ?? 0)
  return { ok: remaining >= amount, remaining }
}

/**
 * Descuenta créditos de una cuenta.
 * Hace check atómico: lee saldo actual antes de descontar.
 */
export async function deductCredits(
  supabase: any,
  accountId: string,
  amount: number,
): Promise<{ success: boolean; error?: string; remaining?: number }> {
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('credits_total, credits_used')
    .eq('id', accountId)
    .single()

  if (fetchError || !account) return { success: false, error: 'Cuenta no encontrada' }

  const remaining = (account.credits_total ?? 0) - (account.credits_used ?? 0)
  if (remaining < amount) {
    return { success: false, error: `Créditos insuficientes (necesitas ${amount}, tienes ${remaining})`, remaining }
  }

  const { error: updateError } = await supabase
    .from('accounts')
    .update({ credits_used: account.credits_used + amount })
    .eq('id', accountId)

  if (updateError) return { success: false, error: updateError.message }

  return { success: true, remaining: remaining - amount }
}

/** Shorthand: obtiene account por email y descuenta créditos en un solo paso. */
export async function deductCreditsByEmail(
  supabase: any,
  userEmail: string,
  amount: number,
): Promise<{ success: boolean; error?: string; remaining?: number }> {
  const account = await getAccount(supabase, userEmail)
  if (!account) return { success: false, error: 'Cuenta no encontrada' }
  return deductCredits(supabase, account.id, amount)
}
