'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

export function SubscriptionProvider({
  children,
  initialSubscription = null,
}: {
  children: React.ReactNode;
  initialSubscription?: any;
}) {
  const router = useRouter();
  const { user, session, isLoading: authLoading } = useSupabaseAuth();
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
  
  useEffect(() => {
    if (!hasInitialFetch && !authLoading && user) {
      console.log('SubscriptionProvider: No initial data, fetching from API...');
      fetchSubscription().then(() => {
        setHasInitialFetch(true);
      });
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [hasInitialFetch, authLoading, user]);
  
  // Add event listener for subscription refresh
  useEffect(() => {
    const handleRefreshSubscription = () => {
      if (user?.id) {
        fetchSubscription();
      }
    };
    
    window.addEventListener('refresh-subscription', handleRefreshSubscription);
    return () => {
      window.removeEventListener('refresh-subscription', handleRefreshSubscription);
    };
  }, [user?.id]);
  
  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching subscription data...');
      const response = await fetch('/api/subscription');
      
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
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      // Only show error toast if it's not an auth error
      if (error.message !== 'Unauthorized' && error.message !== 'Failed to fetch subscription') {
        toast.error('Failed to load subscription data');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Public method to manually refresh subscription
  const refreshSubscription = async () => {
    await fetchSubscription();
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