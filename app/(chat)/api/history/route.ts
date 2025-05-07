import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  // Use getUser instead of getSession for security
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  // Get chats for the user
  const { data: chats } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('updated_at', { ascending: false });
    
  return Response.json(chats);
}
