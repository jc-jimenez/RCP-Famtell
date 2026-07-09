import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole, TenantContext, PermissionsMap } from '@/types'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isSuperAdminEmail } from '@/lib/permissions'

export async function detectUserRole(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<TenantContext | null> {
  // 1. ¿Super Admin?
  if (isSuperAdminEmail(email)) {
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

  // Resolver rol/tenant es una operación de sistema → usar admin (bypass RLS).
  // En el Edge runtime del middleware el contexto de auth no aplica RLS de
  // forma fiable, lo que provocaba que no se detectara el rol del consultor.
  const db = (getSupabaseAdmin() ?? supabase) as any

  // 2. ¿Consultor? → tiene registro en accounts
  const { data: account } = await db
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
  const { data: caseUser } = await db
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
