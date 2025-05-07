import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Add strong cache control headers to reduce auth requests
function addCacheControlHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, max-age=15')
  response.headers.set('CDN-Cache-Control', 'private, max-age=15')
  return response
}

export async function middleware(request: NextRequest) {
  // Static paths to always skip middleware processing
  // These paths should be processed by the server without auth checks
  const STATIC_PATHS = [
    '/_next/',
    '/assets/',
    '/favicon.ico',
    '/api/auth/',
    '/auth/callback',
    '/block-metadata-init',
    '/block',
    '/avatars/'
  ]
  
  // Check if path should be skipped entirely
  const url = new URL(request.url)
  if (STATIC_PATHS.some(path => url.pathname.startsWith(path))) {
    return NextResponse.next()
  }
  
  // Default response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Create supabase client for middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Skip auth check for any remaining API routes
    if (url.pathname.startsWith('/api/')) {
      return addCacheControlHeaders(response)
    }

    // Use getUser for secure authentication
    const { data, error } = await supabase.auth.getUser()
    const isLoggedIn = !error && !!data?.user
    
    // Map routes for auth decisions
    const isPublicRoute = url.pathname === '/login' || 
                          url.pathname === '/register' || 
                          url.pathname.startsWith('/auth/')
                          
    // Handle auth redirects
    if (isLoggedIn && isPublicRoute) {
      return addCacheControlHeaders(NextResponse.redirect(new URL('/', request.url)))
    }

    if (!isLoggedIn && !isPublicRoute) {
      const redirectUrl = new URL('/login', request.url)
      if (url.pathname !== '/') {
        redirectUrl.searchParams.set('redirect', url.pathname)
      }
      return addCacheControlHeaders(NextResponse.redirect(redirectUrl))
    }

    // Default case - add cache headers and continue
    return addCacheControlHeaders(response)
  } catch (error) {
    console.error('Middleware error:', error)
    
    // On auth error, continue to the page but don't redirect
    // This avoids redirect loops on auth errors
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Only match specific routes to minimize middleware usage
    '/',
    '/:id',
    '/login',
    '/register',
    '/pricing',
    '/account',
    '/api/:path*'
  ],
}
