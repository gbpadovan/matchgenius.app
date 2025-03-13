import { auth } from '@/app/(auth)/auth';
import { getUser } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || !session.user.id || !session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch user data by email from the session
    const users = await getUser(session.user.email);
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return the user data (excluding sensitive information like password)
    const userData = {
      id: users[0].id,
      email: users[0].email
    };
    
    return NextResponse.json(userData);
  } catch (error: any) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Error fetching user data' },
      { status: 500 }
    );
  }
} 