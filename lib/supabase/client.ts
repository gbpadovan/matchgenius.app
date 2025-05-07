import { createBrowserClient } from '@supabase/ssr'

// Store a singleton client instance
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  // Return the existing client if we already have one
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Create a new client if needed
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Reduce session refresh frequency
        detectSessionInUrl: true,
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        // Only check for refresh after 4 minutes (default is 3)
        autoRefreshTimeInSeconds: 240
      }
    }
  )
  
  return supabaseClient
}
