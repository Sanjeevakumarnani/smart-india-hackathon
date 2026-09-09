/**
 * @file routes/asr.ts
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
router.post('/api/asr/bhashini', async (req, res) => {
  const { audioBase64, languageCode, sampleRate } = req.body;

  if (!audioBase64 || !languageCode) {
    return res.status(400).json({ error: 'audioBase64 and languageCode are required' });
  }

  const BHASHINI_API_KEY = process.env.BHASHINI_API_KEY;
  const BHASHINI_USER_ID = process.env.BHASHINI_USER_ID;

  if (!BHASHINI_API_KEY) {
    return res.status(503).json({
      error: 'Bhashini API not configured in environment. Browser Web Speech API fallback active.',
      code: 'BHASHINI_STANDBY',
      fallback: 'browser_stt',
    });
  }

  try {
    const bhashiniRes = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BHASHINI_API_KEY,
        'userID': BHASHINI_USER_ID || '',
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: 'asr',
            config: {
              language: { sourceLanguage: languageCode },
              serviceId: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
              audioFormat: 'wav',
              samplingRate: sampleRate || 16000,
            },
          },
        ],
        inputData: {
          audio: [{ audioContent: audioBase64 }],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!bhashiniRes.ok) {
      throw new Error(`Bhashini gateway returned status ${bhashiniRes.status}`);
    }

    const data = await bhashiniRes.json();
    const transcript = data?.pipelineResponse?.[0]?.output?.[0]?.source || '';

    return res.json({ success: true, transcript, source: 'bhashini_indic_asr' });
  } catch (err: any) {
    console.warn('[Bhashini ASR Gateway Notice]:', err?.message);
    return res.status(502).json({
      error: 'Bhashini ASR gateway unavailable',
      detail: err?.message,
      fallback: 'browser_stt',
    });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// Sarvam AI API Proxy (Primary provider for speech, translation & LID)
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/sarvam/stt
 * Speech-to-Text using Sarvam Saaras v4.
 * Accepts base64 audio and returns the transcript. Falls back to Bhashini
 * then browser STT when Sarvam is not configured.
 */


export default router;
