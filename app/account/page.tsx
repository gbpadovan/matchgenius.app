'use client';

import { SubscriptionUpdater } from './subscription-updater';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ManageSubscriptionButton } from './manage-subscription-button';
import { DatingAppHeader } from '@/components/dating-app-header';
import { ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Removed duplicate destructuring to avoid redeclaration
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const session = useSession();

  // Destructure the refreshSubscription method from useSubscription
  const { 
    subscription, 
    isSubscribed, 
    isLoading: subscriptionLoading, 
    refreshSubscription 
  } = useSubscription();
  
  // Add debugging logs
  useEffect(() => {
    console.log("Account page - Subscription data:", {
      subscription,
      isSubscribed,
      subscriptionLoading,
      userId: session?.user?.id
    });
  }, [subscription, isSubscribed, subscriptionLoading, session?.user?.id]);
  
  // function to handle manual subscription refresh
  const handleRefreshSubscription = async () => {
    try {
      setRefreshing(true);
      await refreshSubscription();
      toast.success('Subscription data refreshed');
    } catch (error) {
      toast.error('Failed to refresh subscription data');
    } finally {
      setRefreshing(false);
    }
  };
  
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
        const response = await fetch('/api/user');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch user data');
        }
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data. Please try again later.');
      }
    };
    
    fetchUser();
  }, []);
  
  if (subscriptionLoading) {
    return (
      <>
        <DatingAppHeader />
        <div className="container max-w-4xl py-10">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <DatingAppHeader />
      <SubscriptionUpdater />
      <div className="container max-w-4xl py-10">
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>          
        </div>
        
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

          <CardHeader className="flex flex-row items-center justify-between pr-6">
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRefreshSubscription}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
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

        <div className="flex justify-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>                   
        </div>
      </div>
    </>
  );
}