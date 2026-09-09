/**
 * @file routes/prescriptions.ts
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
router.post('/api/prescriptions', async (req, res) => {
  try {
    const {
      encounterId = 'ENC-DEFAULT',
      patientId = 'PAT-DEFAULT',
      prescribedBy = 'Dr. Priya Sharma (MD)',
      doctorDepartment = 'General & AYUSH OPD',
      medications = [],
      instructions = '',
    } = req.body;

    const id = `RX-${Date.now()}`;
    const prescriptionRecord = {
      id,
      encounterId,
      patientId,
      prescribedBy,
      doctorDepartment,
      medications: Array.isArray(medications) ? medications : [],
      instructions: instructions || 'Take medications strictly as directed with warm water after meals.',
      issuedAt: new Date().toISOString(),
    };

    inMemoryPrescriptions.unshift(prescriptionRecord);

    try {
      await executeQuery(
        `INSERT INTO prescriptions
         (id, encounter_id, patient_id, prescribed_by, doctor_department, medications_json, instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          encounterId,
          patientId,
          prescribedBy,
          doctorDepartment,
          JSON.stringify(prescriptionRecord.medications),
          prescriptionRecord.instructions,
        ]
      );
    } catch (dbErr: any) {
      console.warn('[Prescriptions] DB insert fallback to memory:', dbErr?.message);
    }

    res.json({ success: true, prescription: prescriptionRecord });
  } catch (err: any) {
    console.error('Save prescription error:', err);
    res.status(500).json({ error: 'Failed to save prescription', detail: err.message });
  }
});

router.get('/api/prescriptions/patient/:patientId', async (req, res) => {
  const { patientId } = req.params;
  const list = inMemoryPrescriptions.filter(p => !patientId || patientId === 'all' || p.patientId === patientId);
  res.json(list);
});

router.get('/api/prescriptions/encounter/:encounterId', async (req, res) => {
  const { encounterId } = req.params;
  const found = inMemoryPrescriptions.find(p => p.encounterId === encounterId);
  res.json(found || null);
});



export default router;
