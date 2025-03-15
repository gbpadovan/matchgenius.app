import { cookies } from 'next/headers';
import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DatingAppHeader } from '@/components/dating-app-header';

export default async function Page() {
  const id = generateUUID();
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  const selectedModel = modelIdFromCookie?.value || DEFAULT_CHAT_MODEL;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedChatModel={selectedModel}
          selectedVisibilityType="private"
          isReadonly={false}
        />
      </div>
      <DataStreamHandler id={id} />
    </div>
  );
}