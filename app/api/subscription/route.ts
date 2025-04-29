import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Subscription API: Request received');
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('Subscription API: Session data:', {
      authenticated: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email
    });
    
    if (!session?.user || !session.user.id) {
      console.log('Subscription API: Unauthorized - No valid session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const startTime = Date.now();
    console.log(`Subscription API: Fetching subscription for user ${session.user.id} at ${new Date().toISOString()}`);
    
    // Get subscription from Supabase
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
      console.error('Error fetching subscription:', error);
      throw error;
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`Subscription API: Retrieved subscription data in ${duration}ms:`, subscription);
    
    return NextResponse.json(subscription || null);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Error fetching subscription' },
      { status: 500 }
    );
  }
}