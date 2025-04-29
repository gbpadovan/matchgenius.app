'use client'

import { ThemeProvider } from 'next-themes'
import { SWRConfig } from 'swr'

import SupabaseAuthProvider from './supabase-auth-provider'

export function Providers({ children }: { children: React.ReactNode }) {
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
        }}
      >
        <SupabaseAuthProvider>
          {children}
        </SupabaseAuthProvider>
      </SWRConfig>
    </ThemeProvider>
  )
}
