import { createClient } from './server';

/**
 * Helper function to securely authenticate a user using getUser instead of getSession
 * This addresses the security warning about using getSession directly
 */
export async function authenticateUser() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData?.user) {
    return { 
      authenticated: false, 
      user: null, 
      supabase,
      error: userError || new Error('User not authenticated')
    };
  }
  
  return { 
    authenticated: true, 
    user: userData.user,
    supabase,
    error: null
  };
}

/**
 * Helper function to create a standardized unauthorized response
 */
export function createUnauthorizedResponse(message = 'Unauthorized') {
  return new Response(message, { 
    status: 401,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
