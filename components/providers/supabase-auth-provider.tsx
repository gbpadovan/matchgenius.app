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
  refreshAuth: () => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  refreshAuth: async () => {}
})

export const useSupabaseAuth = () => {
  return useContext(SupabaseAuthContext)
}

export default function SupabaseAuthProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode
  initialSession?: Session | null
}) {
  const [user, setUser] = useState<User | null>(initialSession?.user || null)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(!initialSession)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()
  const supabase = createClient()
  
  /**
   * Function to refresh authentication data safely.
   */
  const refreshAuth = async (force = false) => {
    if (!force && session && user) {
      return
    }
    
    try {
      setIsLoading(true)
      
      // Always get user first to ensure security
      // This validates with the Supabase Auth server
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.warn('Warning getting user data:', userError.message)
        // Clear user state on error
        setUser(null)
        setSession(null)
        return
      }
      
      if (userData?.user) {
        setUser(userData.user)
        
        // Set the session from the user data response
        // This is safer than using getSession() directly
        if (userData?.session) {
          setSession(userData.session)
        } else {
          // User exists but no session, which is unusual
          console.warn('User exists but no session found')
          setSession(null)
        }
      } else {
        // No valid user, clear state
        setUser(null)
        setSession(null)
      }
    } catch (err) {
      console.error('Error refreshing auth:', err)
      
      // Don't update state on error to prevent loops
      if (err instanceof Error && err.message.includes('Auth session missing')) {
        console.log('Session missing, silently handling')
      } else {
        setError(err as Error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Setup auth listener with proper error handling
  useEffect(() => {
    let isActive = true
    let authListener: { subscription: { unsubscribe: () => void } } | null = null
    
    const setupAuth = async () => {
      try {
        // Always start by getting authenticated user data from the server
        // regardless of initial session to ensure security
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (isActive) {
          if (userData?.user) {
            setUser(userData.user)
            // Set the session from the user data response
            // This is safer than using getSession() directly
            if (userData?.session) {
              setSession(userData.session)
            }
          } else if (initialSession) {
            // We have an initial session but no valid user - this is unusual
            console.warn('Initial session provided but no valid user found')
            setSession(null)
            setUser(null)
          }
        }
        
        // Set up auth state listener with error handling
        authListener = supabase.auth.onAuthStateChange(
          async (event: string, newSession: Session | null) => {
            if (!isActive) return
            
            try {
              // Throttle TOKEN_REFRESHED events that can cause loops
              if (event === 'TOKEN_REFRESHED') {
                // Only update session for token refresh, don't trigger other actions
                if (newSession) setSession(newSession)
                return
              }
              
              // Handle critical auth events
              if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                // For all auth events, ALWAYS validate the user with getUser()
                // before updating state to ensure security
                const { data, error } = await supabase.auth.getUser()
                
                if (!error && data?.user && isActive) {
                  setUser(data.user)
                  setSession(newSession)
                } else {
                  // No valid user or error occurred
                  setUser(null)
                  setSession(null)
                }
                
                // Only refresh router for sign in/out
                if ((event === 'SIGNED_IN' || event === 'SIGNED_OUT') && isActive) {
                  // Use a timeout to prevent immediate refreshes
                  setTimeout(() => {
                    if (isActive) router.refresh()
                  }, 100)
                }
              }
            } catch (err) {
              console.error(`Error handling auth event ${event}:`, err)
            }
          }
        )
      } catch (err) {
        console.error('Error setting up auth:', err)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    
    setupAuth()
    
    // Cleanup function
    return () => {
      isActive = false
      if (authListener && authListener.subscription) {
        try {
          authListener.subscription.unsubscribe()
        } catch (e) {
          console.error('Error unsubscribing from auth events:', e)
        }
      }
    }
  }, [supabase, initialSession, router, refreshAuth])

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        error,
        refreshAuth: () => refreshAuth(true)
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  )
}
