import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side authentication utility function
 * Returns the user session and user data from Supabase Auth
 * Uses getUser() for secure authentication instead of relying on session data directly
 */
export async function auth() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  
  // Use getUser() for secure authentication
  // This also returns the session data securely
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData?.user) {
    return null;
  }
  
  // We still need to get the session, but we can do it safely now that we've validated the user
  const { data: sessionData } = await supabase.auth.getSession();
  
  return {
    user: {
      id: userData.user.id,
      email: userData.user.email,
      name: userData.user.user_metadata?.name || null,
    },
    // Use the session from the getSession call, but only after validating the user
    session: sessionData.session
  };
}
