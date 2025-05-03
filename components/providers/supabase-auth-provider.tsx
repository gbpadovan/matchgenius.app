'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
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

// Helper function to debounce function calls
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout | null = null
  return function(...args: any[]) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
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
  
  // Track auth state to prevent loops
  const lastEventRef = useRef<string | null>(null)
  const lastUserIdRef = useRef<string | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const authListenerRef = useRef<any>(null)
  const isRefreshingRef = useRef<boolean>(false)
  const lastRefreshTimeRef = useRef<number>(0)
  
  // Minimum time between auth refreshes (5 seconds)
  const MIN_REFRESH_INTERVAL = 5000

  // Create a debounced router refresh function
  const debouncedRefresh = useRef(
    debounce(() => {
      console.log('Executing debounced router refresh')
      router.refresh()
    }, 1000) // Increased debounce time to 1 second
  ).current
  
  // Function to fetch user data safely
  const fetchUserData = useCallback(async () => {
    try {
      const now = Date.now()
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current
      
      // Prevent rapid consecutive refreshes
      if (isRefreshingRef.current || timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
        console.log(`Skipping auth refresh, last refresh was ${timeSinceLastRefresh}ms ago`)
        return
      }
      
      isRefreshingRef.current = true
      lastRefreshTimeRef.current = now
      
      // Get the session
      const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }
      
      // Only update session if it's different
      const sessionChanged = 
        (!session && newSession) || 
        (session && !newSession) || 
        (session?.user?.id !== newSession?.user?.id)
      
      if (sessionChanged) {
        setSession(newSession)
      }
      
      // Get authenticated user data
      if (newSession) {
        const { data: { user: newUser }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          throw userError
        }
        
        // Only update user if it's different
        if (newUser && (!user || user.id !== newUser.id)) {
          setUser(newUser)
          lastUserIdRef.current = newUser.id
        }
      } else if (user) {
        // Clear user if session is gone
        setUser(null)
        lastUserIdRef.current = null
      }
    } catch (error) {
      console.error('Error fetching auth data:', error)
      setError(error as Error)
    } finally {
      isRefreshingRef.current = false
    }
  }, [supabase, user, session])
  
  // Public method to refresh auth state
  const refreshAuth = useCallback(async () => {
    await fetchUserData()
  }, [fetchUserData])

  // Initialize auth state and set up listeners
  useEffect(() => {
    async function initializeAuth() {
      try {
        setIsLoading(true)
        await fetchUserData()
        
        // Set up auth state listener if not already set
        if (!authListenerRef.current) {
          const { data } = await supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              // Skip TOKEN_REFRESHED events entirely to prevent loops
              if (event === 'TOKEN_REFRESHED') {
                console.log('Ignoring TOKEN_REFRESHED event to prevent loops')
                return
              }
              
              // Prevent handling duplicate events
              const isDuplicate = 
                lastEventRef.current === event && 
                ((newSession?.user?.id === lastUserIdRef.current) || 
                 (!newSession && !lastUserIdRef.current))
              
              if (isDuplicate) {
                console.log('Ignoring duplicate auth event:', event)
                return
              }
              
              console.log('Supabase Auth Event:', event)
              lastEventRef.current = event
              
              // Update session state
              setSession(newSession)
              
              // Get authenticated user data when auth state changes
              if (newSession) {
                try {
                  const { data: { user: newUser }, error: userError } = await supabase.auth.getUser()
                  
                  if (userError) {
                    console.error('Error getting user:', userError)
                  } else {
                    setUser(newUser)
                    lastUserIdRef.current = newUser.id
                  }
                } catch (error) {
                  console.error('Error in auth state change handler:', error)
                }
              } else {
                setUser(null)
                lastUserIdRef.current = null
              }
              
              // Only refresh the router for sign-in and sign-out events
              if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                console.log('Triggering router refresh due to event:', event)
                
                // Clear any existing timeout
                if (refreshTimeoutRef.current) {
                  clearTimeout(refreshTimeoutRef.current)
                }
                
                // Use the debounced refresh
                debouncedRefresh()
              }
            }
          )
          
          authListenerRef.current = data
        }
      } catch (error) {
        setError(error as Error)
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
    
    return () => {
      // Clean up the subscription when the component unmounts
      if (authListenerRef.current) {
        authListenerRef.current.subscription.unsubscribe()
        authListenerRef.current = null
      }
      
      // Clear any pending timeouts
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [supabase, debouncedRefresh, fetchUserData])

  const value = {
    user,
    session,
    isLoading,
    error,
    refreshAuth
  }

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}
