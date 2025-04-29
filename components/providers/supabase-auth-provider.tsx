'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Session, User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

type SupabaseAuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: Error | null
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  error: null,
})

export const useSupabaseAuth = () => {
  return useContext(SupabaseAuthContext)
}

export default function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null
    
    async function getSession() {
      try {
        setIsLoading(true)
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }
        
        setSession(session)
        setUser(session?.user || null)
        
        // Set up auth state listener
        authListener = await supabase.auth.onAuthStateChange(
          (_event, session) => {
            setSession(session)
            setUser(session?.user || null)
            router.refresh()
          }
        )
      } catch (error) {
        setError(error as Error)
        console.error('Error getting session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()
    
    return () => {
      // Clean up the subscription when the component unmounts
      if (authListener) {
        authListener.data.subscription.unsubscribe()
      }
    }
  }, [supabase, router])

  const value = {
    user,
    session,
    isLoading,
    error,
  }

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}
