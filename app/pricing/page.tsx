'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAmountForDisplay } from '@/lib/stripe';
import { toast } from 'sonner';
import { getStripe } from '@/lib/stripe-client';
import { DatingAppHeader } from '@/components/dating-app-header';

// Placeholder pricing data - in production, this would come from your database
const PRICING_PLANS = [
  {
    name: 'Free',
    description: 'Basic access with limited features',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '5 messages per day',
      'Basic chat functionality',
      'Standard response time',
    ],
    stripePriceId: '', // No price ID for free plan
    popular: false,
  },
  {
    name: 'Pro',
    description: 'Full access to all features',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited messages',
      'Advanced chat features',
      'Priority response time',
      'History and analytics',
      'Premium support',
    ],
    stripePriceId: 'price_1OXyZaHGu6UW2MVZjYRZmVnP', // Replace with your actual Stripe price ID
    popular: true,
  },
  {
    name: 'Team',
    description: 'For teams and businesses',
    price: 29.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Admin dashboard',
      'API access',
      'Dedicated support',
    ],
    stripePriceId: 'price_1OXyZbHGu6UW2MVZkLmP9XyZ', // Replace with your actual Stripe price ID
    popular: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { isSubscribed, subscription, isLoading } = useSubscription();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  
  const handleSubscribe = async (priceId: string) => {
    try {
      if (!priceId) {
        // Free plan - no subscription needed
        router.push('/');
        return;
      }
      
      setIsSubmitting(priceId);
      
      // Call our checkout API route
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      const { error } = await stripe!.redirectToCheckout({ sessionId });
      
      if (error) {
        toast.error(error.message || 'Something went wrong');
      }
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast.error(error.message || 'Failed to subscribe');
    } finally {
      setIsSubmitting(null);
    }
  };
  
  const handleManageSubscription = async () => {
    try {
      setIsSubmitting('manage');
      
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
      console.error('Error managing subscription:', error);
      toast.error(error.message || 'Failed to open customer portal');
    } finally {
      setIsSubmitting(null);
    }
  };
  
  // Show current subscription status if user is subscribed
  const currentPlan = isSubscribed ? PRICING_PLANS.find(
    plan => plan.stripePriceId === subscription?.stripePriceId
  ) : null;
  
  return (
    <div className="min-h-screen bg-background">
      <DatingAppHeader />
      <div className="container max-w-6xl py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Pricing Plans</h1>
          <p className="text-muted-foreground mt-2">
            Choose the plan that works best for you
          </p>
          
          {isSubscribed && !isLoading && (
            <div className="mt-4 p-4 bg-muted rounded-lg inline-block">
              <p className="font-medium">
                You are currently on the {currentPlan?.name || 'Pro'} plan.
                {subscription?.stripeCurrentPeriodEnd && (
                  <span className="ml-2">
                    Next billing date: {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={handleManageSubscription}
                disabled={isSubmitting === 'manage'}
              >
                {isSubmitting === 'manage' ? 'Loading...' : 'Manage Subscription'}
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <Card 
              key={plan.name} 
              className={`flex flex-col ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 
                      ? 'Free' 
                      : formatAmountForDisplay(plan.price * 100, plan.currency)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground ml-1">
                      /{plan.interval}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.stripePriceId)}
                  disabled={
                    isSubmitting !== null || 
                    (isSubscribed && subscription?.stripePriceId === plan.stripePriceId)
                  }
                >
                  {isSubmitting === plan.stripePriceId
                    ? 'Loading...'
                    : isSubscribed && subscription?.stripePriceId === plan.stripePriceId
                    ? 'Current Plan'
                    : plan.price === 0
                    ? 'Get Started'
                    : 'Subscribe'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}