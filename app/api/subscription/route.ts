import { auth } from '@/app/(auth)/auth';
import { getSubscriptionByUserId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Subscription API: Request received');
    const session = await auth();
    
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
    
    const subscription = await getSubscriptionByUserId(session.user.id);
    console.log('Subscription API: Retrieved subscription data:', subscription);
    
    return NextResponse.json(subscription || null);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Error fetching subscription' },
      { status: 500 }
    );
  }
}