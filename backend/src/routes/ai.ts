/**
 * @file routes/ai.ts
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
router.post('/api/ai/drug-interaction', async (req, res) => {
  const { medications } = req.body;
  if (!medications || !Array.isArray(medications)) {
    return res.status(400).json({ error: 'medications array required' });
  }
  try {
    if (!aiConfigured()) {
      return res.json({ interactions: [], source: 'fallback_no_api_key' });
    }
    const prompt = `You are a clinical pharmacist. Analyze these medications for dangerous drug-drug interactions: ${medications.join(', ')}. 
Return a JSON array: [{ "drug1": string, "drug2": string, "severity": "CONTRAINDICATED"|"CAUTION"|"MONITOR", "description": string }].
If no interactions found, return []. Return only valid JSON.`;

    const raw = (await aiText({
      prompt,
      modelKind: 'fast',
      json: true,
    })).trim() || '[]';
    const interactions = JSON.parse(raw);
    res.json({ interactions, source: 'ai' });
  } catch (err: any) {
    console.error('Drug interaction error:', err?.message || err);
    res.json({ interactions: [], source: 'error_fallback' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Physician Correction Feedback Logger
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/ai/summarize', async (req, res) => {
  try {
    const { historyObject, documents, patientProfile, language = 'en' } = req.body;
    if (!aiConfigured()) {
      return res.status(503).json({
        error: 'AI not configured. Set GROQ_API_KEY in the server environment.',
        code: 'AI_NOT_CONFIGURED',
      });
    }
    const prompt = `You are an expert Chief Medical Officer and AI Scribe at an OPD Kiosk.
Synthesize the structured triage data below into an EHR clinical summary conforming to standard SOAP format.
Patient Intake Data:
- Chief Complaint: ${historyObject?.chiefComplaint || 'Not specified'}
- OPD Type: ${historyObject?.opdType}
- SOCRATES Pain Profile: ${JSON.stringify(historyObject?.socrates || {})}
- Red Flags: ${JSON.stringify(historyObject?.redFlags || [])}
- Patient Profile: ${JSON.stringify(patientProfile || {})}
- AYUSH Pariksha: ${JSON.stringify(historyObject?.ayush || {})}
- Digitized Historical Documents: ${JSON.stringify(documents || [])}
- Patient Selected Language: ${language}

Return a valid JSON object matching this schema:
{
  "chiefComplaint": string,
  "hpi": string,
  "pastHistory": string,
  "medications": string,
  "allergies": string,
  "ayushAssessment": {
    "prakriti": string,
    "agni": string,
    "koshtha": string,
    "aharaVihara": string,
    "doshaImbalance": string,
    "chikitsaGuidance": string
  } | null,
  "investigationsSummary": string,
  "redFlagsIdentified": string[],
  "differentialDiagnosis": string[],
  "provisionalPlan": string,
  "regionalSummary": string (2-3 sentences concise patient summary written in the requested language: ${language}),
  "hindiSummary": string
}
Return only JSON.`;

    const raw = (await aiText({
      prompt,
      modelKind: 'reasoning',
      json: true,
      system: 'You are an expert medical AI scribe. Never present the output as a confirmed diagnosis; it is assistance for the attending clinician.',
    })).trim() || '{}';
    const note = JSON.parse(raw);
    if (!note.regionalSummary && note.hindiSummary) note.regionalSummary = note.hindiSummary;
    res.json({ note, source: 'ai' });
  } catch (err: any) {
    console.error('[/api/ai/summarize] Error:', err?.message || err);
    res.status(500).json({ error: 'Clinical summarization failed' });
  }
});

router.post('/api/ai/analyze', async (req, res) => {
  try {
    const { transcript, language, currentStep } = req.body;
    if (!aiConfigured()) {
      return res.status(503).json({ error: 'AI not configured.', code: 'AI_NOT_CONFIGURED' });
    }
    const prompt = `You are a medical NLP parser at an OPD Kiosk triage station in India.
Current step: ${currentStep}. Language: ${language}.
Patient transcript: "${transcript}"
Extract clinical attributes according to the SOCRATES framework and determine if red-flag triage criteria are met.
Return JSON:
{
  "extractedSummary": string,
  "detectedAttributes": {
    "site": string | null,
    "onset": string | null,
    "character": string | null,
    "radiation": string | null,
    "associations": string[],
    "timing": string | null,
    "exacerbating": string | null,
    "relieving": string | null,
    "severity": number | null
  },
  "isRedFlagCandidate": boolean,
  "redFlagReason": string | null
}`;

    const raw = (await aiText({ prompt, modelKind: 'fast', json: true })).trim() || '{}';
    res.json({ success: true, extracted: JSON.parse(raw), source: 'ai' });
  } catch (err: any) {
    console.error('[/api/ai/analyze] Error:', err?.message || err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

router.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!aiConfigured()) {
      return res.status(503).json({ error: 'AI not configured.', code: 'AI_NOT_CONFIGURED' });
    }
    const reply = (await aiChat({
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages?.message || '') }],
      modelKind: 'fast',
    })).trim();
    res.json({ reply, source: 'ai' });
  } catch (err: any) {
    console.error('[/api/ai/chat] Error:', err?.message || err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

router.post('/api/ai/vision', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt: userPrompt } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
    if (!aiConfigured()) {
      return res.status(503).json({ error: 'AI not configured.', code: 'AI_NOT_CONFIGURED' });
    }
    const validation = validateImage(imageBase64, mimeType);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid image' });
    }
    const raw = (await aiVision({
      imageBase64: validation.base64!,
      mimeType: validation.mimeType,
      prompt: userPrompt || 'Extract all visible text and structured data from this image. Return only JSON.',
      json: true,
    })).trim() || '{}';
    res.json({ success: true, data: JSON.parse(raw), source: 'ai-vision' });
  } catch (err: any) {
    console.error('[/api/ai/vision] Error:', err?.message || err);
    res.status(500).json({ error: 'Vision processing failed' });
  }
});



export default router;
