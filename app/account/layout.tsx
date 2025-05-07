import { authenticateUser } from '@/lib/supabase/auth-helpers';
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
  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  let subscriptionData = null;
  
  if (authenticated && user?.id) {
    try {
      // Fetch subscription data from Supabase
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id); // Use user.id instead of session.user.id
      
      // It's okay if no subscription is found - this just means the user is on the free plan
      if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
        console.error('Server: Error prefetching subscription data:', error);
      } else {
        // If data exists and has items, use the first one
        if (data && data.length > 0) {
          subscriptionData = data[0];
          console.log('Server: Prefetched subscription data for user:', user.id);
        } else {
          console.log('Server: No subscription found for user (free plan):', user.id);
        }
      }
    } catch (e) {
      console.error('Server: Exception fetching subscription data:', e);
    }
  }
  
  // Clone the children and pass the subscription data as props
  return (
    <div className="container max-w-6xl py-8">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as ReactElement<AccountPageProps>, {
            initialSubscription: subscriptionData,
          });
        }
        return child;
      })}
    </div>
  );
}
