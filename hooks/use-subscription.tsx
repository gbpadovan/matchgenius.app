'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
}

export const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  isLoading: true,
  isSubscribed: false,
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
  const [subscription, setSubscription] = useState(initialSubscription);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Only fetch if we have an initial subscription (meaning we have a session)
    // This prevents fetching on unauthenticated pages
    if (initialSubscription === null) {
      return;
    }
    
    fetchSubscription();
  }, [initialSubscription]);
  
  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/subscription');
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized silently
          return;
        }
        throw new Error('Failed to fetch subscription');
      }
      
      const data = await response.json();
      setSubscription(data);
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      // Only show error toast if it's not an auth error
      if (error.message !== 'Unauthorized') {
        toast.error('Failed to load subscription data');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const isSubscribed =
    subscription?.stripeSubscriptionId &&
    subscription?.stripeCurrentPeriodEnd &&
    new Date(subscription.stripeCurrentPeriodEnd).getTime() > Date.now() &&
    (subscription?.status === 'active' || subscription?.status === 'trialing');
  
  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        isSubscribed,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}