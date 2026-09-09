/**
 * @file groqService.ts
 * @description Groq AI provider implementation.
 *
 * All Groq API communication happens here through the OpenAI-compatible
 * endpoint (https://api.groq.com/openai/v1).  The API key is read from the
 * server environment and is NEVER exposed to the React frontend — every call
 * is made from the backend.
 *
 * This module is provider-specific.  Application code should prefer the
 * provider-neutral `aiService` abstraction instead of importing this module
 * directly.
 */

import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const DEFAULT_MODEL = process.env.GROQ_DEFAULT_MODEL || 'qwen/qwen3.8-27b';
const FAST_MODEL = process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';
const REASONING_MODEL = process.env.GROQ_REASONING_MODEL || 'openai/gpt-oss-120b';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
const SPEECH_MODEL = process.env.GROQ_SPEECH_MODEL || 'whisper-large-v3-turbo';

export type GroqModelKind = 'default' | 'fast' | 'reasoning' | 'vision' | 'speech';

export function groqModelFor(kind: GroqModelKind): string {
  switch (kind) {
    case 'fast': return FAST_MODEL;
    case 'reasoning': return REASONING_MODEL;
    case 'vision': return VISION_MODEL;
    case 'speech': return SPEECH_MODEL;
    default: return DEFAULT_MODEL;
  }
}

export function isGroqConfigured(): boolean {
  return Boolean(GROQ_API_KEY);
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface GroqRequestOptions {
  modelKind?: GroqModelKind;
  model?: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

async function groqRequest(messages: GroqMessage[], options: GroqRequestOptions = {}): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error('Groq is not configured. Set GROQ_API_KEY in the server environment.');
  }

  const model = options.model || groqModelFor(options.modelKind || 'default');

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 2048,
  };

  if (options.json) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('Groq API returned an empty response.');
  }
  return text;
}

export interface GroqTextInput {
  prompt: string;
  modelKind?: GroqModelKind;
  model?: string;
  json?: boolean;
  system?: string;
}

/** Single-turn text generation. Returns raw text (or JSON string when json:true). */
export async function groqText(input: GroqTextInput): Promise<string> {
  const messages: GroqMessage[] = [];
  if (input.system) messages.push({ role: 'system', content: input.system });
  messages.push({ role: 'user', content: input.prompt });
  return groqRequest(messages, {
    modelKind: input.modelKind,
    model: input.model,
    json: input.json,
  });
}

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatInput {
  messages: GroqChatMessage[];
  modelKind?: GroqModelKind;
  model?: string;
  json?: boolean;
}

/** Multi-turn chat completion. */
export async function groqChat(input: GroqChatInput): Promise<string> {
  return groqRequest(
    input.messages.map((m) => ({ role: m.role, content: m.content })),
    { modelKind: input.modelKind, model: input.model, json: input.json }
  );
}

export interface GroqVisionInput {
  /** Base64-encoded image (without the data URL prefix). */
  imageBase64: string;
  mimeType?: string;
  prompt: string;
  json?: boolean;
  modelKind?: GroqModelKind;
}

/** Vision / OCR request using the configured vision model. */
export async function groqVision(input: GroqVisionInput): Promise<string> {
  const messages: GroqMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: input.prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${input.mimeType || 'image/jpeg'};base64,${input.imageBase64}`,
          },
        },
      ],
    },
  ];
  return groqRequest(messages, {
    modelKind: input.modelKind || 'vision',
    json: input.json,
    temperature: 0.2,
  });
}

export { DEFAULT_MODEL, FAST_MODEL, REASONING_MODEL, VISION_MODEL, SPEECH_MODEL };
