import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId, debugChat } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  try {
    // Add debugging to help diagnose issues
    const debugData = await debugChat({ id });
    console.log('Debug data for chat:', debugData);

    const chat = await getChatById({ id });

    if (!chat) {
      console.error('Chat not found:', id);
      notFound();
    }

    // Use auth() which now uses getUser() internally for secure authentication
    const authData = await auth();

    if (chat.visibility === 'private') {
      if (!authData || !authData.user) {
        console.error('No authenticated user for private chat');
        notFound();
      }

      if (authData.user.id !== chat.userId) {
        console.error('User not authorized for chat');
        notFound();
      }
    }

    const messagesFromDb = await getMessagesByChatId({
      id,
    });

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');

    if (!chatModelFromCookie) {
      return (
        <>
          <Chat
            id={chat.id}
            initialMessages={convertToUIMessages(messagesFromDb)}
            selectedChatModel={DEFAULT_CHAT_MODEL}
            selectedVisibilityType={chat.visibility}
            isReadonly={authData?.user?.id !== chat.userId}
          />
          <DataStreamHandler id={id} />
        </>
      );
    }

    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={convertToUIMessages(messagesFromDb)}
          selectedChatModel={chatModelFromCookie.value}
          selectedVisibilityType={chat.visibility}
          isReadonly={authData?.user?.id !== chat.userId}
        />
        <DataStreamHandler id={id} />
      </>
    );
  } catch (error) {
    console.error('Error loading chat:', error);
    notFound();
  }
}