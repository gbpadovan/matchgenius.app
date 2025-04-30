import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import React, { ReactElement } from 'react';

// Define the subscription data interface
interface SubscriptionData {
  id?: string;
  user_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  stripe_current_period_end?: string;
  created_at?: string;
  updated_at?: string;
}

// Define the props that will be passed to children
interface AccountPageProps {
  initialSubscription?: SubscriptionData | null;
}

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch the user's subscription data on the server
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  let subscriptionData = null;
  
  if (session?.user?.id) {
    try {
      // Fetch subscription data from Supabase
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id);
      
      // It's okay if no subscription is found - this just means the user is on the free plan
      if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
        console.error('Server: Error prefetching subscription data:', error);
      } else {
        // If data exists and has items, use the first one
        if (data && data.length > 0) {
          subscriptionData = data[0];
          console.log('Server: Prefetched subscription data for user:', session.user.id);
        } else {
          console.log('Server: No subscription found for user (free plan):', session.user.id);
        }
      }
    } catch (error) {
      console.error('Server: Error in subscription data fetch:', error);
    }
  }

  // Create a modified version of children with the subscription data
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as ReactElement<AccountPageProps>, { 
        initialSubscription: subscriptionData 
      });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
} 