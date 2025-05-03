'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useSupabaseAuth } from '@/components/providers/supabase-auth-provider';

export type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | null;

interface SubscriptionContextType {
  subscription: {
    id: string;
    userId: string;
    status: SubscriptionStatus;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: Date | null;
  } | null;
  isLoading: boolean;
  isSubscribed: boolean;
  refreshSubscription: () => Promise<void>; // Add this line
}

export const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  isLoading: true,
  isSubscribed: false,
  refreshSubscription: async () => {}, // Add this line
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

// Helper type to extract the refreshAuth method from the auth context
type AuthContextType = ReturnType<typeof useSupabaseAuth>;

export function SubscriptionProvider({
  children,
  initialSubscription = null,
}: {
  children: React.ReactNode;
  initialSubscription?: any;
}) {
  const router = useRouter();
  const { user, session, isLoading: authLoading, refreshAuth } = useSupabaseAuth();
  const [subscription, setSubscription] = useState(initialSubscription);
  const [isLoading, setIsLoading] = useState(!initialSubscription);
  const [hasInitialFetch, setHasInitialFetch] = useState(!!initialSubscription);
  
  // Update subscription state when initialSubscription changes
  useEffect(() => {
    if (initialSubscription) {
      console.log('SubscriptionProvider: Received initial subscription data:', initialSubscription);
      setSubscription(initialSubscription);
      setHasInitialFetch(true);
      setIsLoading(false);
    }
  }, [initialSubscription]);
  
  // Track last fetch time to prevent frequent API calls
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_COOLDOWN = 60000; // 60 seconds cooldown between fetches
  const isMountedRef = useRef<boolean>(false);
  const pendingFetchRef = useRef<boolean>(false);
  
  // Memoize the fetchSubscription function to avoid recreating it on each render
  const fetchSubscriptionMemoized = useCallback(async () => {
    // Skip if there's already a pending fetch
    if (pendingFetchRef.current) {
      console.log('SubscriptionProvider: Skipping fetch, another fetch is in progress');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    // Only fetch if we haven't fetched recently
    if (timeSinceLastFetch <= FETCH_COOLDOWN) {
      console.log(`SubscriptionProvider: Skipping fetch, last fetch was ${timeSinceLastFetch}ms ago`);
      return;
    }
    
    try {
      pendingFetchRef.current = true;
      await fetchSubscription();
    } finally {
      pendingFetchRef.current = false;
    }
  }, []);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch on mount if we have a user and no initial data
    if (!hasInitialFetch && !authLoading && user) {
      console.log('SubscriptionProvider: No initial data, fetching from API...');
      fetchSubscriptionMemoized().then(() => {
        if (isMountedRef.current) {
          setHasInitialFetch(true);
        }
      });
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [hasInitialFetch, authLoading, user, fetchSubscriptionMemoized]);
  
  // Add event listener for subscription refresh with debouncing
  useEffect(() => {
    // Debounce the refresh function to prevent multiple rapid calls
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    const handleRefreshSubscription = () => {
      if (user?.id) {
        // Clear any existing timeout
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        // Set a new timeout
        refreshTimeout = setTimeout(() => {
          console.log('Executing debounced subscription refresh');
          fetchSubscriptionMemoized();
        }, 2000); // 2 second debounce
      }
    };
    
    window.addEventListener('refresh-subscription', handleRefreshSubscription);
    return () => {
      window.removeEventListener('refresh-subscription', handleRefreshSubscription);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [user?.id, fetchSubscriptionMemoized]);
  
  const fetchSubscription = async () => {
    try {
      // Update last fetch time
      lastFetchTimeRef.current = Date.now();
      setIsLoading(true);
      
      // If we don't have a user, clear subscription and return
      if (!user?.id) {
        console.log('No authenticated user, clearing subscription');
        setSubscription(null);
        return;
      }
      
      console.log('Fetching subscription data...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        const response = await fetch('/api/subscription', {
          signal: controller.signal,
          cache: 'no-store', // Ensure we're not getting a cached response
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        console.log('Subscription API response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            // Handle unauthorized silently
            console.log('Unauthorized response from subscription API');
            setSubscription(null);
            return;
          }
          throw new Error('Failed to fetch subscription');
        }
        
        const data = await response.json();
        
        // Check if data is different from current subscription to avoid unnecessary updates
        const isDataDifferent = JSON.stringify(data) !== JSON.stringify(subscription);
        if (!isDataDifferent && subscription !== null) {
          console.log('Subscription data unchanged, skipping update');
          return;
        }
        
        console.log('Subscription data from API:', data);
        
        if (data) {
          // Normalize the subscription data - fix date handling
          try {
            // Handle the date conversion explicitly
            const normalizedData = {
              ...data,
              stripeCurrentPeriodEnd: data.stripeCurrentPeriodEnd 
                ? new Date(data.stripeCurrentPeriodEnd) 
                : null
            };
            
            console.log('Normalized subscription data:', normalizedData);
            setSubscription(normalizedData);
          } catch (e) {
            console.error('Error parsing period end date:', e);
            setSubscription(data);
          }
        } else {
          console.log('No subscription data returned from API');
          setSubscription(null);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError; // Re-throw to be caught by the outer try-catch
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Subscription API request timed out');
        return; // Don't update state or show error for timeouts
      }
      
      console.error('Error fetching subscription:', error);
      // Only show error toast if it's not an auth error or network error
      if (error.message !== 'Unauthorized' && 
          error.message !== 'Failed to fetch subscription' &&
          !error.message.includes('fetch')) {
        toast.error('Failed to load subscription data');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Public method to manually refresh subscription
  const refreshSubscription = async () => {
    // First refresh auth to ensure we have the latest user data
    try {
      // Use the refreshAuth method from the auth context
      if (user) {
        await refreshAuth();
      }
      await fetchSubscriptionMemoized();
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };
  
  const isSubscribed = (() => {
    // Add debug logging to help diagnose issues
    console.log('Checking subscription status:', {
      hasSubscription: !!subscription,
      subscriptionId: subscription?.stripeSubscriptionId,
      periodEnd: subscription?.stripeCurrentPeriodEnd,
      status: subscription?.status
    });
    
    if (!subscription) return false;
    if (!subscription.stripeSubscriptionId) return false;
    
    // If we have a subscription ID from Stripe, consider it valid
    // This is a more reliable indicator than checking period end dates
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      return true;
    }
    
    // Fallback to checking period end date if status is not available
    if (subscription.stripeCurrentPeriodEnd) {
      try {
        // Handle different date formats safely
        const periodEnd = subscription.stripeCurrentPeriodEnd instanceof Date 
          ? subscription.stripeCurrentPeriodEnd 
          : new Date(subscription.stripeCurrentPeriodEnd);
        
        if (isNaN(periodEnd.getTime())) {
          console.error('Invalid date format for subscription period end:', subscription.stripeCurrentPeriodEnd);
          return false;
        }
        
        return periodEnd.getTime() > Date.now();
      } catch (e) {
        console.error('Error calculating subscription status:', e);
        return false;
      }
    }
    
    return false;
  })();
  
  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        isSubscribed,
        refreshSubscription, // Add this line
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}