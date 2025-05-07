'use client';

import { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
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
  refreshSubscription: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  isLoading: true,
  isSubscribed: false,
  refreshSubscription: async () => {},
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({
  children,
  initialSubscription = null,
}: {
  children: React.ReactNode;
  initialSubscription?: any;
}) {
  const { user } = useSupabaseAuth();
  const [subscription, setSubscription] = useState(initialSubscription);
  const [isLoading, setIsLoading] = useState(false);
  
  // References to track fetch state
  const lastFetchTimeRef = useRef<number>(initialSubscription ? Date.now() : 0);
  const FETCH_COOLDOWN = 60000; // 60 seconds cooldown between fetches
  const isFetchingRef = useRef<boolean>(false);
  
  // Set initial data if provided
  useEffect(() => {
    if (initialSubscription) {
      setSubscription(initialSubscription);
    }
  }, [initialSubscription]);
  
  // Fetch subscription data from API
  const fetchSubscription = async (force = false) => {
    // Skip if already fetching
    if (isFetchingRef.current) {
      return;
    }
    
    // Skip if fetched recently, unless forced
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < FETCH_COOLDOWN) {
      return;
    }
    
    // Skip if no user
    if (!user?.id) {
      setSubscription(null);
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      lastFetchTimeRef.current = now;
      
      // Use controlled fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/subscription', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Subscription API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Normalize data and handle dates
      if (data) {
        const normalizedData = {
          ...data,
          stripeCurrentPeriodEnd: data.stripeCurrentPeriodEnd 
            ? new Date(data.stripeCurrentPeriodEnd) 
            : null
        };
        
        setSubscription(normalizedData);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // Only show errors for non-network failures
      if (!(error instanceof DOMException) && error.name !== 'AbortError') {
        toast.error('Could not load subscription data');
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };
  
  // Fetch when user changes
  useEffect(() => {
    if (user?.id) {
      fetchSubscription();
    } else {
      setSubscription(null);
    }
  }, [user?.id]);
  
  // Exposed method to manually refresh
  const refreshSubscription = async () => {
    return fetchSubscription(true);
  };
  
  // Determine if user is subscribed - memoized to avoid recalculations
  const isSubscribed = useMemo(() => {
    // Log one line with minimal info to avoid console spam
    console.log(`Subscription: ${subscription?.status || 'none'}, ID: ${subscription?.stripeSubscriptionId || 'none'}`);
    
    if (!subscription?.stripeSubscriptionId) return false;
    
    // Active subscription based on status
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      return true;
    }
    
    // Check period end date as fallback
    if (subscription.stripeCurrentPeriodEnd) {
      try {
        const periodEnd = subscription.stripeCurrentPeriodEnd instanceof Date 
          ? subscription.stripeCurrentPeriodEnd 
          : new Date(subscription.stripeCurrentPeriodEnd);
        
        if (isNaN(periodEnd.getTime())) return false;
        return periodEnd.getTime() > Date.now();
      } catch (e) {
        return false;
      }
    }
    
    return false;
  }, [subscription?.stripeSubscriptionId, subscription?.status, subscription?.stripeCurrentPeriodEnd]);
  
  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        isSubscribed,
        refreshSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}