import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { email, password, companyName, planId } = await request.json();

  if (!email || !password || !companyName || !planId) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  const adminClient = getSupabaseAdmin();

  if (!adminClient) {
    return NextResponse.json({ error: 'Admin Supabase no configurado' }, { status: 500 });
  }

  const { data: user, error: signUpError } = await (adminClient as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'consultant'
    }
  });

  if (signUpError || !user) {
    return NextResponse.json({ error: signUpError?.message ?? 'No se pudo crear el usuario' }, { status: 500 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Admin Supabase no configurado' }, { status: 500 });
  }

  const accountInsert: any = await (supabaseAdmin as any)
    .from('accounts')
    .insert([
      {
        email,
        plan_id: planId,
        credits_total: 0,
        credits_used: 0
      }
    ])
    .select()
    .single();

  if (accountInsert.error || !accountInsert.data) {
    return NextResponse.json({ error: accountInsert.error?.message ?? 'No se pudo crear la cuenta' }, { status: 500 });
  }

  return NextResponse.json({ account: accountInsert.data });
}
