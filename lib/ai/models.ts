import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'chat-model-small';

export const myProvider = customProvider({
  languageModels: {
    'chat-model-small': anthropic('claude-3-haiku-20240307'),
    'chat-model-large': anthropic('claude-3-sonnet-20240229'),
    'chat-model-reasoning': wrapLanguageModel({
      model: fireworks('accounts/fireworks/models/deepseek-r1'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': anthropic('claude-3-haiku-20240307'),
    'block-model': anthropic('claude-3-haiku-20240307'),
  },
  imageModels: {
    // Keep using OpenAI for image generation since Anthropic doesn't support it
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'Claude Haiku',
    description: 'Fast and efficient model for everyday tasks',
  },
  {
    id: 'chat-model-large',
    name: 'Claude Sonnet',
    description: 'Advanced model for complex tasks and longer context',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning capabilities',
  },
];