import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createOrUpdateSubscription, getSubscriptionByUserId } from '@/lib/db/queries';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    // Get user from session
    const session = await auth();
    
    if (!session?.user || !session.user.id || !session.user.email) {
      return NextResponse.json(
        { error: 'You must be logged in to update subscription' },
        { status: 401 }
      );
    }
    
    // Get the request body
    const { stripeCustomerId } = await req.json();
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Missing stripeCustomerId' },
        { status: 400 }
      );
    }
    
    // Get the latest subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
      status: 'active',
    });
    
    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found for this customer' },
        { status: 404 }
      );
    }
    
    const subscription = subscriptions.data[0];
    
    // Update our database with the subscription details
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
    
    return NextResponse.json(updatedSubscription);
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error updating subscription' },
      { status: 500 }
    );
  }
}