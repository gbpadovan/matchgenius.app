// Type definitions for the application

// Chat type definition
export type Chat = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  visibility: 'private' | 'public';
};

// Message type definition
export type Message = {
  id: string;
  chat_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
};

// Vote type definition
export type Vote = {
  id: string;
  chat_id: string;
  message_id: string;
  user_id: string;
  type: 'up' | 'down';
  created_at: string;
};

// Document type definition
export type Document = {
  id: string;
  title: string;
  content: string;
  kind: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

// Subscription type definition
export type Subscription = {
  id: string;
  user_id: string;
  status: string;
  price_id: string;
  quantity: number;
  cancel_at_period_end: boolean;
  created_at: string;
  current_period_start: string;
  current_period_end: string;
  ended_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
};
