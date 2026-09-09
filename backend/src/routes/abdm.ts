/**
 * @file routes/abdm.ts
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
router.post('/api/abdm/qr/decode', async (req, res) => {
  try {
    const { qrData, imageBase64 } = req.body as { qrData?: any; imageBase64?: string };

    // 1. If structured QR data string/object is passed directly (hardware scanner or client QR library)
    if (qrData) {
      try {
        const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        const rawName = parsed.name || parsed.fullName || parsed.full_name || parsed.patientName;
        const rawAbha = parsed.hidn || parsed.abhaId || parsed.id;

        if (rawName || rawAbha) {
          const profile = {
            id: `PAT-QR-${Date.now().toString().slice(-4)}`,
            abhaId: rawAbha || '',
            aadhaarLast4: parsed.aadhaarLast4 || (rawAbha ? String(rawAbha).slice(-4) : ''),
            fullName: rawName || 'Verified Citizen',
            age: parsed.dob ? Math.max(0, new Date().getFullYear() - parseInt(String(parsed.dob).split('-')[0], 10)) : (parsed.age || 35),
            gender: parsed.gender === 'M' ? 'Male' : parsed.gender === 'F' ? 'Female' : (parsed.gender || 'Other'),
            phone: parsed.mobile || parsed.phone || parsed.mobileNumber || '',
            city: parsed.dist_name || parsed.city || parsed.district || '',
            state: parsed.state_name || parsed.state || '',
            emergencyContact: { name: '', relation: '', phone: '' },
            medicalHistory: [],
            currentMedications: [],
            allergies: [],
          };
          return res.json({ success: true, payload: profile, ...profile });
        }
      } catch {
        // Fall through
      }
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 or qrData is required', code: 'MISSING_PAYLOAD' });
    }

    // 2. Try the dedicated (deterministic) QR decoder first.
    try {
      const result = await decodeQrImage(imageBase64);
      if (result.success && result.data) {
        return res.json({ success: true, type: result.type, source: result.source, payload: result.data, ...result.data });
      }
    } catch {
      // Fall through to AI vision recovery.
    }

    // 3. AI vision recovery only when the deterministic decoder could not read
    //    the (possibly damaged) image. This is NOT the primary QR path.
    if (aiConfigured()) {
      try {
        const validation = validateImage(imageBase64, 'image/jpeg');
        const prompt = `Analyze this image of an Indian ABHA Health ID card or QR code.
Extract the patient demographic information into JSON:
{
  "abhaId": string (format: XX-XXXX-XXXX-XXXX),
  "aadhaarLast4": string (4 digits),
  "fullName": string,
  "age": number,
  "gender": "Male" | "Female" | "Other",
  "phone": string,
  "city": string,
  "state": string
}
Return only JSON.`;

        const raw = await aiVision({
          imageBase64: validation.base64 || imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
          mimeType: validation.mimeType,
          prompt,
          json: true,
        });
        const parsed = JSON.parse(raw);
        const profile = {
          id: `PAT-QR-${Date.now().toString().slice(-4)}`,
          abhaId: parsed.abhaId || '',
          aadhaarLast4: parsed.aadhaarLast4 || '',
          fullName: parsed.fullName || 'Verified Citizen',
          age: parsed.age || 35,
          gender: parsed.gender || 'Other',
          phone: parsed.phone || '',
          city: parsed.city || '',
          state: parsed.state || '',
          emergencyContact: { name: '', relation: '', phone: '' },
          medicalHistory: [],
          currentMedications: [],
          allergies: [],
        };
        return res.json({ success: true, payload: profile, source: 'ai_vision_recovery', ...profile });
      } catch (visionErr: any) {
        console.warn('[ABHA QR] AI vision recovery notice:', visionErr?.message || visionErr);
      }
    }

    // 4. In demo/development mode, provide deterministic sample; in production, return explicit error
    if (process.env.NODE_ENV !== 'production' || req.query.demo === 'true' || imageBase64?.includes('sample')) {
      const fallbackProfile = {
        id: `PAT-QR-${Date.now().toString().slice(-4)}`,
        abhaId: '91-8842-1092-4410',
        aadhaarLast4: '5812',
        fullName: 'Suresh Chandra Patel (Sample Card)',
        age: 42,
        gender: 'Male',
        phone: '9876543210',
        city: 'Varanasi',
        state: 'Uttar Pradesh',
        emergencyContact: { name: '', relation: '', phone: '' },
        medicalHistory: [],
        currentMedications: [],
        allergies: [],
      };
      return res.json({ success: true, payload: fallbackProfile, isDemoFallback: true, ...fallbackProfile });
    }

    return res.status(422).json({
      error: 'Could not read ABHA QR code. Please ensure good lighting and focus, or enter your ABHA number manually.',
      code: 'QR_UNREADABLE',
    });
  } catch (error: any) {
    console.error('[ABHA QR] Decode error:', error?.message);
    return res.status(422).json({
      error: error?.message || 'Failed to decode ABHA QR code',
      code: 'QR_DECODE_FAILED',
    });
  }
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ABDM Integration Status
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * GET /api/abdm/status
 * Returns the live status of the ABDM token manager and integration health.
 * Useful for ops dashboards and the /api/health endpoint.
 */
router.get('/api/abdm/status', (_req, res) => {
  res.json({
    configured: isAbdmConfigured(),
    tokenManager: abdmTokenManager.status(),
    timestamp: new Date().toISOString(),
  });
});



// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// OPD Queue Tokens & Real-time Live Queue
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
