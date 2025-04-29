'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { UserProfile } from '@/components/user-profile'
import { useSupabaseAuth } from '@/components/providers/supabase-auth-provider'
import { Button } from '@/components/ui/button'

export function Header() {
  const { user, isLoading } = useSupabaseAuth()
  const pathname = usePathname()
  
  // Don't show header on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/auth-error') {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Match Genius</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search or other components can go here */}
          </div>
          <nav className="flex items-center">
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : user ? (
              <UserProfile user={user} />
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
