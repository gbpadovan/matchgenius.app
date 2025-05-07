import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../supabase/server';

// Standard cache durations
export const CACHE_DURATIONS = {
  NONE: 'no-store, max-age=0',
  SHORT: 'private, max-age=5',
  MEDIUM: 'private, max-age=60',
  LONG: 'private, max-age=300'
};

// Helper to get authenticated user from request
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  
  // Use getUser for secure authentication
  const { data: userData, error } = await supabase.auth.getUser();
  
  if (error || !userData?.user) {
    return { user: null, error: error || new Error('No authenticated user') };
  }
  
  return { user: userData.user, error: null };
}

// Standard response builder with cache control
export function apiResponse<T>(data: T, options?: {
  status?: number;
  cacheControl?: string;
  headers?: Record<string, string>;
}) {
  const {
    status = 200,
    cacheControl = CACHE_DURATIONS.MEDIUM,
    headers = {}
  } = options || {};
  
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      ...headers
    }
  });
}

// Error response builder
export function apiError(message: string, options?: {
  status?: number;
  cacheControl?: string;
  headers?: Record<string, string>;
}) {
  const {
    status = 400,
    cacheControl = CACHE_DURATIONS.NONE,
    headers = {}
  } = options || {};
  
  return NextResponse.json({ error: message }, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      ...headers
    }
  });
}

// Authentication error
export function authError() {
  return apiError('Unauthorized', { 
    status: 401,
    cacheControl: CACHE_DURATIONS.NONE
  });
}

// Server error
export function serverError(error: any) {
  console.error('API Server Error:', error);
  return apiError('Internal server error', { 
    status: 500,
    cacheControl: CACHE_DURATIONS.NONE
  });
}
