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
  
  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/subscription');
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized silently
          setSubscription(null);
          return;
        }
        throw new Error('Failed to fetch subscription');
      }
      
      const data = await response.json();
      setSubscription(data);
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