'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

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
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState(initialSubscription);
  const [isLoading, setIsLoading] = useState(!initialSubscription);
  
  useEffect(() => {
    if (!initialSubscription && status === 'authenticated' && session?.user) {
      fetchSubscription();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [initialSubscription, status, session]);
  
  // Add event listener for subscription refresh
  useEffect(() => {
    const handleRefreshSubscription = () => {
      if (status === 'authenticated' && session?.user?.id) {
        fetchSubscription();
      }
    };
    
    window.addEventListener('refresh-subscription', handleRefreshSubscription);
    return () => {
      window.removeEventListener('refresh-subscription', handleRefreshSubscription);
    };
  }, [status, session?.user?.id]);
  
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
    if (!subscription) return false;
    if (!subscription.stripeSubscriptionId) return false;
    if (!subscription.stripeCurrentPeriodEnd) return false;
    
    try {
      // Handle different date formats safely
      const periodEnd = subscription.stripeCurrentPeriodEnd instanceof Date 
        ? subscription.stripeCurrentPeriodEnd 
        : new Date(subscription.stripeCurrentPeriodEnd);
      
      if (isNaN(periodEnd.getTime())) {
        console.error('Invalid date format for subscription period end:', subscription.stripeCurrentPeriodEnd);
        return false;
      }
      
      const isPeriodValid = periodEnd.getTime() > Date.now();
      const hasValidStatus = subscription.status === 'active' || subscription.status === 'trialing';
      
      return isPeriodValid && hasValidStatus;
    } catch (e) {
      console.error('Error calculating subscription status:', e);
      return false;
    }
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