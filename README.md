# Match Genius App

## Overview

This is a dating app designed to help users generate and refine pickup lines and conversation starters for dating platforms. It uses AI to create personalized messages based on information about dating prospects.

## Core Technology Stack

1. Frontend: Next.js with React, using the App Router pattern
2. UI Framework: Tailwind CSS with shadcn/ui components
3. Authentication: Supabase Auth for user authentication and session management
4. Database: PostgreSQL with Supabase for data storage and queries
5. AI Integration: AI SDK for connecting to various AI models
6. Payment Processing: Stripe for subscription management

## Key Features

### 1. AI-Powered Chat System

* Users can input information about their dating prospects
* The app leverages AI models (Claude/Anthropic, DeepSeek) to generate personalized pickup lines and conversation starters
* Multiple AI models are available (Claude Haiku, Claude Sonnet, DeepSeek reasoning model)

### 2. Conversation Management

* Users can create and manage multiple chat conversations
* Chat history is saved for future reference
* Messages can be upvoted/downvoted for feedback

### 3. Subscription Model

* Free tier: Limited to 5 messages per day
* Premium subscription: Unlimited messages and access to additional features
* Stripe integration for payment processing

### 4. Document Creation and Management

* Users can create and edit documents for longer conversation strategies
* Document suggestions system for refining messages

### 5. Multi-modal Support

* Attachments/file uploads supported
* Tools integration (like weather information)

#### 5.1. File Upload System

The file upload functionality is implemented through several components:

##### 5.1.1. Frontend Component (multimodal-input.tsx):

* Provides a file input interface for users to upload files
* Handles file selection and upload queue management
* Supports multiple file uploads simultaneously
* Shows preview of uploaded attachments
* File size limit: 5MB
* Currently supports image files (JPEG and PNG)

##### 5.1.2. Upload API (app/(chat)/api/files/upload/route.ts):

* Handles file upload requests
* Validates files using Zod schema:
* Size limit check (5MB)
* File type validation (JPEG/PNG)
* Uses Vercel Blob storage for file storage
* Returns public URLs for uploaded files

##### 5.1.3. Preview Component (preview-attachment.tsx):

* Displays uploaded files in the chat interface
* Shows upload status and loading states
* Supports different file types with appropriate previews

#### 5.2. Tools Integration

The app includes several AI tools that can be used during conversations:

##### 5.2.1. Weather Tool (get-weather.ts):

* Integrates with the Open-Meteo API
* Provides weather information for specific locations
* Takes latitude and longitude as parameters
* Returns current temperature and forecast data
* Can be used in conversation context (e.g., suggesting date ideas based on weather)

##### 5.2.2. Document Management Tools:

* create-document.ts: Creates new documents for longer conversations or strategies
* update-document.ts: Updates existing documents
* request-suggestions.ts: Generates suggestions for improving messages

#### 5.3. How It All Works Together

##### 5.3.1. User Input Flow:
```
   User Input -> MultimodalInput Component
   ├── Text input
   └── File attachments
       ├── Upload to Vercel Blob
       └── Attach to message
```
##### 5.3.2. Message Processing:
```
   Message + Attachments -> AI Processing
   ├── Text analysis
   └── Tool Integration
       ├── Weather data (if location-related)
       ├── Document creation (for longer strategies)
       └── Suggestion generation
```
##### 5.3.3. Response Generation:

* The AI can use both the text input and attached files to generate responses
* Tools can be called during response generation to provide additional context
* Responses can include references to attachments or tool outputs

#### 5.4. Key Features

##### 5.4.1. File Handling:

* Secure upload process with validation
* Progress tracking for uploads
* Preview support for different file types
* Public access to uploaded files

##### 5.4.2. Tool Integration:

* Weather data integration for context-aware suggestions
* Document management for longer conversations
* Suggestion system for message improvement

##### 5.4.3. UI Components:

* Rich text input with file attachment support
* File preview system
* Progress indicators for uploads
* Tool output display integration

This multi-modal support enhances the app's ability to provide context-aware and personalized dating advice by considering both text input and additional media or data sources.

## User Flow

1. A user registers or logs in to the platform
2. They create a new chat or continue an existing conversation
3. The user inputs information about their dating prospect (profile details, interests, etc.)
4. The AI processes this information through a specialized prompt designed to understand dating profiles
5. The AI generates a personalized message for the user to send to their match
6. The user can copy this message and use it in their dating app
7. The user can continue the conversation by providing responses from their match, and the AI will help craft follow-up messages

## Technical Architecture

### Database Schema

* User accounts with authentication
* Chat conversations linked to users
* Messages within chats
* Voting system for message quality
* Documents for longer content
* Subscription management tables (Products, Prices, Subscriptions)

#### Row-Level Security (RLS) Policies

The Supabase database implements comprehensive Row-Level Security (RLS) policies to ensure data privacy and security:

* **Users Table**:
  * Users can only view and update their own profile data
  * New user records can be created during the sign-up process

* **Chats Table**:
  * Users can only view, update, and delete their own chats
  * Public chats are visible to all users through a specific policy
  * Insert operations verify the user_id matches the authenticated user

* **Messages Table**:
  * Users can only view messages in their own chats
  * Messages in public chats are visible to all users
  * Users can only insert messages into chats they own

* **Votes Table**:
  * Users can view votes on their own messages
  * Votes on public chat messages are visible to all users
  * Users can only insert, update, and delete their own votes

* **Documents Table**:
  * Users can only view, create, update, and delete their own documents
  * All operations verify the user_id matches the authenticated user

* **Subscriptions Table**:
  * Users can only view their own subscription information
  * Only the service role can manage (insert/update/delete) subscriptions

These RLS policies are enforced at the database level, providing an additional layer of security beyond application-level controls.

### API Endpoints

* Authentication endpoints
* Chat management (create, delete, update)
* Message processing with AI integration
* Document management
* Subscription and payment processing

### AI Implementation

* System prompts designed specifically for dating context
* Different models available for different complexity levels
* Tools integration for enhanced capabilities

### Subscription System

* Free tier with daily message limits
* Premium tier with unlimited access
* Stripe integration for payment processing

This app essentially serves as an AI-powered dating coach that helps users craft personalized messages for their dating app conversations, with a freemium business model that limits free users to 5 messages per day while offering unlimited messages to subscribers.

## More Information:

### This app is based upon:

* https://github.com/vercel/ai-chatbot
