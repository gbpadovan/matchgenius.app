'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ManageSubscriptionButton() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    try {
      setIsLoading(true);
      
      // Call our portal API route
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(error.message || 'Failed to open customer portal');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleClick} 
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? 'Loading...' : 'Manage Subscription'}
    </Button>
  );
}