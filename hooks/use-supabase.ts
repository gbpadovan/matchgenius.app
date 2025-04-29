'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { type SupabaseClient } from '@supabase/supabase-js'

// Create a singleton Supabase client
let supabaseInstance: SupabaseClient | null = null

export function useSupabase() {
  const [supabase] = useState(() => {
    if (!supabaseInstance) {
      supabaseInstance = createClient()
    }
    return supabaseInstance
  })

  return { supabase }
}
