import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { authenticateUser, createUnauthorizedResponse } from '@/lib/supabase/auth-helpers';
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

  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  
  if (!authenticated || !user) {
    console.error('Authentication error:', error);
    return createUnauthorizedResponse();
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

  // Create chat if it doesn't exist
  if (!chat) {
    const title = generateTitleFromUserMessage(userMessage.content);
    await supabase.from('chats').insert({
      id,
      title,
      user_id: user.id, // Use user.id instead of session.user.id
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    // Update chat timestamp
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  // Save messages to database
  await supabase.from('messages').insert(
    messages.map((msg) => ({
      id: msg.id || generateUUID(),
      chat_id: id,
      role: msg.role,
      content: msg.content,
      created_at: new Date().toISOString(),
    }))
  );

  // Get AI provider
  const provider = myProvider(selectedChatModel);

  // Create tools
  const tools = [
    {
      type: 'function',
      function: {
        name: 'create_document',
        description: 'Create a new document',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the document',
            },
            content: {
              type: 'string',
              description: 'The content of the document',
            },
            kind: {
              type: 'string',
              enum: ['markdown', 'text', 'code'],
              description: 'The kind of document',
            },
          },
          required: ['title', 'content', 'kind'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_document',
        description: 'Update an existing document',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the document to update',
            },
            content: {
              type: 'string',
              description: 'The new content of the document',
            },
          },
          required: ['id', 'content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'request_suggestions',
        description: 'Request suggestions for a user message',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The user message to get suggestions for',
            },
          },
          required: ['message'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The location to get weather for',
            },
          },
          required: ['location'],
        },
      },
    },
  ];

  return createDataStreamResponse(
    async (stream) => {
      const sanitizedMessages = sanitizeResponseMessages(messages);

      const response = await provider.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          ...sanitizedMessages,
        ],
        tools,
        tool_choice: 'auto',
        stream: true,
      });

      await smoothStream({
        stream: response,
        onTextContent: async (content, isFinal) => {
          await streamText(stream, content);
        },
        onFunctionCall: async ({ name, arguments: args }) => {
          let result = '';

          if (name === 'create_document') {
            result = await createDocument({
              title: args.title,
              content: args.content,
              kind: args.kind,
              userId: user.id, // Use user.id instead of session.user.id
            });
          } else if (name === 'update_document') {
            result = await updateDocument({
              id: args.id,
              content: args.content,
            });
          } else if (name === 'request_suggestions') {
            result = await requestSuggestions({
              message: args.message,
            });
          } else if (name === 'get_weather') {
            result = await getWeather({
              location: args.location,
            });
          }

          await streamText(stream, result);
        },
      });
    },
    { headers: { 'Content-Type': 'text/plain' } }
  );
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Use the secure authentication helper
  const { authenticated, user, supabase, error } = await authenticateUser();
  
  if (!authenticated || !user) {
    console.error('Authentication error:', error);
    return createUnauthorizedResponse();
  }

  // Check if chat exists and belongs to user
  const { data: chat } = await supabase
    .from('chats')
    .select('*')
    .eq('id', id)
    .single();

  if (!chat) {
    return new Response('Chat not found', { status: 404 });
  }

  if (chat.user_id !== user.id) { // Use user.id instead of session.user.id
    return new Response('Unauthorized', { status: 401 });
  }

  // Delete chat and all associated messages
  await supabase.from('messages').delete().eq('chat_id', id);
  await supabase.from('chats').delete().eq('id', id);

  return new Response('Chat deleted', { status: 200 });
}
