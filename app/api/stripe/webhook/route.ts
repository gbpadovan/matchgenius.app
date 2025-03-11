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

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();
  const signature = headersList.get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  
  let event: Stripe.Event;
  
  try {
    if (!signature || !webhookSecret) {
      return new NextResponse('Webhook signature or secret missing', { status: 400 });
    }
    
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }
  
  // Handle the event
  try {
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
          
          // Update our database with the subscription details
          await createOrUpdateSubscription({
            userId,
            stripeCustomerId: checkoutSession.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: subscription.status,
          });
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Make sure this is a subscription invoice
        if (invoice.subscription && invoice.customer) {
          // Get the subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          
          // Get our subscription record from the database
          const dbSubscription = await getSubscriptionByStripeSubscriptionId(
            subscription.id
          );
          
          if (dbSubscription) {
            // Update our database with the new subscription period
            await createOrUpdateSubscription({
              userId: dbSubscription.userId,
              stripeCustomerId: invoice.customer as string,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              status: subscription.status,
            });
          }
        }
        break;
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get our subscription record from the database
        const dbSubscription = await getSubscriptionByStripeSubscriptionId(
          subscription.id
        );
        
        if (dbSubscription) {
          // Update our database with the new subscription status
          await createOrUpdateSubscription({
            userId: dbSubscription.userId,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: subscription.status,
          });
        }
        break;
      }
      
      default:
        // Unhandled event type
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return new NextResponse('Webhook received', { status: 200 });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }
}

// For Stripe webhooks, the response needs to be returned immediately
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Set max duration to 60 seconds