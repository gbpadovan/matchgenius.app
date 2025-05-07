import { createClient } from './server';
import type { User } from '@supabase/supabase-js';

/**
 * Helper function to get authenticated user data securely
 * Avoids the "Using the user object from session" warning
 */
export async function getAuthenticatedUser(): Promise<{ user: User | null, error: Error | null }> {
  try {
    const supabase = await createClient();
    
    // Always use getUser() instead of session.user
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return { user: null, error };
    }
    
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return { user: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Helper function to get session securely by first validating the user
 * Avoids the "Using the user object from session" warning
 */
export async function getAuthSession() {
  try {
    const supabase = await createClient();
    // Always use getUser() first to validate with the Supabase Auth server
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      return { session: null, error: userError || new Error('User not authenticated') };
    }
    
    // Now we can safely get the session since we've validated the user
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return { session: null, error };
    }
    
    return { session: data.session, error: null };
  } catch (error) {
    console.error('Error getting auth session:', error);
    return { session: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
