import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Use synchronous cookie access in middleware
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Set cookies on both the request and response in middleware
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
          // Remove cookies from both the request and response in middleware
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

  const { data: { session } } = await supabase.auth.getSession()
  const url = new URL(request.url)
  const isLoggedIn = !!session
  const isOnChat = url.pathname.startsWith('/')
  const isOnRegister = url.pathname.startsWith('/register')
  const isOnLogin = url.pathname.startsWith('/login')

  if (isLoggedIn && (isOnLogin || isOnRegister)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isOnRegister || isOnLogin) {
    return response
  }

  if (isOnChat) {
    if (isLoggedIn) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
}
