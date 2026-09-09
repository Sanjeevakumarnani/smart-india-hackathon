/**
 * @file routes/patients.ts
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
router.get('/api/patients/search', async (req, res) => {
  const rawQuery = (req.query.query as string || '').trim();
  if (!rawQuery) {
    return res.json([]);
  }

  const cleanDigits = rawQuery.replace(/\D/g, '');
  const abhaFormatted = cleanDigits.length === 14
    ? cleanDigits.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4')
    : rawQuery;
  const phone10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
  const phoneE164 = `+91${phone10}`;

  const { rows, fromDb } = await executeQuery(
    `SELECT * FROM patients 
     WHERE abha_id IN (?, ?) 
        OR abha_address = ?
        OR aadhaar_last4 = ? 
        OR phone IN (?, ?, ?, ?)
        OR LOWER(full_name) = LOWER(?)
     LIMIT 5`,
    [rawQuery, abhaFormatted, rawQuery.toLowerCase(), cleanDigits.slice(-4), rawQuery, phone10, phoneE164, cleanDigits, rawQuery]
  );

  if (fromDb && rows.length > 0) {
    return res.json(rows);
  }

  const matches = inMemoryDb.patients.filter((p) => {
    const pAbha = (p.abhaId || p.abha_id || '').replace(/\D/g, '');
    const pPhone = (p.phone || '').replace(/\D/g, '');
    const pAadhaar = (p.aadhaarNumber || p.aadhaar_number || '').replace(/\D/g, '');
    const pAddress = (p.abhaAddress || p.abha_address || '').toLowerCase();
    const pName = (p.fullName || p.full_name || '').toLowerCase();

    return (
      (cleanDigits && (pAbha === cleanDigits || pPhone.endsWith(phone10) || pAadhaar === cleanDigits || pAadhaar.endsWith(cleanDigits.slice(-4)))) ||
      (rawQuery.includes('@') && pAddress === rawQuery.toLowerCase()) ||
      pName === rawQuery.toLowerCase()
    );
  });

  res.json(matches);
});

// Patient portal record bundle.  The path id is checked against the OTP-issued
// portal token, so guessing another patient id cannot disclose their records.
router.get('/api/patients/:patientId/records', authenticatePatientSession, async (req: PatientSessionRequest, res) => {
  const patientId = req.params.patientId;
  if (req.patientSession?.id !== patientId) {
    return res.status(403).json({ error: 'You can only access your own records' });
  }

  const parseJson = (value: unknown, fallback: any = {}) => {
    if (typeof value !== 'string') return value ?? fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  };

  try {
    const [encounterQuery, documentQuery, summaryQuery, vitalsQuery, prescriptionQuery] = await Promise.all([
      executeQuery<any>(
        `SELECT id, opd_type, chief_complaint_text, status, arrival_time, completion_time
         FROM encounters WHERE patient_id = ? ORDER BY arrival_time DESC`, [patientId]),
      executeQuery<any>(
        `SELECT id, encounter_id, document_type, hospital_or_clinic, doctor_name, document_date,
                raw_ocr_text, parsed_data, ocr_confidence, created_at
         FROM documents WHERE patient_id = ? ORDER BY created_at DESC`, [patientId]),
      executeQuery<any>(
        `SELECT cs.* FROM clinical_summaries cs
         INNER JOIN encounters e ON e.id = cs.encounter_id
         WHERE e.patient_id = ? ORDER BY cs.updated_at DESC`, [patientId]),
      executeQuery<any>(
        `SELECT v.* FROM vitals v INNER JOIN encounters e ON e.id = v.encounter_id
         WHERE e.patient_id = ? ORDER BY v.recorded_at DESC`, [patientId]),
      executeQuery<any>(
        `SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY issued_at DESC`, [patientId]),
    ]);

    const encounters = encounterQuery.fromDb
      ? encounterQuery.rows
      : inMemoryDb.encounters.filter((record) => record.patientId === patientId || record.patient_id === patientId);
    const rawDocuments = documentQuery.fromDb
      ? documentQuery.rows
      : inMemoryDb.documents.filter((record) => record.patientId === patientId || record.patient_id === patientId);
    const rawSummaries = summaryQuery.fromDb
      ? summaryQuery.rows
      : inMemoryDb.clinicalSummaries.filter((record) => record.patientId === patientId ||
          encounters.some((encounter) => (encounter.id === record.encounterId || encounter.id === record.encounter_id)));
    const vitals = vitalsQuery.fromDb
      ? vitalsQuery.rows
      : inMemoryDb.vitals.filter((record) => encounters.some((encounter) => encounter.id === record.encounterId));
    const prescriptions = prescriptionQuery.fromDb
      ? prescriptionQuery.rows
      : inMemoryPrescriptions.filter((record) => record.patientId === patientId);

    const documents = rawDocuments.map((document) => {
      const parsed = parseJson(document.parsed_data);
      return {
        ...document,
        title: parsed.title || 'Digitized medical document',
        diagnoses: parsed.diagnoses || [],
        medications: parsed.medications || [],
        labValues: parsed.labValues || [],
      };
    });
    const summaries = rawSummaries.map((summary) => ({
      ...summary,
      summary: parseJson(summary.summary_json, summary),
      differentialDiagnosis: parseJson(summary.differential_diagnosis, []),
      redFlags: parseJson(summary.red_flags, []),
    }));

    return res.json({
      patientId,
      encounters,
      summaries,
      documents,
      prescriptions,
      vitals,
      counts: {
        visits: encounters.length,
        documents: documents.length + summaries.length,
        prescriptions: prescriptions.length,
      },
    });
  } catch (error: any) {
    console.error('[Patient Records] Failed to retrieve records:', error?.message || error);
    return res.status(500).json({ error: 'Unable to retrieve patient records' });
  }
});

router.post('/api/patients', async (req, res) => {
  const patient = req.body;
  // Generate robust collision-free unique patient ID if not provided
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const id = patient.id && patient.id.startsWith('PAT-')
    ? patient.id 
    : `PAT-${Date.now().toString(36).toUpperCase().slice(-4)}${randomSuffix}`;

  const abhaDigits = String(patient.abhaId || '').replace(/\D/g, '').slice(0, 14);
  const abhaId = abhaDigits.length === 14
    ? abhaDigits.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4')
    : (patient.abhaId || null);

  const abhaAddress = patient.abhaAddress ? String(patient.abhaAddress).trim().toLowerCase() : null;
  const aadhaarDigits = String(patient.aadhaarNumber || '').replace(/\D/g, '');
  const aadhaarNumber = aadhaarDigits.length === 12 ? aadhaarDigits : null;
  const aadhaarLast4 = aadhaarNumber ? aadhaarNumber.slice(-4) : (patient.aadhaarLast4 || null);

  const cleanPhone = patient.phone ? String(patient.phone).replace(/\D/g, '').slice(-10) : '';
  const phone = cleanPhone ? `+91${cleanPhone}` : (patient.phone || null);

  const newRecord = {
    id,
    abhaId,
    abhaAddress,
    aadhaarNumber,
    aadhaarLast4,
    fullName: patient.fullName || 'Registered Patient',
    age: parseInt(String(patient.age), 10) || 30,
    gender: patient.gender || 'Other',
    phone,
    city: patient.city || '',
    state: patient.state || '',
    bloodGroup: patient.bloodGroup || 'O+',
  };

  await executeQuery(
    `INSERT INTO patients (id, abha_id, abha_address, aadhaar_hash, aadhaar_last4, full_name, age, gender, phone, city, state, blood_group)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       full_name=VALUES(full_name), 
       age=VALUES(age), 
       gender=VALUES(gender),
       phone=VALUES(phone),
       city=VALUES(city),
       state=VALUES(state),
       blood_group=VALUES(blood_group)`,
    [
      newRecord.id,
      newRecord.abhaId,
      newRecord.abhaAddress,
      newRecord.aadhaarNumber ? createHash('sha256').update(newRecord.aadhaarNumber).digest('hex') : null,
      newRecord.aadhaarLast4,
      newRecord.fullName,
      newRecord.age,
      newRecord.gender,
      newRecord.phone,
      newRecord.city,
      newRecord.state,
      newRecord.bloodGroup,
    ]
  );

  const idx = inMemoryDb.patients.findIndex((p) => p.id === id || (phone && (p.phone === phone || p.phone?.endsWith(cleanPhone))));
  if (idx >= 0) inMemoryDb.patients[idx] = { ...inMemoryDb.patients[idx], ...newRecord };
  else inMemoryDb.patients.unshift(newRecord);

  console.info(`[Patient Registry] Successfully registered/updated patient ${newRecord.id} (${newRecord.fullName})`);
  res.json({ success: true, patient: newRecord });
});

// Unified ABDM/local patient verification and registration workflow.
router.post('/api/patient/verify-and-register', async (req, res) => {
  try {
    const parsed = verifyAndRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid patient verification request',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const result = await verifyAndRegister(parsed.data);
    const httpStatus = result.status === 'REGISTRATION_REQUIRED' ? 202 : 200;
    // A patient portal token is intentionally issued only after OTP verification.
    // It scopes record retrieval to this one patient and expires independently of
    // staff/doctor sessions.
    if (result.status === 'VERIFIED' && result.patient?.id) {
      const portalSessionToken = jwt.sign(
        { id: result.patient.id, scope: 'patient' },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      return res.status(httpStatus).json({ ...result, portalSessionToken });
    }
    return res.status(httpStatus).json(result);

  } catch (error: any) {
    console.error('[Patient Verify] Workflow error:', error?.message || error);

    // OTP expired â€” 410 Gone
    if (error?.name === 'OtpExpiredError') {
      return res.status(410).json({ error: error.message, code: 'OTP_EXPIRED' });
    }

    // ABDM gateway returned a non-2xx response â€” 502 Bad Gateway
    if (error?.name === 'AbdmApiError') {
      return res.status(502).json({
        error: error.message,
        code: 'ABDM_API_ERROR',
        abdmStatus: error.httpStatus,
        abdmBody: error.body,
      });
    }

    // Request timed out â€” 504 Gateway Timeout
    if (error?.name === 'AbortError' || error?.message?.includes('timed out')) {
      return res.status(504).json({ error: 'ABDM request timed out. Please retry.', code: 'ABDM_TIMEOUT' });
    }

    // Validation / input errors (thrown by normalisation helpers) â€” 400
    const inputErrors = ['must contain', 'must be an', 'required for', 'Aadhaar', 'ABHA ID', 'Mobile'];
    if (inputErrors.some((phrase) => error?.message?.includes(phrase))) {
      return res.status(400).json({ error: error.message, code: 'INPUT_ERROR' });
    }

    // Generic fallback â€” 500
    return res.status(500).json({
      error: error?.message || 'Patient verification failed unexpectedly.',
      code: 'PATIENT_VERIFICATION_FAILED',
    });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ABDM QR Code Decoder
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * POST /api/abdm/qr/decode
 * Decodes a base64-encoded ABHA card QR image and returns the normalised
 * demographic payload.  The client can then pass this as `demographicPayload`
 * in a subsequent /api/patient/verify-and-register call.
 */


export default router;
