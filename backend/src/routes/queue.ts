/**
 * @file routes/queue.ts
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
router.get('/api/queue', async (_req, res) => {
  const { rows, fromDb } = await executeQuery(
    `SELECT qt.*, e.opd_type, e.chief_complaint_text, p.full_name as patient_name, p.age, p.gender, p.abha_id
     FROM queue_tokens qt
     JOIN encounters e ON qt.encounter_id = e.id
     JOIN patients p ON e.patient_id = p.id
     WHERE qt.status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')
     ORDER BY CASE WHEN qt.priority_level = 'CRITICAL' THEN 1 ELSE 2 END, qt.token_number ASC`
  );

  if (fromDb && rows.length > 0) {
    return res.json(rows);
  }
  res.json(inMemoryDb.queueTokens);
});

router.post('/api/queue/token', async (req, res) => {
  const payload = req.body;
  const encounterId = `ENC-${Date.now().toString().slice(-6)}`;
  const patientId = payload.patientId || `PAT-${Date.now().toString().slice(-6)}`;
  const tokenNumber = inMemoryDb.queueTokens.length + 101;
  const isCritical = payload.priorityLevel === 'CRITICAL';

  const defaultRoom = isCritical
    ? 'Emergency Triage Room 01'
    : payload.opdType === 'ayurveda'
    ? 'AYUSH Room 202'
    : 'OPD Room 104';

  const defaultDoctor = isCritical
    ? 'Dr. Vikram Malhotra (Emergency Triage)'
    : payload.opdType === 'ayurveda'
    ? 'Vaidya R. S. Joshi'
    : 'Dr. Anand Swaroop';

  const tokenRecord = {
    id: `TOK-${Date.now()}`,
    encounterId,
    tokenNumber,
    patientName: payload.patientName || 'Patient',
    age: payload.age || 40,
    gender: payload.gender || 'Other',
    opdType: payload.opdType || 'allopathic',
    chiefComplaint: payload.chiefComplaint || 'Clinical evaluation',
    priorityLevel: isCritical ? 'CRITICAL' : 'ROUTINE',
    redFlagReason: payload.redFlagReason || null,
    roomNumber: defaultRoom,
    doctorName: defaultDoctor,
    waitMinutes: isCritical ? 0 : 15,
    status: 'WAITING',
    createdAt: new Date().toISOString(),
  };

  // Insert encounter & token in database
  await executeQuery(
    `INSERT INTO encounters (id, patient_id, opd_type, chief_complaint_text, status)
     VALUES (?, ?, ?, ?, 'awaiting_doctor')`,
    [encounterId, patientId, payload.opdType || 'allopathic', payload.chiefComplaint || 'Consultation']
  );

  await executeQuery(
    `INSERT INTO queue_tokens (id, encounter_id, token_number, priority_level, is_red_flag, red_flag_reason, room_number, doctor_name, estimated_wait_minutes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING')`,
    [
      tokenRecord.id,
      encounterId,
      tokenNumber,
      tokenRecord.priorityLevel,
      isCritical ? 1 : 0,
      tokenRecord.redFlagReason,
      tokenRecord.roomNumber,
      tokenRecord.doctorName,
      tokenRecord.waitMinutes,
    ]
  );

  if (isCritical) {
    inMemoryDb.queueTokens.unshift(tokenRecord);
  } else {
    inMemoryDb.queueTokens.push(tokenRecord);
  }

  res.json({ success: true, token: tokenRecord });
});

router.patch('/api/queue/:id/call', async (req, res) => {
  const tokenId = req.params.id;
  await executeQuery(
    `UPDATE queue_tokens SET status = 'CALLED', called_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [tokenId]
  );

  const t = inMemoryDb.queueTokens.find((item) => item.id === tokenId);
  if (t) t.status = 'CALLED';
  res.json({ success: true, tokenId, status: 'CALLED' });
});

router.patch('/api/queue/:id/complete', async (req, res) => {
  const tokenId = req.params.id;
  await executeQuery(
    `UPDATE queue_tokens SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [tokenId]
  );

  const t = inMemoryDb.queueTokens.find((item) => item.id === tokenId);
  if (t) t.status = 'COMPLETED';
  res.json({ success: true, tokenId, status: 'COMPLETED' });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Doctor Queue Reprioritization
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch('/api/queue/:id/reprioritize', async (req, res) => {
  const tokenId = req.params.id;
  const { newPosition, priorityLevel, reason, doctorId } = req.body;

  try {
    // 1. Fetch current token
    const { rows: currentRows } = await executeQuery(
      'SELECT * FROM queue_tokens WHERE id = ? LIMIT 1',
      [tokenId]
    );
    const oldPosition = currentRows[0]?.token_number || 0;

    // 2. Update token priority & wait time
    const newPriority = priorityLevel || (newPosition === 1 ? 'CRITICAL' : 'URGENT');
    const newWait = newPosition === 1 ? 0 : 5;

    await executeQuery(
      `UPDATE queue_tokens 
       SET priority_level = ?, 
           is_red_flag = ?, 
           red_flag_reason = COALESCE(?, red_flag_reason),
           estimated_wait_minutes = ?
       WHERE id = ?`,
      [newPriority, newPriority === 'CRITICAL' ? 1 : 0, reason || 'Physician priority override', newWait, tokenId]
    );

    // 3. Log audit event in queue_reprioritizations table
    const reprioId = `REP-${Date.now()}`;
    await executeQuery(
      `INSERT INTO queue_reprioritizations (id, token_id, old_position, new_position, reason, performed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reprioId, tokenId, oldPosition, newPosition || 1, reason || 'Emergency triage override', doctorId || 'DOC-CURRENT']
    );

    // Update in-memory copy if present
    const inMemIdx = inMemoryDb.queueTokens.findIndex((t) => t.id === tokenId);
    if (inMemIdx !== -1) {
      const [item] = inMemoryDb.queueTokens.splice(inMemIdx, 1);
      item.priorityLevel = newPriority as any;
      item.waitMinutes = newWait;
      if (newPosition === 1) {
        inMemoryDb.queueTokens.unshift(item);
      } else {
        inMemoryDb.queueTokens.splice(Math.max(0, (newPosition || 1) - 1), 0, item);
      }
    }

    res.json({
      success: true,
      tokenId,
      newPosition: newPosition || 1,
      priorityLevel: newPriority,
      message: 'Queue reprioritization applied and audited successfully',
    });
  } catch (err: any) {
    console.error('Reprioritization error:', err);
    res.status(500).json({ error: 'Failed to reprioritize patient', detail: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Atomic Encounter Persistence
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
