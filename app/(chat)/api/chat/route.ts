import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { createClient } from '@/lib/supabase/server';
import { myProvider } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  // Check if chat exists
  const { data: chat } = await supabase
    .from('chats')
    .select('*')
    .eq('id', id)
    .single();

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    // Create new chat
    await supabase
      .from('chats')
      .insert({
        id,
        user_id: session.user.id,
        title,
        visibility: 'private'
      });
  }

  // Save the user message
  await supabase
    .from('messages')
    .insert({
      id: userMessage.id,
      chat_id: id,
      content: userMessage.content,
      role: userMessage.role,
      created_at: new Date().toISOString()
    });

  return createDataStreamResponse({
    execute: (dataStream) => {
      // função da library 'ai'
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ selectedChatModel }),
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === 'chat-model-reasoning'
            ? []
            : [
                'getWeather',
                'createDocument',
                'updateDocument',
                'requestSuggestions',
              ],
        experimental_transform: smoothStream({ chunking: 'word' }),
        experimental_generateMessageId: generateUUID,
        tools: {
          getWeather,
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
        },
        onFinish: async ({ response, reasoning }) => {
          if (session.user?.id) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });

              // Save the assistant messages
              for (const message of sanitizedResponseMessages) {
                await supabase
                  .from('messages')
                  .insert({
                    id: message.id,
                    chat_id: id,
                    role: message.role,
                    content: message.content,
                    created_at: new Date().toISOString()
                  });
              }
            } catch (error) {
              console.error('Failed to save chat');
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'stream-text',
        },
      });

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError: () => {
      return 'Oops, an error occured!';
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Check if chat exists and belongs to the user
    const { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!chat) {
      return new Response('Not Found', { status: 404 });
    }

    // Delete the chat
    await supabase
      .from('chats')
      .delete()
      .eq('id', id);
      
    // Delete all messages associated with the chat
    await supabase
      .from('messages')
      .delete()
      .eq('chat_id', id);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Failed to delete chat', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
