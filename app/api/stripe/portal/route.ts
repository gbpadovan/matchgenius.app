import { auth } from '@/app/(auth)/auth';
import { getSubscriptionByUserId } from '@/lib/db/queries';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Get user from session
    const session = await auth();
    
    if (!session?.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to access the customer portal' },
        { status: 401 }
      );
    }
    
    // Get the user's subscription from our database
    const subscription = await getSubscriptionByUserId(session.user.id);
    
    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      );
    }
    
    // Create a Stripe customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${req.headers.get('origin')}/account`,
    });
    
    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Error creating portal session' },
      { status: 500 }
    );
  }
}