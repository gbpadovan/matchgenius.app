// Script to check subscription in Supabase database
import { createClient } from '../lib/supabase/server.js';

async function checkSubscription() {
  try {
    console.log('Checking subscription in Supabase database...');
    const supabase = await createClient();
    
    // Check for user with ID 00705e1f-8404-4243-82cf-6700791dbf36
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', '00705e1f-8404-4243-82cf-6700791dbf36')
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return;
    }
    
    console.log('User data:', userData);
    
    // Check for subscription for this user
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', '00705e1f-8404-4243-82cf-6700791dbf36')
      .maybeSingle();
    
    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return;
    }
    
    console.log('Subscription data:', subscriptionData);
    
    // Check for subscription with Stripe subscription ID
    const { data: stripeSubData, error: stripeSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', 'sub_1RJgouDzOSai7kJlWAUGusYl')
      .maybeSingle();
    
    if (stripeSubError) {
      console.error('Error fetching subscription by Stripe ID:', stripeSubError);
      return;
    }
    
    console.log('Subscription data by Stripe ID:', stripeSubData);
  } catch (error) {
    console.error('Error checking subscription:', error);
  }
}

checkSubscription();
