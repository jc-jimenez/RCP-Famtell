// Columnas reales de la tabla accounts: plan_id, credits_total, credits_used.
// La UI usa subscription_plan y credits_balance — este helper traduce.

export const ACCOUNT_COLUMNS =
  'id,email,company_name,credits_total,credits_used,plan_id,status,created_at'

export interface AccountUI {
  id: string
  email: string
  company_name: string
  credits_balance: number
  subscription_plan: string
  status: string
  created_at: string
}

export function accountToUI(a: any): AccountUI {
  return {
    id: a.id,
    email: a.email,
    company_name: a.company_name ?? '',
    credits_balance: (a.credits_total ?? 0) - (a.credits_used ?? 0),
    subscription_plan: a.plan_id ?? 'starter',
    status: a.status ?? 'active',
    created_at: a.created_at,
  }
}
