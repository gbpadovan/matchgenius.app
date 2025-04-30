'use server';

import { generateText, Message } from 'ai';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/models';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const supabase = await createClient();
  
  // Get the message
  const { data: message } = await supabase
    .from('messages')
    .select('*')
    .eq('id', id)
    .single();

  if (message) {
    // Delete messages created after this message in the same chat
    await supabase
      .from('messages')
      .delete()
      .eq('chat_id', message.chat_id)
      .gte('created_at', message.created_at);
  }
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  const supabase = await createClient();
  
  await supabase
    .from('chats')
    .update({ visibility })
    .eq('id', chatId);
}
