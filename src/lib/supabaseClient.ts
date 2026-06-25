'use client';

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export const supabase = createBrowserSupabaseClient<Database>();
