import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('chatId is required', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get votes for the chat
  const { data: votes } = await supabase
    .from('votes')
    .select('*')
    .eq('chat_id', chatId);

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { chatId, messageId, type } = await request.json();

  if (!chatId || !messageId || !type) {
    return new Response('chatId, messageId, and type are required', {
      status: 400,
    });
  }

  // Check if vote exists
  const { data: existingVotes } = await supabase
    .from('votes')
    .select('*')
    .eq('chat_id', chatId)
    .eq('message_id', messageId)
    .eq('user_id', session.user.id);
    
  if (existingVotes && existingVotes.length > 0) {
    // Update existing vote
    await supabase
      .from('votes')
      .update({ type })
      .eq('id', existingVotes[0].id);
  } else {
    // Create new vote
    await supabase
      .from('votes')
      .insert({
        chat_id: chatId,
        message_id: messageId,
        user_id: session.user.id,
        type
      });
  }

  return Response.json({ success: true }, { status: 200 });
}
