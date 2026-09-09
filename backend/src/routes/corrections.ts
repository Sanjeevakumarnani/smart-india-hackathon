/**
 * @file routes/corrections.ts
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
router.post('/api/corrections', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { encounterId, section, originalValue, correctedValue, notes } = req.body;
  const physicianId = req.user?.id || 'DOC-SESSION';

  if (!encounterId || !section) {
    return res.status(400).json({ error: 'encounterId and section are required' });
  }

  const correctionId = `COR-${Date.now().toString(36).toUpperCase()}`;

  await executeQuery(
    `INSERT INTO physician_corrections (id, encounter_id, physician_id, section, original_value, corrected_value, correction_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [correctionId, encounterId, physicianId, section, originalValue || '', correctedValue || '', notes || '']
  );

  console.info(`[Active Learning] Correction logged: ${physicianId} edited section '${section}' on encounter '${encounterId}'`);
  return res.json({ success: true, correctionId });
});

router.get('/api/corrections/export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'doctor') {
    return res.status(403).json({ error: 'Clinical or Admin authorization required' });
  }

  const { rows } = await executeQuery(
    `SELECT pc.*, u.full_name as physician_name, u.department
     FROM physician_corrections pc
     LEFT JOIN users u ON pc.physician_id = u.id
     ORDER BY pc.corrected_at DESC LIMIT 500`
  );

  return res.json({ success: true, count: rows.length, corrections: rows });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Statutory Consent Ledger â€” DPDP Act 2023 Compliant (Module D)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/feedback/correction', async (req, res) => {
  const correction = req.body;
  try {
    const logPath = path.join(process.cwd(), 'corrections.jsonl');
    try {
      fs.appendFileSync(logPath, JSON.stringify(correction) + '\n');
    } catch (fileErr) {
      console.error('Failed to append corrections.jsonl:', fileErr instanceof Error ? fileErr.message : fileErr);
    }

    await executeQuery(
      `INSERT INTO physician_corrections (id, encounter_id, physician_id, section, original_value, corrected_value, correction_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        correction.id || `COR-${Date.now()}`,
        correction.encounterId || 'ENC-DEFAULT',
        correction.physicianId || 'PHYSICIAN-01',
        correction.section || 'HPI',
        correction.originalValue || '',
        correction.correctedValue || '',
        correction.notes || null,
      ]
    );

    res.json({ status: 'logged', id: correction.id });
  } catch (err) {
    console.error('Failed to log correction:', err);
    res.status(500).json({ error: 'Failed to log' });
  }
});




// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Physician Corrections API
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/physician/corrections', async (req, res) => {
  const { encounterId, physicianId, corrections } = req.body;
  try {
    if (Array.isArray(corrections)) {
      for (const item of corrections) {
        const corrId = `CORR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await executeQuery(
          `INSERT INTO physician_corrections (id, encounter_id, physician_id, section, original_value, corrected_value, correction_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            corrId,
            encounterId || 'ENC-CURRENT',
            physicianId || 'PHYSICIAN-01',
            item.section || 'General',
            item.originalValue || '',
            item.correctedValue || '',
            item.notes || 'Physician edited during console review',
          ]
        );
      }
    }
    res.json({ success: true, count: corrections?.length || 0 });
  } catch (err: any) {
    console.error('Failed to insert corrections:', err);
    res.status(500).json({ error: 'Failed to save physician corrections', detail: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Encounter Sub-Table Persistence Endpoints
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
