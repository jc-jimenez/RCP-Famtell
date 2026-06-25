import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/types/database';

export type TenantContext = {
  session: any;
  role: string | null;
  caseId: string | null;
  jobTitle: string | null;
  permissions: object | null;
};

export async function getSupabaseSession() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session;
}

export async function requireSupabaseSession() {
  const session = await getSupabaseSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const userId = session.user.id;
  const caseUserResult: any = await supabase
    .from('case_users')
    .select('role,case_id,job_title,permissions_json')
    .eq('user_id', userId)
    .maybeSingle();

  const caseUser = caseUserResult.data;
  const error = caseUserResult.error;

  if (error) {
    console.error('Error fetching tenant context:', error.message);
  }

  return {
    session,
    role: caseUser?.role ?? null,
    caseId: caseUser?.case_id ?? null,
    jobTitle: caseUser?.job_title ?? null,
    permissions: (caseUser?.permissions_json as object) ?? null
  };
}

export async function requireTenantContext() {
  const context = await getTenantContext();

  if (!context?.session) {
    redirect('/login');
  }

  return context;
}
