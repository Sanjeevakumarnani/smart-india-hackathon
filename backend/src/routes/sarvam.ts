/**
 * @file routes/sarvam.ts
 * Express route module. Extracted (byte-preserved) from the legacy monolithic
 * server.ts. Shared middleware / helpers are imported from ../middleware and
 * ../shared; every route still falls back to the in-memory store when MySQL is
 * unavailable (no behaviour changes, wiring only).
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware';
import { executeQuery, inMemoryDb } from '../db';
import { authenticateToken, authenticatePatientSession, requireRole } from '../middleware';
import type { AuthenticatedRequest, PatientSessionRequest } from '../middleware';
import { getAiClient, normalizeClinicalSummary, inMemoryDocuments, inMemoryPrescriptions } from '../shared';
import { verifyAndRegister, verifyAndRegisterSchema, AbdmApiError, OtpExpiredError } from '../services/patientVerificationWorkflow';
import { abdmTokenManager } from '../services/abdmTokenManager';
import { isAbdmConfigured } from '../services/abdmConfig';
import { isSarvamConfigured, sarvamSTT, sarvamTTS, sarvamTranslate, sarvamDetectLanguage, sarvamChat, languageCodeToSarvam, sarvamLangToShort } from '../services/sarvamService';
import { aiConfigured, aiText, aiChat, aiVision } from '../services/aiService';
import { decodeQrImage } from '../services/qrService';
import { digitizeDocument } from '../services/documentService';
import { validateImage } from '../services/imageProcessingService';

const router = express.Router();
router.post('/api/sarvam/stt', async (req, res) => {
  const { audioBase64, languageCode, mode = 'transcribe' } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }

  if (!isSarvamConfigured()) {
    return res.status(503).json({
      error: 'Sarvam AI not configured. Set SARVAM_API_KEY.',
      code: 'SARVAM_STANDBY',
      fallback: 'bhashini_browser_stt',
    });
  }

  try {
    const result = await sarvamSTT({
      audioBase64: String(audioBase64).replace(/^data:audio\/[a-z0-9+.-]+;base64,/, ''),
      languageCode: languageCode ? languageCodeToSarvam(String(languageCode)) : undefined,
      mode: mode as any,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.warn('[Sarvam STT Gateway Notice]:', err?.message);
    return res.status(502).json({
      error: 'Sarvam STT gateway unavailable',
      detail: err?.message,
      fallback: 'bhashini_browser_stt',
    });
  }
});

/**
 * POST /api/sarvam/tts
 * Text-to-Speech using Sarvam Bulbul v3.
 * Returns base64-encoded audio. Decode on the client before playback.
 */
router.post('/api/sarvam/tts', async (req, res) => {
  const { text, languageCode, speaker, pitch, pace, loudness } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!languageCode) {
    return res.status(400).json({ error: 'languageCode is required' });
  }

  if (!isSarvamConfigured()) {
    return res.status(503).json({
      error: 'Sarvam AI not configured. Set SARVAM_API_KEY.',
      code: 'SARVAM_STANDBY',
      fallback: 'browser_speech',
    });
  }

  try {
    const result = await sarvamTTS({
      text: String(text),
      languageCode: languageCodeToSarvam(String(languageCode)),
      speaker,
      pitch,
      pace,
      loudness,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.warn('[Sarvam TTS Gateway Notice]:', err?.message);
    return res.status(502).json({
      error: 'Sarvam TTS gateway unavailable',
      detail: err?.message,
      fallback: 'browser_speech',
    });
  }
});

/**
 * POST /api/sarvam/translate
 * Live text translation between English and 22 Indian languages.
 */
router.post('/api/sarvam/translate', async (req, res) => {
  const { text, sourceLanguageCode = 'auto', targetLanguageCode, speakerGender, mode } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!targetLanguageCode) {
    return res.status(400).json({ error: 'targetLanguageCode is required' });
  }

  if (!isSarvamConfigured()) {
    return res.status(503).json({
      error: 'Sarvam AI not configured. Set SARVAM_API_KEY.',
      code: 'SARVAM_STANDBY',
      fallback: 'static_translations',
    });
  }

  try {
    const source = sourceLanguageCode === 'auto'
      ? 'auto'
      : languageCodeToSarvam(String(sourceLanguageCode));
    const target = targetLanguageCode === 'auto'
      ? 'auto'
      : languageCodeToSarvam(String(targetLanguageCode));

    const result = await sarvamTranslate({
      input: String(text),
      sourceLanguageCode: source,
      targetLanguageCode: target,
      speakerGender,
      mode,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.warn('[Sarvam Translate Gateway Notice]:', err?.message);
    return res.status(502).json({
      error: 'Sarvam translation gateway unavailable',
      detail: err?.message,
      fallback: 'static_translations',
    });
  }
});

/**
 * POST /api/sarvam/detect-language
 * Identifies the language of a text sample using Sarvam text-lid.
 */
router.post('/api/sarvam/detect-language', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  if (!isSarvamConfigured()) {
    return res.status(503).json({
      error: 'Sarvam AI not configured. Set SARVAM_API_KEY.',
      code: 'SARVAM_STANDBY',
      fallback: 'heuristic_lid',
    });
  }

  try {
    const result = await sarvamDetectLanguage(String(text));
    return res.json({
      success: true,
      ...result,
      shortCode: sarvamLangToShort(result.languageCode),
    });
  } catch (err: any) {
    console.warn('[Sarvam LID Gateway Notice]:', err?.message);
    return res.status(502).json({
      error: 'Sarvam language identification gateway unavailable',
      detail: err?.message,
      fallback: 'heuristic_lid',
    });
  }
});

/**
 * POST /api/sarvam/chat
 * Chat completion using Sarvam-105B. Falls back to Groq when unavailable.
 */
router.post('/api/sarvam/chat', async (req, res) => {
  const { messages, json = false, temperature } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!isSarvamConfigured()) {
    return res.status(503).json({
      error: 'Sarvam AI not configured. Set SARVAM_API_KEY.',
      code: 'SARVAM_STANDBY',
      fallback: 'groq',
    });
  }

  try {
    const content = await sarvamChat({
      messages: messages.map((m: any) => ({ role: m.role, content: String(m.content ?? '') })),
      json: Boolean(json),
      temperature,
    });
    return res.json({ success: true, content });
  } catch (err: any) {
    console.warn('[Sarvam Chat Gateway Notice]:', err?.message);
    return res.status(502).json({
      error: 'Sarvam chat gateway unavailable',
      detail: err?.message,
      fallback: 'groq',
    });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Encounter Retrieval by Token (For Doctor Console)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
