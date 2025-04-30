import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || !session.user.id || !session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch user data by email from Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email);
    
    if (error) {
      throw error;
    }
    
    // If user doesn't exist in the users table, create a record
    if (!users || users.length === 0) {
      // Create a new user record
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          { 
            id: session.user.id,
            email: session.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (insertError) {
        console.error('Error creating user record:', insertError);
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        );
      }
      
      // Return the newly created user
      return NextResponse.json({
        id: newUser[0].id,
        email: newUser[0].email,
        createdAt: newUser[0].created_at
      });
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