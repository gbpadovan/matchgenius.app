'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ManageSubscriptionButton } from './manage-subscription-button';

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, isSubscribed, isLoading } = useSubscription();
  const [user, setUser] = useState<any>(null);
  
  // Check for success parameter from Stripe redirect
  useEffect(() => {
    if (searchParams.get('success')) {
      toast.success('Your subscription has been activated!');
    }
  }, [searchParams]);
  
  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // This would be your actual API endpoint to get user data
        const response = await fetch('/api/user');
        if (!response.ok) throw new Error('Failed to fetch user data');
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUser();
  }, []);
  
  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      
      <div className="grid gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email || 'Loading...'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  {user?.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString() 
                    : 'Loading...'}
                </p>
              </div>
              
              <div className="pt-2">
                <Button variant="outline" onClick={() => router.push('/account/edit')}>
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Manage your subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Current Plan</p>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed 
                    ? `${subscription?.stripePriceId ? 'Pro' : 'Unknown'} Plan` 
                    : 'Free Plan'}
                </p>
              </div>
              
              {isSubscribed && subscription?.stripeCurrentPeriodEnd && (
                <div>
                  <p className="text-sm font-medium">Next Billing Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              <div className="pt-2">
                {isSubscribed ? (
                  <ManageSubscriptionButton />
                ) : (
                  <Button onClick={() => router.push('/pricing')}>
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}