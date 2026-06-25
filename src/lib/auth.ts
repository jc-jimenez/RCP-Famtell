import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export type TenantContext = {
  session: any;
  role: string | null;
  caseId: string | null;
  jobTitle: string | null;
  permissions: object | null;
};

export async function getSupabaseSession() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireSupabaseSession() {
  const session = await getSupabaseSession();
  if (!session) redirect('/login');
  return session;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return null;

  const db = supabase as any;
  const { data: caseUser, error } = await db
    .from('case_users')
    .select('role,case_id,job_title,permissions_json')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) console.error('Error fetching tenant context:', error.message);

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
  if (!context?.session) redirect('/login');
  return context;
}
