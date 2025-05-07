'use client'

import { ThemeProvider } from 'next-themes'
import { SWRConfig } from 'swr'
import { Session } from '@supabase/supabase-js'
import { Suspense } from 'react'

import SupabaseAuthProvider from './supabase-auth-provider'

// Auth loading fallback to prevent hydration errors
function AuthLoadingFallback() {
  return <></>; // Empty fragment for minimal impact
}

export function Providers({ 
  children, 
  initialSession = null 
}: { 
  children: React.ReactNode,
  initialSession?: Session | null
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SWRConfig
        value={{
          fetcher: (resource, init) =>
            fetch(resource, init).then((res) => res.json()),
          revalidateOnFocus: false, // Prevent excessive revalidation
          dedupingInterval: 10000, // Dedupe requests within 10s window
          errorRetryCount: 2, // Limit retry attempts
        }}
      >
        <Suspense fallback={<AuthLoadingFallback />}>
          <SupabaseAuthProvider initialSession={initialSession}>
            {children}
          </SupabaseAuthProvider>
        </Suspense>
      </SWRConfig>
    </ThemeProvider>
  )
}
