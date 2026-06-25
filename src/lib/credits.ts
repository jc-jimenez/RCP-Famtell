import type { ModuleCode, PremiumModuleCode } from '@/types'

// Costo de créditos por módulo (base + por interacción)
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
  A: 25, // Valuación
  B: 15, // Palancas financieras
  C: 15, // Riesgo
  D: 30, // M&A
  E: 15, // Proyección
  F: 10, // Brechas de rol (por usuario)
  G: 15, // Capital humano
}

export const CREDIT_COSTS = {
  BRIEF_GENERATION: 20,
  DOCUMENT_PROCESSING: 5,
  COLLABORATOR_MODULE: 3,
  PROPOSAL_GENERATION: 5,
  WEEKLY_CHECKIN: 3,
  CLOSING_BRIEF: 20,
}

export async function deductCredits(
  supabase: any,
  accountId: string,
  amount: number,
  description: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('credits_total, credits_used')
    .eq('id', accountId)
    .single()

  if (fetchError || !account) {
    return { success: false, error: 'Cuenta no encontrada' }
  }

  const remaining = account.credits_total - account.credits_used
  if (remaining < amount) {
    return { success: false, error: 'Créditos insuficientes' }
  }

  const { error: updateError } = await supabase
    .from('accounts')
    .update({ credits_used: account.credits_used + amount })
    .eq('id', accountId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}
