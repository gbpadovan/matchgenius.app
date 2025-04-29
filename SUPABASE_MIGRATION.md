# Supabase Migration Guide

This document outlines the migration from NextAuth.js and Drizzle ORM to Supabase for authentication and database operations.

## Overview

The application has been migrated from:
- NextAuth.js → Supabase Auth
- Drizzle ORM → Supabase Database

## Key Components

### Supabase Client Setup

- `/lib/supabase/client.ts` - Browser client for client-side components
- `/lib/supabase/server.ts` - Server client for server components and API routes
- `/lib/supabase/db.ts` - Database operations that replace Drizzle ORM queries
- `/lib/supabase/utils.ts` - Helper functions for working with Supabase data

### Authentication Components

- `/components/providers/supabase-auth-provider.tsx` - Auth context provider
- `/app/(auth)/actions.ts` - Server actions for login/register
- `/app/auth/callback/route.ts` - Auth callback handler for Supabase redirects

### UI Components

- `/components/user-profile.tsx` - User profile with sign-out functionality
- `/app/(auth)/login/page.tsx` - Login page
- `/app/(auth)/register/page.tsx` - Registration page
- `/app/auth-error/page.tsx` - Error page for authentication issues

## Database Schema

The database schema has been migrated to Supabase with the following tables:

- `users` - User information
- `chats` - Chat conversations
- `messages` - Chat messages
- `votes` - Message votes
- `documents` - User documents
- `suggestions` - Document suggestions
- `products` - Stripe products
- `prices` - Stripe prices
- `subscriptions` - User subscriptions

Row Level Security (RLS) policies have been implemented to ensure proper data access control.

## Authentication Flow

1. Users register or log in through Supabase Auth
2. Auth state is managed by the Supabase Auth Provider
3. Protected routes are handled by the middleware
4. User session is accessible through the `useSupabaseAuth` hook

## How to Use

### Client-Side Authentication

```tsx
'use client'

import { useSupabaseAuth } from '@/components/providers/supabase-auth-provider'

export default function MyComponent() {
  const { user, session, isLoading } = useSupabaseAuth()
  
  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Not logged in</div>
  
  return <div>Hello, {user.email}</div>
}
```

### Server-Side Authentication

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function MyServerComponent() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return <div>Not logged in</div>
  }
  
  return <div>Hello, {session.user.email}</div>
}
```

### Database Operations

```tsx
import { createClient } from '@/lib/supabase/server'

export async function getChats(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching chats:', error)
    throw error
  }
  
  return data
}
```

## Migrated APIs

The following API routes have been updated to use Supabase:

- `/api/subscription` - Get user subscription information

## Environment Variables

The following environment variables are required:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
