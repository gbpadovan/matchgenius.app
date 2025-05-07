import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Strong caching for subscription data
const CACHE_CONTROL = 'private, max-age=300'; // 5 minutes

export async function GET(request: Request) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Get user directly with getUser to avoid warnings
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user?.id) {
      // Return null subscription data for unauthenticated users
      return NextResponse.json(null, { 
        status: 200, // Return 200 instead of 401 to avoid error loops
        headers: { 'Cache-Control': 'private, max-age=5' }
      });
    }
    
    // Get subscription data with maybeSingle to avoid errors
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    
    // Transform to client format or return null
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
    
    // Return with strong cache headers
    return NextResponse.json(result, {
      headers: { 'Cache-Control': CACHE_CONTROL }
    });
  } catch (error) {
    console.error('Subscription API error:', error);
    
    // Return null on error instead of error status
    return NextResponse.json(null, {
      status: 200, // Use 200 to prevent error loops
      headers: { 'Cache-Control': 'private, max-age=5' }
    });
  }
}