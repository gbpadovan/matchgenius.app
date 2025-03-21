'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { useSession } from 'next-auth/react';

interface SubscriptionUpdaterProps {
  initialSubscription?: any;
}

export function SubscriptionUpdater({ initialSubscription }: SubscriptionUpdaterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, refreshSubscription } = useSubscription();
  const { status: sessionStatus } = useSession();
  const [hasAttemptedUpdate, setHasAttemptedUpdate] = useState(false);
  const success = searchParams.get('success');
  
  // Add debug logging
  useEffect(() => {
    console.log('SubscriptionUpdater: Component state:', { 
      success, 
      sessionStatus, 
      hasAttemptedUpdate,
      subscription,
      initialSubscription
    });
  }, [success, sessionStatus, hasAttemptedUpdate, subscription, initialSubscription]);
  
  // Check localStorage to prevent infinite updates
  useEffect(() => {
    if (success) {
      console.log('Success parameter detected:', success);
      const hasUpdated = localStorage.getItem('subscription_updated');
      if (hasUpdated === success) {
        // We've already handled this success parameter
        console.log('Already handled this success parameter:', success);
        setHasAttemptedUpdate(true);
      }
    }
  }, [success]);

  useEffect(() => {
    const updateSubscription = async () => {
      // Only run this when the session is authenticated and coming from a successful checkout
      if (sessionStatus !== 'authenticated') {
        console.log('Session not authenticated, skipping update');
        return;
      }

      // Only run this once when coming from a successful checkout
      if (success && subscription?.stripeCustomerId && !hasAttemptedUpdate) {
        console.log('Attempting to update subscription with customer ID:', subscription.stripeCustomerId);
        setHasAttemptedUpdate(true);
        
        try {
          console.log('Making API call to update subscription...');
          
          const response = await fetch('/api/stripe/update-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              stripeCustomerId: subscription.stripeCustomerId,
            }),
          });
          
          console.log('Update subscription API response status:', response.status);
          
          if (!response.ok) {
            throw new Error('Failed to update subscription');
          }
          
          const updatedSubscription = await response.json();
          console.log('Subscription updated successfully:', updatedSubscription);
          
          // Store that we've updated for this success parameter
          localStorage.setItem('subscription_updated', success);
          
          // Update the URL to remove the success parameter instead of reloading
          router.replace('/account');
          
          // Refresh the subscription data
          await refreshSubscription();
        } catch (error) {
          console.error('Error updating subscription:', error);
          toast.error('There was an issue activating your subscription. Please try refreshing the page.');
        }
      }
    };
    
    updateSubscription();
  }, [success, subscription, hasAttemptedUpdate, router, sessionStatus, refreshSubscription]);
  
  return null; // This is a utility component, it doesn't render anything
}