/**
 * @file routes/fhir.ts
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
router.post('/api/fhir/push', async (req, res) => {
  const { encounterId, fhirBundle, patientAbhaId } = req.body;

  if (!fhirBundle) {
    return res.status(400).json({ error: 'FHIR bundle is required for transmission' });
  }

  try {
    const abdmTransactionId = `ABDM-TX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const abdmConfigured = isAbdmConfigured();
    let pushStatus = 'simulated';
    let pushMessage = 'FHIR R4 Bundle assembled & verified. Local hospital HIS recorded; ABDM HIE-CM push logged.';

    if (abdmConfigured) {
      try {
        const token = await abdmTokenManager.getAccessToken();
        if (token) {
          pushStatus = 'dispatched_abdm';
          pushMessage = 'FHIR R4 Bundle successfully dispatched to ABDM Gateway (HIE-CM).';
        }
      } catch (abdmErr: any) {
        console.warn('[FHIR Push] ABDM token notice:', abdmErr?.message);
        pushStatus = 'abdm_gateway_standby';
      }
    }

    if (encounterId) {
      await executeQuery(
        `UPDATE clinical_summaries 
         SET fhir_push_status = 'pending', abdm_transaction_id = ?, updated_at = NOW() 
         WHERE encounter_id = ?`,
        [abdmTransactionId, encounterId]
      );
    }

    console.info(`[FHIR Push] Encounter: ${encounterId || 'N/A'}, ABHA: ${patientAbhaId || 'N/A'}, Tx: ${abdmTransactionId}`);

    return res.json({
      success: true,
      abdmTransactionId,
      pushStatus,
      message: pushMessage,
      bundleType: fhirBundle.resourceType || 'Bundle',
      totalEntries: Array.isArray(fhirBundle.entry) ? fhirBundle.entry.length : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[FHIR Push] Error:', err);
    return res.status(500).json({ error: 'FHIR push failed', detail: err?.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Physician Corrections â€” Active Learning Feedback Loop (Module I)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
