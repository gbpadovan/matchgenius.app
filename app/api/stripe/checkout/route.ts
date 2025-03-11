import { auth } from '@/app/(auth)/auth';
import { createOrUpdateSubscription } from '@/lib/db/queries';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();
    
    // Get user from session
    const session = await auth();
    
    if (!session?.user || !session.user.id || !session.user.email) {
      return NextResponse.json(
        { error: 'You must be logged in to subscribe' },
        { status: 401 }
      );
    }
    
    // Create or retrieve the customer
    const customer = await createOrRetrieveCustomer({
      userId: session.user.id,
      email: session.user.email
    });
    
    // Create the checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Use the new checkout parameters in Stripe API
      ui_mode: 'hosted',
      metadata: {
        userId: session.user.id,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
        },
      },
      success_url: `${req.headers.get('origin')}/account?success=true`,
      cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
    });

    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}

// Helper function to create or retrieve a customer
async function createOrRetrieveCustomer({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  // Find existing customer by userId
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });
  
  const existingCustomer = existingCustomers.data[0];
  
  if (existingCustomer) {
    // Update the customer with latest metadata
    await stripe.customers.update(existingCustomer.id, {
      metadata: { userId },
    });
    return existingCustomer.id;
  }
  
  // Create a new customer
  const newCustomer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  
  // Create subscription record in our database (initially without subscription ID)
  await createOrUpdateSubscription({
    userId,
    stripeCustomerId: newCustomer.id,
  });
  
  return newCustomer.id;
}