import { createServerComponentSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { Database } from '@/types/database';

export const createSupabaseServerClient = () =>
  createServerComponentSupabaseClient<Database>({ cookies, headers: () => headers() });

export async function getServerSession() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
