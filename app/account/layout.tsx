import { auth } from '@/app/(auth)/auth';
import { getSubscriptionByUserId } from '@/lib/db/queries';
import { headers } from 'next/headers';
import React from 'react';

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch the user's subscription data on the server
  const session = await auth();
  let subscriptionData = null;
  
  if (session?.user?.id) {
    try {
      // Fetch subscription data
      subscriptionData = await getSubscriptionByUserId(session.user.id);
      console.log('Server: Prefetched subscription data for user:', session.user.id);
    } catch (error) {
      console.error('Server: Error prefetching subscription data:', error);
    }
  }

  // Create a modified version of children with the subscription data
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { initialSubscription: subscriptionData });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
} 