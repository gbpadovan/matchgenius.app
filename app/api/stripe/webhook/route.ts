import { headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { stripe } from '@/lib/stripe';
import { 
  createOrUpdateSubscription,
  getSubscriptionByStripeSubscriptionId,
  updateSubscriptionStatus
} from '@/lib/supabase/db';

// Disable body parsing, we need the raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure route to handle HTTP requests properly and prevent redirects
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Add this to ensure the webhook handler doesn't require authentication
export const GET = async () => {
  return new Response('Stripe webhook endpoint is working', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export async function POST(req: Request) {
  console.log('Webhook request received - Method:', req.method);
  
  const body = await req.text();
  const headersList = await nextHeaders();
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
  
  // Define relevant events to handle
  const relevantEvents = new Set([
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
    'invoice.payment_succeeded',
    'invoice.payment_failed'
  ]);

  // Handle the event
  try {
    console.log(`Processing webhook event: ${event.type}`, {
      eventId: event.id,
      eventType: event.type,
      objectType: event.data.object.object,
      timestamp: new Date().toISOString()
    });
    
    if (!relevantEvents.has(event.type)) {
      console.log(`Skipping irrelevant event: ${event.type}`);
      return new NextResponse(`Webhook received but event type ${event.type} is not handled`, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Content-Type': 'application/json',
        }
      });
    }
    
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
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get the customer details to find the associated user
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const userId = customer.metadata?.userId;
        
        if (!userId) {
          // Try to find the user by querying our database with the customer ID
          const { data: subscriptionData } = await getSubscriptionByStripeSubscriptionId(subscription.id);
          
          if (!subscriptionData) {
            console.error('No user ID found for subscription update');
            return new NextResponse('No user ID found for subscription update', { status: 400 });
          }
          
          // Update our database with the subscription details
          await createOrUpdateSubscription({
            userId: subscriptionData.user_id,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: subscription.status,
          });
          
          console.log(`Webhook: Subscription updated for user ${subscriptionData.user_id}`);
        } else {
          // Update our database with the subscription details
          await createOrUpdateSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: subscription.status,
          });
          
          console.log(`Webhook: Subscription updated for user ${userId}`);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update the subscription status to canceled
        await updateSubscriptionStatus(subscription.id, 'canceled');
        console.log(`Webhook: Subscription ${subscription.id} marked as canceled`);
        break;
      }
      
      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update the subscription status to paused
        await updateSubscriptionStatus(subscription.id, 'paused');
        console.log(`Webhook: Subscription ${subscription.id} marked as paused`);
        break;
      }
      
      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update the subscription status to active
        await updateSubscriptionStatus(subscription.id, 'active');
        console.log(`Webhook: Subscription ${subscription.id} marked as active`);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only process subscription-related invoices
        if (invoice.subscription && invoice.customer) {
          // If this is a subscription renewal
          if (invoice.billing_reason === 'subscription_cycle') {
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription as string
            );
            
            // Update the subscription period end date
            await createOrUpdateSubscription({
              userId: '', // Will be filled in by the function using the subscription ID
              stripeCustomerId: invoice.customer as string,
              stripeSubscriptionId: invoice.subscription as string,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              status: 'active',
            });
            
            console.log(`Webhook: Subscription renewed for invoice ${invoice.id}`);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only process subscription-related invoices
        if (invoice.subscription) {
          // Update the subscription status to past_due or unpaid
          await updateSubscriptionStatus(invoice.subscription as string, 'past_due');
          console.log(`Webhook: Subscription ${invoice.subscription} marked as past_due due to payment failure`);
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return new NextResponse(`Webhook handler failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Content-Type': 'application/json',
      }
    });
  }
}

// Note: maxDuration is already set at the top of the file