import { NextResponse } from 'next/server';
import { auth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createOrUpdateSubscription } from '@/lib/supabase/db';
import { stripe } from '@/lib/stripe';

// This endpoint allows manual syncing of subscription data from Stripe to the database
// It can be used to fix issues where webhook events were not properly processed
export async function POST(req: Request) {
  try {
    console.log('Sync Subscription API: Request received');
    
    // Get user from session
    const session = await auth();
    
    console.log('Sync Subscription API: Session data:', {
      authenticated: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email
    });
    
    if (!session?.user || !session.user.id || !session.user.email) {
      console.log('Sync Subscription API: Unauthorized - No valid session');
      return NextResponse.json(
        { error: 'You must be logged in to sync subscription' },
        { status: 401 }
      );
    }
    
    // Get the request body
    const { userId, stripeSubscriptionId } = await req.json();
    
    // Admin check - only allow admins to specify a different userId
    if (userId && userId !== session.user.id) {
      // Check if current user is an admin
      const supabase = await createClient();
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (!userData || userData.role !== 'admin') {
        return NextResponse.json(
          { error: 'You are not authorized to sync subscriptions for other users' },
          { status: 403 }
        );
      }
    }
    
    const targetUserId = userId || session.user.id;
    console.log(`Sync Subscription API: Syncing subscription for user ${targetUserId}`);
    
    // If subscription ID is provided, sync that specific subscription
    if (stripeSubscriptionId) {
      console.log(`Sync Subscription API: Fetching specific subscription ${stripeSubscriptionId}`);
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      
      if (!subscription) {
        return NextResponse.json(
          { error: 'Subscription not found in Stripe' },
          { status: 404 }
        );
      }
      
      const customerId = subscription.customer as string;
      
      // Get customer to verify user association
      const customer = await stripe.customers.retrieve(customerId) as any;
      
      // Update our database with the subscription details
      await createOrUpdateSubscription({
        userId: targetUserId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        status: subscription.status,
      });
      
      console.log(`Sync Subscription API: Synced specific subscription ${stripeSubscriptionId}`);
    } else {
      // Find customer ID for this user
      const supabase = await createClient();
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', targetUserId)
        .maybeSingle();
      
      if (!subscriptionData || !subscriptionData.stripe_customer_id) {
        console.log(`Sync Subscription API: No customer ID found for user ${targetUserId}`);
        return NextResponse.json(
          { error: 'No Stripe customer ID found for this user' },
          { status: 404 }
        );
      }
      
      const customerId = subscriptionData.stripe_customer_id;
      console.log(`Sync Subscription API: Found customer ID ${customerId}`);
      
      // Get all subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 10,
        expand: ['data.default_payment_method'],
      });
      
      console.log(`Sync Subscription API: Found ${subscriptions.data.length} subscriptions`);
      
      if (subscriptions.data.length === 0) {
        return NextResponse.json(
          { message: 'No subscriptions found for this customer' },
          { status: 200 }
        );
      }
      
      // Update each subscription in our database
      for (const subscription of subscriptions.data) {
        await createOrUpdateSubscription({
          userId: targetUserId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          status: subscription.status,
        });
        
        console.log(`Sync Subscription API: Synced subscription ${subscription.id}`);
      }
    }
    
    // Get the updated subscription from the database
    const supabase = await createClient();
    const { data: updatedSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .single();
    
    // Transform the subscription data
    if (updatedSubscription) {
      const transformedSubscription = {
        id: updatedSubscription.id,
        userId: updatedSubscription.user_id,
        stripeCustomerId: updatedSubscription.stripe_customer_id,
        stripeSubscriptionId: updatedSubscription.stripe_subscription_id,
        stripePriceId: updatedSubscription.stripe_price_id,
        stripeCurrentPeriodEnd: updatedSubscription.stripe_current_period_end,
        status: updatedSubscription.status,
        createdAt: updatedSubscription.created_at,
        updatedAt: updatedSubscription.updated_at
      };
      
      return NextResponse.json({
        message: 'Subscription synced successfully',
        subscription: transformedSubscription
      });
    }
    
    return NextResponse.json({
      message: 'Subscription sync process completed but no subscription data found'
    });
  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      { error: `Error syncing subscription: ${error.message}` },
      { status: 500 }
    );
  }
}

// Admin-only endpoint to sync a specific user's subscription by email
export async function GET(req: Request) {
  try {
    // Get the URL parameters
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const subscriptionId = url.searchParams.get('subscription_id');
    const apiKey = url.searchParams.get('api_key');
    
    // Check API key for admin access
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!email && !subscriptionId) {
      return NextResponse.json(
        { error: 'Either email or subscription_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // If email is provided, find the user
    if (email) {
      // Get user ID from email
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (!userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      const userId = userData.id;
      
      // Find customer ID for this user
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!subscriptionData || !subscriptionData.stripe_customer_id) {
        // Try to find customer in Stripe by email
        const customers = await stripe.customers.list({
          email,
          limit: 1,
        });
        
        if (customers.data.length === 0) {
          return NextResponse.json(
            { error: 'No Stripe customer found for this user' },
            { status: 404 }
          );
        }
        
        const customerId = customers.data[0].id;
        
        // Create initial subscription record
        await createOrUpdateSubscription({
          userId,
          stripeCustomerId: customerId,
        });
        
        // Get subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 10,
        });
        
        if (subscriptions.data.length === 0) {
          return NextResponse.json({
            message: 'Customer found but no subscriptions exist',
            userId,
            customerId
          });
        }
        
        // Update each subscription in our database
        for (const subscription of subscriptions.data) {
          await createOrUpdateSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: subscription.status,
          });
        }
        
        return NextResponse.json({
          message: 'Subscriptions synced successfully',
          userId,
          customerId,
          subscriptionCount: subscriptions.data.length
        });
      } else {
        const customerId = subscriptionData.stripe_customer_id;
        
        // Get subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 10,
        });
        
        if (subscriptions.data.length === 0) {
          return NextResponse.json({
            message: 'Customer found but no subscriptions exist',
            userId,
            customerId
          });
        }
        
        // Update each subscription in our database
        for (const subscription of subscriptions.data) {
          await createOrUpdateSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: subscription.status,
          });
        }
        
        return NextResponse.json({
          message: 'Subscriptions synced successfully',
          userId,
          customerId,
          subscriptionCount: subscriptions.data.length
        });
      }
    }
    
    // If subscription ID is provided, sync that specific subscription
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      if (!subscription) {
        return NextResponse.json(
          { error: 'Subscription not found in Stripe' },
          { status: 404 }
        );
      }
      
      const customerId = subscription.customer as string;
      
      // Get customer to find user association
      const customer = await stripe.customers.retrieve(customerId) as any;
      const customerEmail = customer.email;
      
      // Find user by email
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', customerEmail)
        .single();
      
      if (!userData) {
        return NextResponse.json(
          { error: 'No user found with the email associated with this subscription' },
          { status: 404 }
        );
      }
      
      const userId = userData.id;
      
      // Update our database with the subscription details
      await createOrUpdateSubscription({
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        status: subscription.status,
      });
      
      return NextResponse.json({
        message: 'Subscription synced successfully',
        userId,
        customerId,
        subscriptionId
      });
    }
    
    return NextResponse.json({
      error: 'Invalid request'
    }, { status: 400 });
  } catch (error: any) {
    console.error('Error in admin sync subscription:', error);
    return NextResponse.json(
      { error: `Error syncing subscription: ${error.message}` },
      { status: 500 }
    );
  }
}
