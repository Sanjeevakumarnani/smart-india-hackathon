/**
 * @file routes/chat.ts
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
router.post('/api/chat/assistant', async (req, res) => {
  const { message, language = 'en', currentStep } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  const ai = aiConfigured();
  if (ai) {
    try {
      const prompt = `You are the polite, clinical AI Assistant at an Indian hospital OPD Kiosk named MediKiosk+.
The patient is currently on screen: ${currentStep || 'General'}. Preferred language: ${language}.
Patient question: "${message}"

Answer clearly, concisely (under 60 words), with warmth and clinical guidance.
- If emergency/chest pain/breathlessness: immediately instruct to notify the emergency triage desk.
- If ABHA/Aadhaar: explain step 2 verification.
- If queue/token: explain room number and wait times.
- If DPDP: assure data is purged under DPDP Act 2023.
Answer in the patient's language or English if language is en.`;

      const reply = (await aiText({
        prompt,
        modelKind: 'fast',
      })).trim();

      return res.json({ reply, source: 'ai-assistant' });
    } catch (err: any) {
      console.warn('Chat AI fallback:', err?.message || err);
    }
  }

  // Deterministic smart rule fallback
  const lower = message.toLowerCase();
  let reply = 'Namaste! MediKiosk+ automated triage is here to guide you through registration, vitals, and consultation with the doctor.';
  if (lower.includes('abha') || lower.includes('card') || lower.includes('aadhaar')) {
    reply = 'You can scan your ABHA QR card on Step 2, enter your 14-digit ABHA number, or use voice recognition to identify yourself.';
  } else if (lower.includes('emergency') || lower.includes('chest') || lower.includes('pain') || lower.includes('dard')) {
    reply = 'ðŸš¨ If you are experiencing severe chest pain, extreme breathlessness, or trauma, alert the emergency triage desk immediately. Level-1 priority protocol will activate.';
  } else if (lower.includes('token') || lower.includes('queue') || lower.includes('wait') || lower.includes('room')) {
    reply = 'Your OPD token slip and assigned room (e.g. Room #104) are generated at the end of registration. Live tokens are also displayed in the queue.';
  } else if (lower.includes('dpdp') || lower.includes('privacy') || lower.includes('delete') || lower.includes('safe')) {
    reply = 'Under DPDP Act 2023, your temporary kiosk scans and voice recordings are wiped from kiosk memory immediately after transmission to the encrypted doctor console.';
  }

  res.json({ reply, source: 'rule-fallback' });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Provider-Neutral AI Routes (/api/ai/*)
// These are the forward-looking endpoints.  The deprecated /api/gemini/*
// routes above remain as temporary backward-compatible aliases that already
// delegate to the same provider-neutral services internally.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
