/**
 * @file routes/qr.ts
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
router.post('/api/qr/decode', async (req, res) => {
  try {
    const { imageBase64, qrData } = req.body;
    if (qrData) {
      try {
        const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        return res.json({ success: true, type: 'AR_ABHA_JSON', data: parsed, source: 'simulated' });
      } catch {
        return res.status(422).json({ error: 'Invalid QR payload', code: 'QR_DECODE_FAILED' });
      }
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 or qrData required', code: 'MISSING_PAYLOAD' });
    }
    const result = await decodeQrImage(imageBase64);
    if (result.success) return res.json(result);
    return res.status(422).json({
      error: 'Could not read ABHA QR code. Please ensure good lighting and focus, or enter your ABHA number manually.',
      code: 'QR_UNREADABLE',
    });
  } catch (err: any) {
    console.error('[/api/qr/decode] Error:', err?.message || err);
    res.status(422).json({ error: 'Failed to decode ABHA QR', code: 'QR_DECODE_FAILED' });
  }
});

// Alias so the frontend can keep using the ABDM-flavoured path if desired.
router.post('/api/abha/scan', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required', code: 'MISSING_PAYLOAD' });
    }
    const result = await decodeQrImage(imageBase64);
    if (result.success) return res.json({ success: true, type: 'ABHA_QR', payload: result.data, ...result.data });
    return res.status(422).json({
      error: 'Could not read ABHA QR code. Please ensure good lighting and focus.',
      code: 'QR_UNREADABLE',
    });
  } catch (err: any) {
    console.error('[/api/abha/scan] Error:', err?.message || err);
    res.status(422).json({ error: 'Failed to decode ABHA QR', code: 'QR_DECODE_FAILED' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Server Listener & Vite Integration
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
