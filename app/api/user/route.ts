import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    // Use getUser instead of getSession for security
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user || !userData.user.id || !userData.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch user data by email from Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.user.email);
    
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
            id: userData.user.id,
            email: userData.user.email,
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
    const userResponse = {
      id: users[0].id,
      email: users[0].email
    };
    
    return NextResponse.json(userResponse);
  } catch (error: any) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Error fetching user data' },
      { status: 500 }
    );
  }
} 