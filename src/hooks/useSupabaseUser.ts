'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

export function useSupabaseUser() {
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
      setUserId(data.session?.user.id ?? null)
    })
  }, [])

  return { email, userId }
}
