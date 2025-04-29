import { createClient as createServerClient } from './server'
import { createClient as createBrowserClient } from './client'

// Helper function to get the appropriate Supabase client based on environment
export async function getClient() {
  if (typeof window === 'undefined') {
    return await createServerClient()
  } else {
    return createBrowserClient()
  }
}

// Helper function to normalize data from Supabase to match the original schema
export function normalizeChat(chat: any) {
  if (!chat) return null
  
  return {
    id: chat.id,
    userId: chat.user_id,
    title: chat.title,
    visibility: chat.visibility,
    createdAt: new Date(chat.created_at),
  }
}

export function normalizeMessage(message: any) {
  if (!message) return null
  
  return {
    id: message.id,
    chatId: message.chat_id,
    role: message.role,
    content: message.content,
    createdAt: new Date(message.created_at),
  }
}

export function normalizeVote(vote: any) {
  if (!vote) return null
  
  return {
    chatId: vote.chat_id,
    messageId: vote.message_id,
    isUpvoted: vote.vote > 0,
  }
}

export function normalizeDocument(document: any) {
  if (!document) return null
  
  return {
    id: document.id,
    createdAt: new Date(document.created_at),
    title: document.title,
    content: document.content,
    kind: document.kind,
    userId: document.user_id,
  }
}

export function normalizeSuggestion(suggestion: any) {
  if (!suggestion) return null
  
  return {
    id: suggestion.id,
    documentId: suggestion.document_id,
    documentCreatedAt: new Date(suggestion.document_created_at),
    originalText: suggestion.original_text,
    suggestedText: suggestion.suggested_text,
    description: suggestion.description,
    isResolved: suggestion.is_resolved,
    userId: suggestion.user_id,
    createdAt: new Date(suggestion.created_at),
  }
}

export function normalizeSubscription(subscription: any) {
  if (!subscription) return null
  
  return {
    id: subscription.id,
    userId: subscription.user_id,
    status: subscription.status,
    stripeCustomerId: subscription.stripe_customer_id,
    stripeSubscriptionId: subscription.stripe_subscription_id,
    stripePriceId: subscription.stripe_price_id,
    stripeCurrentPeriodEnd: subscription.stripe_current_period_end 
      ? new Date(subscription.stripe_current_period_end) 
      : null,
    createdAt: new Date(subscription.created_at),
    updatedAt: new Date(subscription.updated_at),
  }
}
