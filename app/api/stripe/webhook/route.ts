import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { stripe } from '@/lib/stripe';
import { 
  createOrUpdateSubscription, 
  getSubscriptionByStripeSubscriptionId 
} from '@/lib/db/queries';

// Disable body parsing, we need the raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure route to handle HTTP requests properly and prevent redirects
export const dynamic = 'force-dynamic';
// Removed duplicate declaration of maxDuration
export const preferredRegion = 'auto';
export const runtime = 'nodejs';

// This is important to prevent redirects
export const revalidate = 0;

export async function POST(req: Request) {
  console.log('Webhook request received - Method:', req.method);
  
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('Stripe-Signature') as string;  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  
  let event: Stripe.Event;
  
  try {
    if (!signature || !webhookSecret) {
      console.error('Webhook signature or secret missing', { signature: !!signature, webhookSecret: !!webhookSecret });
      return new NextResponse('Webhook signature or secret missing', { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Content-Type': 'application/json',
        }
      });
    }
    
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('Webhook signature verified successfully', { type: event.type });
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`, {
      error,
      signature: signature?.substring(0, 10), // Log part of signature for debugging
    });
    return new NextResponse(`Webhook Error: ${error.message}`, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Content-Type': 'application/json',
      }
    });
  }
  
  // Handle the event
  try {
    console.log(`Processing webhook event: ${event.type}`);
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        
        // Make sure this is a subscription checkout
        if (checkoutSession.mode === 'subscription' && 
            checkoutSession.subscription && 
            checkoutSession.customer) {
          
          // Get the subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription as string
          );
          
          // Get the user ID from the metadata
          const userId = checkoutSession.metadata?.userId;
          
          if (!userId) {
            console.error('No user ID found in checkout session metadata');
            return new NextResponse('No user ID found in metadata', { status: 400 });
          }
          
          console.log(`Webhook: Updating subscription for user ${userId}`);
          
          // Update our database with the subscription details
          await createOrUpdateSubscription({
            userId,
            stripeCustomerId: checkoutSession.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: subscription.status,
          });
          
          console.log(`Webhook: Subscription updated for user ${userId}`);
        }
        break;
      }
      
      // [Rest of the webhook handler stays the same]
    }
    
    return new NextResponse('Webhook received', { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return new NextResponse('Webhook handler failed', { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Content-Type': 'application/json',
      }
    });
  }
}

// For Stripe webhooks, the response needs to be returned immediately
export const maxDuration = 60; // Set max duration to 60 seconds