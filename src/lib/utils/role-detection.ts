import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole, TenantContext, PermissionsMap } from '@/types'

export async function detectUserRole(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<TenantContext | null> {
  // 1. ¿Super Admin?
  if (email === process.env.SUPER_ADMIN_EMAIL) {
    return {
      userId,
      email,
      role: 'super_admin',
      caseId: null,
      accountId: null,
      jobTitle: null,
      permissions: null,
    }
  }

  // 2. ¿Consultor? → tiene registro en accounts
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (account) {
    return {
      userId,
      email,
      role: 'consultant',
      caseId: null,
      accountId: account.id,
      jobTitle: null,
      permissions: null,
    }
  }

  // 3. ¿Directivo o Colaborador? → tiene registro en case_users
  const { data: caseUser } = await supabase
    .from('case_users')
    .select('role, case_id, job_title, permissions_json')
    .eq('user_id', userId)
    .maybeSingle()

  if (caseUser) {
    return {
      userId,
      email,
      role: caseUser.role as UserRole,
      caseId: caseUser.case_id,
      accountId: null,
      jobTitle: caseUser.job_title ?? null,
      permissions: (caseUser.permissions_json as PermissionsMap) ?? null,
    }
  }

  return null
}

export function getRoleRedirect(role: UserRole, caseId: string | null): string {
  switch (role) {
    case 'super_admin':
      return '/admin'
    case 'consultant':
      return '/dashboard'
    case 'director':
      return caseId ? `/caso/${caseId}` : '/login'
    case 'collaborator':
      return '/mis-modulos'
    default:
      return '/login'
  }
}
