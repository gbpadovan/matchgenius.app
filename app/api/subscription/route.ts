import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Cache the subscription data for each user to reduce database queries
const subscriptionCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds cache lifetime

export async function GET() {
  try {
    console.log('Subscription API: Request received');
    
    // Check for cache-control headers in the request
    const headersList = headers();
    const noCache = headersList.get('cache-control')?.includes('no-cache') || false;
    
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || !session.user.id) {
      console.log('Subscription API: Unauthorized - No valid session');
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, must-revalidate, max-age=0'
          }
        }
      );
    }
    
    const userId = session.user.id;
    
    // Check if we have a cached response for this user
    const cachedData = subscriptionCache.get(userId);
    const now = Date.now();
    
    if (!noCache && cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      console.log(`Subscription API: Using cached data for user ${userId}, age: ${now - cachedData.timestamp}ms`);
      
      return new NextResponse(
        JSON.stringify(cachedData.data),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=60',
            'X-Cache': 'HIT'
          }
        }
      );
    }
    
    const startTime = Date.now();
    console.log(`Subscription API: Fetching subscription for user ${userId} at ${new Date().toISOString()}`);
    
    // Get subscription from Supabase
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
      console.error('Error fetching subscription:', error);
      throw error;
    }
    
    const duration = Date.now() - startTime;
    console.log(`Subscription API: Retrieved subscription data in ${duration}ms`);
    
    // Transform the subscription data from Supabase format to client format
    let result = null;
    
    if (subscription) {
      result = {
        id: subscription.id,
        userId: subscription.user_id,
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        stripePriceId: subscription.stripe_price_id,
        stripeCurrentPeriodEnd: subscription.stripe_current_period_end,
        status: subscription.status,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at
      };
    }
    
    // Update the cache
    subscriptionCache.set(userId, { data: result, timestamp: now });
    
    return new NextResponse(
      JSON.stringify(result),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60',
          'X-Cache': 'MISS'
        }
      }
    );
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error fetching subscription' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, must-revalidate, max-age=0'
        }
      }
    );
  }
}