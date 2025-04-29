import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  // Get the cookies from the request - must be awaited in Next.js 15
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Get a specific cookie by name
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          // This is a server action, and cookies can't be set directly in RSC
          // This will be ignored during RSC, but will work in Route Handlers and Server Actions
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          // This is a server action, and cookies can't be removed directly in RSC
          // This will be ignored during RSC, but will work in Route Handlers and Server Actions
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
