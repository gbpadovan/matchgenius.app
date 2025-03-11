'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAmountForDisplay } from '@/lib/stripe-utils';
import { toast } from 'sonner';
import { getStripe } from '@/lib/stripe-client';
import { DatingAppHeader } from '@/components/dating-app-header';

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: string;
  } | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  default_price: Price;
  metadata: {
    features?: string;
    duration?: string;
    popular?: string;
  };
}

export default function PricingPage() {
  const router = useRouter();
  const { isSubscribed, subscription, isLoading: subscriptionLoading } = useSubscription();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/stripe/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        const productsWithPrices = data
          .filter((product: Product) => product.default_price)
          .sort((a: Product, b: Product) => {
            // Sort by duration (1 week, 1 month, 3 months)
            const durationOrder = {
              'week': 1,
              'month': 2,
              '3-months': 3
            };
            return durationOrder[a.metadata.duration as keyof typeof durationOrder] - 
                   durationOrder[b.metadata.duration as keyof typeof durationOrder];
          });
        setProducts(productsWithPrices);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load pricing information');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    try {
      setIsSubmitting(priceId);

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

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const { url } = await response.json();

      window.location.href = url;
    } catch (error: any) {
      console.error('Error managing subscription:', error);
      toast.error(error.message || 'Failed to open customer portal');
    } finally {
      setIsSubmitting(null);
    }
  };

  if (isLoadingProducts || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DatingAppHeader />
        <div className="container max-w-6xl py-10">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // Find current subscription's product
  const currentProduct = isSubscribed && subscription?.stripePriceId
    ? products.find(p => p.default_price.id === subscription.stripePriceId)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <DatingAppHeader />
      <div className="container max-w-6xl py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Pricing Plans</h1>
          <p className="text-muted-foreground mt-2">
            Choose the plan that works best for you
          </p>

          {isSubscribed && !subscriptionLoading && (
            <div className="mt-4 p-4 bg-muted rounded-lg inline-block">
              <p className="font-medium">
                You are currently on the {currentProduct?.name || 'Pro'} plan.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {products.map((product) => {
            const price = product.default_price;
            if (!price) return null;
            
            const features = product.metadata.features
              ? JSON.parse(product.metadata.features)
              : ['5 messages per day'];

            return (
              <Card
                key={product.id}
                className={`flex flex-col ${product.metadata.popular === "true" ? 'border-primary shadow-lg' : ''}`}
              >
                {product.metadata.popular === "true" && (
                  <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {!price.unit_amount || price.unit_amount === 0
                        ? 'Free'
                        : formatAmountForDisplay(price.unit_amount, price.currency)}
                    </span>
                    {price.recurring && (
                      <span className="text-muted-foreground ml-1">
                        /{price.recurring.interval}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2">
                    {features.map((feature: string) => (
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
                    variant={product.metadata.popular === "true" ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(price.id)}
                    disabled={
                      isSubmitting !== null ||
                      (isSubscribed && subscription?.stripePriceId === price.id)
                    }
                  >
                    {isSubmitting === price.id
                      ? 'Loading...'
                      : isSubscribed && subscription?.stripePriceId === price.id
                      ? 'Current Plan'
                      : price.unit_amount === 0
                      ? 'Get Started'
                      : 'Subscribe'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="mx-auto"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}