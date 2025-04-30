import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  // Get chats for the user
  const { data: chats } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false });
    
  return Response.json(chats);
}
