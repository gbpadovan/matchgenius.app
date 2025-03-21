import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createOrUpdateSubscription, getSubscriptionByUserId } from '@/lib/db/queries';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    console.log('Update Subscription API: Request received');
    
    // Get user from session
    const session = await auth();
    
    console.log('Update Subscription API: Session data:', {
      authenticated: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email
    });
    
    if (!session?.user || !session.user.id || !session.user.email) {
      console.log('Update Subscription API: Unauthorized - No valid session');
      return NextResponse.json(
        { error: 'You must be logged in to update subscription' },
        { status: 401 }
      );
    }
    
    // Get the request body
    const { stripeCustomerId } = await req.json();
    
    console.log('Update Subscription API: Customer ID:', stripeCustomerId);
    
    if (!stripeCustomerId) {
      console.log('Update Subscription API: Missing customer ID');
      return NextResponse.json(
        { error: 'Missing stripeCustomerId' },
        { status: 400 }
      );
    }
    
    // Get the latest subscriptions for this customer
    console.log('Update Subscription API: Fetching subscriptions from Stripe');
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
      status: 'active',
    });
    
    console.log('Update Subscription API: Subscriptions from Stripe:', subscriptions.data.length);
    
    if (subscriptions.data.length === 0) {
      console.log('Update Subscription API: No active subscription found');
      return NextResponse.json(
        { error: 'No active subscription found for this customer' },
        { status: 404 }
      );
    }
    
    const subscription = subscriptions.data[0];
    console.log('Update Subscription API: Found active subscription:', subscription.id);
    
    // Update our database with the subscription details
    console.log('Update Subscription API: Updating subscription in database');
    await createOrUpdateSubscription({
      userId: session.user.id,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: subscription.status,
    });
    
    // Return the updated subscription
    const updatedSubscription = await getSubscriptionByUserId(session.user.id);
    console.log('Update Subscription API: Returning updated subscription');
    
    return NextResponse.json(updatedSubscription);
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error updating subscription' },
      { status: 500 }
    );
  }
}