/**
 * @file aiService.ts
 * @description Provider-neutral AI application interface.
 *
 * Application code should depend on this module (not on Gemini, Sarvam, or Groq
 * directly). It routes tasks to the correct model profile, preferring Sarvam AI
 * (Indic-tuned) and falling back to Groq when Sarvam is unavailable.
 *
 * By design we never return raw AI output as a confirmed medical diagnosis.
 * It is treated strictly as triage assistance, summarization, extraction and
 * organisation for the attending clinician to review.
 */

import {
  groqText,
  groqChat,
  groqVision,
  isGroqConfigured,
  type GroqModelKind,
} from './groqService';
import { sarvamChat, isSarvamConfigured } from './sarvamService';

export type ModelKind = GroqModelKind;

/** AI is considered configured when either Sarvam or Groq is available. */
export function aiConfigured(): boolean {
  return isSarvamConfigured() || isGroqConfigured();
}

/** True when the primary (Sarvam) provider is configured. */
export function isSarvamPrimary(): boolean {
  return isSarvamConfigured();
}

export interface AiTextInput {
  prompt: string;
  modelKind?: ModelKind;
  json?: boolean;
  system?: string;
}

/** Generate text or structured JSON from a prompt (Sarvam-105B, Groq fallback). */
export async function aiText(input: AiTextInput): Promise<string> {
  const messages = [
    ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
    { role: 'user' as const, content: input.prompt },
  ];

  if (isSarvamConfigured()) {
    try {
      return await sarvamChat({
        messages,
        json: input.json,
      });
    } catch (sarvamErr: any) {
      console.warn('[aiText] Sarvam provider failed, falling back to Groq:', sarvamErr?.message);
    }
  }

  return groqText({
    prompt: input.prompt,
    modelKind: input.modelKind,
    json: input.json,
    system: input.system,
  });
}

export async function aiChat(input: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  modelKind?: ModelKind;
  json?: boolean;
}): Promise<string> {
  if (isSarvamConfigured()) {
    try {
      return await sarvamChat({
        messages: input.messages,
        json: input.json,
      });
    } catch (sarvamErr: any) {
      console.warn('[aiChat] Sarvam provider failed, falling back to Groq:', sarvamErr?.message);
    }
  }

  return groqChat({
    messages: input.messages,
    modelKind: input.modelKind,
    json: input.json,
  });
}

/** Vision / OCR stays on Groq (Sarvam has no vision API). */
export async function aiVision(input: {
  imageBase64: string;
  mimeType?: string;
  prompt: string;
  json?: boolean;
}): Promise<string> {
  return groqVision({
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
    prompt: input.prompt,
    json: input.json,
  });
}