import { auth } from '@/app/(auth)/auth';
import { getSubscriptionByUserId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const subscription = await getSubscriptionByUserId(session.user.id);
    
    return NextResponse.json(subscription || null);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Error fetching subscription' },
      { status: 500 }
    );
  }
}