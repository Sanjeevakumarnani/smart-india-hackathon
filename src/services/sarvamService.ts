/**
 * @file sarvamService.ts
 * @description Sarvam AI provider implementation — primary for speech, translation,
 * language identification, and Indic chat completion.
 *
 * All Sarvam API communication happens here. The API key is read from the server
 * environment and is NEVER exposed to the React frontend.
 *
 * When SARVAM_API_KEY is unset, every function returns null / throws so callers
 * can fall back to Groq or browser-native APIs.
 */

import dotenv from 'dotenv';

dotenv.config();

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_BASE_URL = 'https://api.sarvam.ai';

export function isSarvamConfigured(): boolean {
  return Boolean(SARVAM_API_KEY);
}

function sarvamHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'api-subscription-key': SARVAM_API_KEY,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Speech-to-Text  (Saaras v4)
// ---------------------------------------------------------------------------

export type SttMode = 'transcribe' | 'translate' | 'verbatim' | 'translit' | 'codemix';

export interface SarvamSttInput {
  /** Base64-encoded audio (raw, without data-URL prefix). */
  audioBase64: string;
  languageCode?: string;
  mode?: SttMode;
  model?: string;
}

export interface SarvamSttResult {
  transcript: string;
  language_code?: string;
  source: 'sarvam_stt';
}

/**
 * Transcribe audio using Sarvam Saaras v4.
 * Accepts base64 audio and returns the transcript in the source language
 * (or translated to English when mode='translate').
 */
export async function sarvamSTT(input: SarvamSttInput): Promise<SarvamSttResult> {
  if (!isSarvamConfigured()) {
    throw new Error('Sarvam AI is not configured. Set SARVAM_API_KEY.');
  }

  const formData = new FormData();
  formData.append('model', input.model || 'saaras:v4');
  formData.append('mode', input.mode || 'transcribe');

  // Convert base64 to Blob
  const binary = atob(input.audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const audioBlob = new Blob([bytes], { type: 'audio/wav' });
  formData.append('file', audioBlob, 'audio.wav');

  const res = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method: 'POST',
    headers: sarvamHeaders(),
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sarvam STT error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    transcript: data.transcript || '',
    language_code: data.language_code,
    source: 'sarvam_stt',
  };
}

// ---------------------------------------------------------------------------
// Text-to-Speech  (Bulbul v3)
// ---------------------------------------------------------------------------

export type SarvamSpeaker =
  | 'aditya' | 'ritu' | 'ashutosh' | 'priya' | 'neha' | 'rahul'
  | 'pooja' | 'rohan' | 'simran' | 'kavya' | 'amit' | 'dev'
  | 'ishita' | 'shreya' | 'ratan' | 'varun' | 'manan' | 'sumit'
  | 'roopa' | 'kabir' | 'aayan' | 'shubh' | 'advait' | 'anand'
  | 'tanya' | 'tarun' | 'sunny' | 'mani' | 'gokul' | 'vijay'
  | 'shruti' | 'suhani' | 'mohit' | 'kavitha' | 'rehan' | 'soham'
  | 'rupali';

export interface SarvamTtsInput {
  text: string;
  languageCode: string;
  speaker?: SarvamSpeaker;
  model?: string;
  pitch?: number;
  pace?: number;
  loudness?: number;
  /** Sarvam TTS API parameter: `preprocessor-normalize`. */
  'preprocessor-normalize'?: boolean;
}

export interface SarvamTtsResult {
  /** Base64-encoded audio chunks joined. Caller must decode before writing to file. */
  audioBase64: string;
  source: 'sarvam_tts';
}

/**
 * Convert text to speech using Sarvam Bulbul v3.
 * Returns base64-encoded audio (decode before saving as .wav).
 */
export async function sarvamTTS(input: SarvamTtsInput): Promise<SarvamTtsResult> {
  if (!isSarvamConfigured()) {
    throw new Error('Sarvam AI is not configured. Set SARVAM_API_KEY.');
  }

  const payload: Record<string, unknown> = {
    text: input.text,
    language_code: input.languageCode,
    model: input.model || 'bulbul:v3',
    speaker: input.speaker || 'neha',
  };

  if (input.pitch !== undefined) payload.pitch = input.pitch;
  if (input.pace !== undefined) payload.pace = input.pace;
  if (input.loudness !== undefined) payload.loudness = input.loudness;
  if (input['preprocessor-normalize'] !== undefined) {
    payload['preprocessor-normalize'] = input['preprocessor-normalize'];
  }

  const res = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: 'POST',
    headers: sarvamHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sarvam TTS error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  // Sarvam returns { audios: string[] } where each element is a base64 chunk
  const audioBase64 = Array.isArray(data.audios)
    ? data.audios.join('')
    : (typeof data.audio === 'string' ? data.audio : '');

  return { audioBase64, source: 'sarvam_tts' };
}

// ---------------------------------------------------------------------------
// Text Translation  (Mayura / Sarvam-Translate)
// ---------------------------------------------------------------------------

export interface SarvamTranslateInput {
  input: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  speakerGender?: 'Male' | 'Female' | 'Neutral';
  mode?: 'formal' | 'informal';
  model?: string;
}

export interface SarvamTranslateResult {
  translatedText: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
  source: 'sarvam_translate';
}

/**
 * Translate text between English and 22 Indian languages.
 * Use sourceLanguageCode='auto' for automatic detection.
 */
export async function sarvamTranslate(input: SarvamTranslateInput): Promise<SarvamTranslateResult> {
  if (!isSarvamConfigured()) {
    throw new Error('Sarvam AI is not configured. Set SARVAM_API_KEY.');
  }

  const payload: Record<string, unknown> = {
    input: input.input,
    source_language_code: input.sourceLanguageCode,
    target_language_code: input.targetLanguageCode,
  };

  if (input.speakerGender) payload.speaker_gender = input.speakerGender;
  if (input.mode) payload.mode = input.mode;
  if (input.model) payload.model = input.model;

  const res = await fetch(`${SARVAM_BASE_URL}/translate`, {
    method: 'POST',
    headers: sarvamHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sarvam Translate error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    translatedText: data.translated_text || '',
    sourceLanguageCode: data.source_language_code,
    targetLanguageCode: data.target_language_code,
    source: 'sarvam_translate',
  };
}

// ---------------------------------------------------------------------------
// Language Identification
// ---------------------------------------------------------------------------

export interface SarvamLidResult {
  languageCode: string;
  languageName?: string;
  confidence?: number;
  source: 'sarvam_lid';
}

/**
 * Detect the language of input text. Supports all 22 Indian languages.
 */
export async function sarvamDetectLanguage(text: string): Promise<SarvamLidResult> {
  if (!isSarvamConfigured()) {
    throw new Error('Sarvam AI is not configured. Set SARVAM_API_KEY.');
  }

  const res = await fetch(`${SARVAM_BASE_URL}/text-lid`, {
    method: 'POST',
    headers: sarvamHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ input: text }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sarvam LID error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const langEntry = data?.language_code || data?.results?.[0];
  return {
    languageCode: langEntry?.language_code || langEntry || 'unknown',
    languageName: langEntry?.language || undefined,
    confidence: langEntry?.confidence,
    source: 'sarvam_lid',
  };
}

// ---------------------------------------------------------------------------
// Chat Completion  (Sarvam-105B)
// ---------------------------------------------------------------------------

export interface SarvamChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SarvamChatInput {
  messages: SarvamChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/**
 * Multi-turn chat completion using Sarvam-105B.
 * Falls back to Groq when Sarvam is unavailable (callers should handle).
 */
export async function sarvamChat(input: SarvamChatInput): Promise<string> {
  if (!isSarvamConfigured()) {
    throw new Error('Sarvam AI is not configured. Set SARVAM_API_KEY.');
  }

  const payload: Record<string, unknown> = {
    model: input.model || 'sarvam-105b',
    messages: input.messages,
    temperature: input.temperature ?? 0.4,
    max_tokens: input.maxTokens ?? 4096,
  };

  if (input.json) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: sarvamHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sarvam Chat error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  const text = message?.content ?? message?.reasoning_content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Sarvam Chat returned an empty response.');
  }
  return text.trim();
}

// ---------------------------------------------------------------------------
// Helper: map our LanguageCode to Sarvam BCP-47
// ---------------------------------------------------------------------------

export function languageCodeToSarvam(lang: string): string {
  const map: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    ur: 'ur-IN',
    or: 'or-IN',
    as: 'as-IN',
  };
  return map[lang] || 'en-IN';
}

/**
 * Map a BCP-47 language code (e.g. "te-IN") back to our short code ("te").
 */
export function sarvamLangToShort(bcp47: string): string {
  const prefix = bcp47.split('-')[0].toLowerCase();
  const reverseMap: Record<string, string> = {
    en: 'en', hi: 'hi', te: 'te', ta: 'ta', kn: 'kn',
    ml: 'ml', mr: 'mr', bn: 'bn', gu: 'gu', pa: 'pa',
    ur: 'ur', or: 'or', as: 'as',
  };
  return reverseMap[prefix] || 'en';
}
