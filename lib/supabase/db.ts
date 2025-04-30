import { createClient } from './server';

// User queries
export async function getUser(email: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (error) {
    console.error('Failed to get user from database:', error);
    throw error;
  }

  return data || [];
}

// Chat queries
export async function saveChat({
  id,
  userId,
  title,
  visibility = 'private',
}: {
  id: string;
  userId: string;
  title: string;
  visibility?: 'private' | 'public';
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('chats').insert({
    id,
    user_id: userId,
    title,
    visibility,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to save chat in database:', error);
    throw error;
  }

  return true;
}

export async function deleteChatById({ id }: { id: string }) {
  const supabase = await createClient();
  
  // First delete related votes
  const { error: votesError } = await supabase
    .from('votes')
    .delete()
    .eq('chat_id', id);
  
  if (votesError) {
    console.error('Failed to delete votes for chat:', votesError);
    throw votesError;
  }
  
  // Then delete related messages
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('chat_id', id);
  
  if (messagesError) {
    console.error('Failed to delete messages for chat:', messagesError);
    throw messagesError;
  }
  
  // Finally delete the chat
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Failed to delete chat by id from database:', error);
    throw error;
  }
  
  return true;
}

export async function getChatsByUserId({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get chats by user from database:', error);
    throw error;
  }

  return data || [];
}

export async function getChatById({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to get chat by id from database:', error);
    throw error;
  }

  return data;
}

// Message queries
export async function saveMessages({ messages }: { messages: Array<any> }) {
  const supabase = await createClient();
  const { error } = await supabase.from('messages').insert(
    messages.map(msg => ({
      id: msg.id,
      chat_id: msg.chatId,
      role: msg.role,
      content: msg.content,
      created_at: new Date(msg.createdAt).toISOString(),
    }))
  );

  if (error) {
    console.error('Failed to save messages in database:', error);
    throw error;
  }

  return true;
}

export async function getMessagesByChatId({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to get messages by chat id from database:', error);
    throw error;
  }

  // Transform data to match the original schema
  return (data || []).map(msg => ({
    id: msg.id,
    chatId: msg.chat_id,
    role: msg.role,
    content: msg.content,
    createdAt: new Date(msg.created_at),
  }));
}

// Vote queries
export async function voteMessage({
  chatId,
  messageId,
  userId,
  type,
}: {
  chatId: string;
  messageId: string;
  userId: string;
  type: 'up' | 'down';
}) {
  const supabase = await createClient();
  
  // Check if vote exists
  const { data: existingVotes, error: fetchError } = await supabase
    .from('votes')
    .select('*')
    .eq('message_id', messageId)
    .eq('user_id', userId);
  
  if (fetchError) {
    console.error('Failed to check existing votes:', fetchError);
    throw fetchError;
  }
  
  const voteValue = type === 'up' ? 1 : -1;
  
  if (existingVotes && existingVotes.length > 0) {
    // Update existing vote
    const { error } = await supabase
      .from('votes')
      .update({ vote: voteValue })
      .eq('message_id', messageId)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Failed to update vote in database:', error);
      throw error;
    }
  } else {
    // Insert new vote
    const { error } = await supabase
      .from('votes')
      .insert({
        message_id: messageId,
        chat_id: chatId,
        user_id: userId,
        vote: voteValue,
      });
      
    if (error) {
      console.error('Failed to insert vote in database:', error);
      throw error;
    }
  }
  
  return true;
}

export async function getVotesByChatId({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('chat_id', id);

  if (error) {
    console.error('Failed to get votes by chat id from database:', error);
    throw error;
  }

  return data || [];
}

// Document queries
export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: string;
  content: string;
  userId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('documents').insert({
    id,
    title,
    kind,
    content,
    user_id: userId,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to save document in database:', error);
    throw error;
  }

  return true;
}

export async function getDocumentsById({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get documents by id from database:', error);
    throw error;
  }

  return data || [];
}

// Subscription queries
export async function createOrUpdateSubscription({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  stripeCurrentPeriodEnd,
  status,
}: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: Date;
  status?: string;
}) {
  const supabase = await createClient();
  
  // Check if subscription exists
  const { data: existingSub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (fetchError) {
    console.error('Failed to check existing subscription:', fetchError);
    throw fetchError;
  }
  
  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    ...(stripeSubscriptionId && { stripe_subscription_id: stripeSubscriptionId }),
    ...(stripePriceId && { stripe_price_id: stripePriceId }),
    ...(stripeCurrentPeriodEnd && { stripe_current_period_end: stripeCurrentPeriodEnd.toISOString() }),
    ...(status && { status }),
    updated_at: new Date().toISOString(),
  };
  
  if (existingSub) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSub.id);
      
    if (error) {
      console.error('Failed to update subscription in database:', error);
      throw error;
    }
  } else {
    // Insert new subscription
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        ...subscriptionData,
        created_at: new Date().toISOString(),
      });
      
    if (error) {
      console.error('Failed to insert subscription in database:', error);
      throw error;
    }
  }
  
  return true;
}

export async function getSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  
  if (error) {
    console.error('Failed to get subscription by Stripe subscription ID:', error);
    throw error;
  }
  
  return { data };
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string
) {
  const supabase = await createClient();
  
  // Get the current subscription to preserve other fields
  const { data: subscription } = await getSubscriptionByStripeSubscriptionId(stripeSubscriptionId);
  
  if (!subscription) {
    console.error(`Subscription not found for ID: ${stripeSubscriptionId}`);
    throw new Error(`Subscription not found for ID: ${stripeSubscriptionId}`);
  }
  
  // Update only the status and updated_at fields
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', stripeSubscriptionId);
  
  if (error) {
    console.error('Failed to update subscription status:', error);
    throw error;
  }
  
  return true;
}
