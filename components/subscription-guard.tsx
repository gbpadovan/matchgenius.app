'use client';

import { useEffect, useState } from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

// Define pages that require subscription
const SUBSCRIPTION_REQUIRED_PATHS = [
  // Add routes that should be subscription-only
  // Examples: '/advanced-messages', '/history', etc.
];

// Max free messages per day
const MAX_FREE_MESSAGES = 5;

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { isSubscribed, isLoading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [messagesToday, setMessagesToday] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  
  // Check if the current path requires subscription
  const requiresSubscription = SUBSCRIPTION_REQUIRED_PATHS.some(path => 
    pathname.startsWith(path)
  );
  
  useEffect(() => {
    if (isLoading) return;
    
    // If page requires subscription and user is not subscribed, redirect to pricing
    if (requiresSubscription && !isSubscribed) {
      toast.error('This feature requires a subscription');
      router.push('/pricing');
    }
    
    // For the free chat page, check message count limit
    if (pathname === '/' && !isSubscribed) {
      // Get today's message count from localStorage
      const today = new Date().toISOString().split('T')[0];
      const storedCount = localStorage.getItem(`messages_${today}`);
      const count = storedCount ? parseInt(storedCount, 10) : 0;
      setMessagesToday(count);
      
      // If over limit, show dialog
      if (count >= MAX_FREE_MESSAGES) {
        setShowUpgradeDialog(true);
      }
    }
  }, [pathname, isSubscribed, isLoading, requiresSubscription, router]);
  
  // Function to increment message count when sending a message
  const incrementMessageCount = () => {
    if (!isSubscribed) {
      const today = new Date().toISOString().split('T')[0];
      const count = messagesToday + 1;
      localStorage.setItem(`messages_${today}`, count.toString());
      setMessagesToday(count);
      
      if (count >= MAX_FREE_MESSAGES) {
        setShowUpgradeDialog(true);
      }
    }
  };
  
  // Add this to the global window object so it can be called from anywhere
  useEffect(() => {
    // @ts-ignore
    window.incrementMessageCount = incrementMessageCount;
    
    return () => {
      // @ts-ignore
      delete window.incrementMessageCount;
    };
  }, [messagesToday]);
  
  return (
    <>
      {children}
      
      {/* Upgrade dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Message Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              You've reached your free message limit for today. Upgrade to 
              continue sending unlimited messages and access all features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Later</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={() => router.push('/pricing')}>
                View Plans
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}