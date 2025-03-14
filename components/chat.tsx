'use client';

import type { Attachment, Message, ChatRequestOptions } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';

import { Block } from './block';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { VisibilityType } from './visibility-selector';
import { useBlockSelector } from '@/hooks/use-block';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const { isSubscribed } = useSubscription();
  
  // Get message count for today
  const today = new Date().toISOString().split('T')[0];
  const [messageCount, setMessageCount] = useState<number>(0);

  useEffect(() => {
    // Only access localStorage after component mounts
    const storedCount = localStorage.getItem(`messages_${today}`);
    if (storedCount) {
      setMessageCount(parseInt(storedCount, 10));
    }
  }, [today]);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: (error) => {
      toast.error('An error occured, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isBlockVisible = useBlockSelector((state) => state.isVisible);

  // Custom submit handler to check subscription status
  const handleMessageSubmit = (e: React.FormEvent<HTMLFormElement> | undefined, chatRequestOptions?: ChatRequestOptions) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    
    // Check if user can send more messages when not subscribed
    if (!isSubscribed) {
      // Increment message count
      const newCount = messageCount + 1;
      localStorage.setItem(`messages_${today}`, newCount.toString());
      setMessageCount(newCount);
      
      // Notify the subscription guard through the global function
      // @ts-ignore
      if (window.incrementMessageCount) {
        // @ts-ignore
        window.incrementMessageCount();
      }
    }
    
    // Continue with normal submit
    handleSubmit(e as React.FormEvent<HTMLFormElement>, chatRequestOptions);
  };

  // Wrapper function to adapt handleMessageSubmit to the expected type
  const handleMessageSubmitWrapper = (event?: { preventDefault?: () => void }, chatRequestOptions?: ChatRequestOptions) => {
    handleMessageSubmit(event as React.FormEvent<HTMLFormElement> | undefined, chatRequestOptions);
  };

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isBlockVisible={isBlockVisible}
        />

        <form 
          className="flex mx-auto px-4 bg-background pb-8 md:pb-10 mb-safe gap-2 w-full md:max-w-3xl"
          onSubmit={handleMessageSubmit}
        >
          {!isReadonly && (
            <div className="flex w-full gap-2">
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleMessageSubmitWrapper}
                isLoading={isLoading}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
              />
              
              {!isSubscribed && (
                <div className="text-xs text-muted-foreground self-center whitespace-nowrap ml-1">
                  {5 - messageCount} left today
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <Block
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleMessageSubmitWrapper}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}