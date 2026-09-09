/**
 * @file routes/admin.ts
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
router.get('/api/admin/users', requireRole('admin'), async (_req, res) => {
  const { rows, fromDb } = await executeQuery(
    'SELECT id, username, role, full_name, employee_id, department, phone, email, is_active, created_at FROM users ORDER BY created_at DESC'
  );

  if (fromDb && rows.length > 0) {
    return res.json(rows);
  }

  res.json([
    { id: 'usr-admin-001', username: 'admin', role: 'admin', full_name: 'System Administrator', employee_id: 'EMP-001', department: 'IT Administration', is_active: 1 },
    { id: 'usr-doc-001', username: 'doctor1', role: 'doctor', full_name: 'Dr. Priya Sharma (MD)', employee_id: 'DOC-001', department: 'General Medicine', is_active: 1 },
    { id: 'usr-staff-001', username: 'staff1', role: 'staff', full_name: 'Sister Anita Rao (Staff Nurse)', employee_id: 'STF-001', department: 'Triage & OPD', is_active: 1 }
  ]);
});

router.post('/api/admin/users', requireRole('admin'), async (req, res) => {
  const { username, password, role, fullName, employeeId, department, phone, email } = req.body;
  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Missing required user fields' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;

    await executeQuery(
      `INSERT INTO users (id, username, password_hash, role, full_name, employee_id, department, phone, email, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, username.trim(), passwordHash, role, fullName.trim(), employeeId || null, department || null, phone || null, email || null]
    );

    res.json({ success: true, id: userId, message: 'User created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create user', detail: err.message });
  }
});

router.patch('/api/admin/users/:id', requireRole('admin'), async (req, res) => {
  const userId = req.params.id;
  const { role, fullName, department, isActive, password } = req.body;

  try {
    let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [];

    if (role) { sql += ', role = ?'; params.push(role); }
    if (fullName) { sql += ', full_name = ?'; params.push(fullName); }
    if (department) { sql += ', department = ?'; params.push(department); }
    if (typeof isActive === 'boolean') { sql += ', is_active = ?'; params.push(isActive ? 1 : 0); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sql += ', password_hash = ?';
      params.push(hash);
    }

    sql += ' WHERE id = ?';
    params.push(userId);

    await executeQuery(sql, params);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user', detail: err.message });
  }
});

router.delete('/api/admin/users/:id', requireRole('admin'), async (req, res) => {
  const userId = req.params.id;
  try {
    await executeQuery('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
    res.json({ success: true, message: 'User deactivated' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to deactivate user', detail: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin: System Health Dashboard
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/api/admin/system-health', requireRole('admin'), async (_req, res) => {
  const startDb = Date.now();
  const dbCheck = await executeQuery('SELECT COUNT(*) as total_patients FROM patients');
  const dbLatency = Date.now() - startDb;

  const startKiosk = Date.now();
  const kioskCheck = await executeQuery('SELECT * FROM kiosk_stations WHERE is_active = 1 LIMIT 1');
  const kioskLatency = Date.now() - startKiosk;

  const aiAvailable = aiConfigured();
  const sarvamAvailable = isSarvamConfigured();

  const healthData = {
    timestamp: new Date().toISOString(),
    overallStatus: dbCheck.fromDb ? 'HEALTHY' : 'DEGRADED',
    services: [
      {
        name: 'MySQL Database Server',
        status: dbCheck.fromDb ? 'UP' : 'DOWN',
        latencyMs: dbLatency,
        detail: dbCheck.fromDb ? 'Connected on localhost:3306 (medikiosk db)' : 'Operating on in-memory fallback store',
      },
      {
        name: 'Sarvam AI (Speech / Translation / Chat)',
        status: sarvamAvailable ? 'UP' : 'CONFIG_REQUIRED',
        latencyMs: 120,
        detail: sarvamAvailable
          ? 'API key configured — Saaras v4 STT, Bulbul v3 TTS, Mayura Translate, Sarvam-105B Chat'
          : 'SARVAM_API_KEY environment variable pending — falling back to Groq',
      },
      {
        name: 'AI / Groq Engine',
        status: aiAvailable ? 'UP' : 'CONFIG_REQUIRED',
        latencyMs: 120,
        detail: aiAvailable ? 'Groq fallback configured for text/vision' : 'GROQ_API_KEY environment variable pending',
      },
      {
        name: 'Kiosk Station Hardware Interface',
        status: 'UP',
        latencyMs: kioskLatency,
        detail: kioskCheck.rows[0]?.station_name || 'Station #K-04 (PS 26047)',
      },
      {
        name: 'ABDM M2/M3 National Health Gateway',
        status: 'SANDBOX_READY',
        latencyMs: 180,
        detail: 'ABHA OTP simulation & FHIR milestone 2/3 bundle serialization active',
      },
      {
        name: 'Document Digitization OCR Pipeline',
        status: 'UP',
        latencyMs: 95,
        detail: 'Tesseract & Gemini Vision fallback ready',
      },
    ],
  };

  res.json(healthData);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin: Comprehensive Analytics
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/api/admin/analytics', requireRole('admin'), async (_req, res) => {
  const { rows: tokenRows } = await executeQuery(
    `SELECT priority_level, status, COUNT(*) as count 
     FROM queue_tokens 
     GROUP BY priority_level, status`
  );

  const { rows: complaintRows } = await executeQuery(
    `SELECT chief_complaint_text, COUNT(*) as count 
     FROM encounters 
     GROUP BY chief_complaint_text 
     ORDER BY count DESC 
     LIMIT 5`
  );

  const { rows: totalPatients } = await executeQuery(
    `SELECT COUNT(*) as total FROM patients`
  );

  const { rows: totalEncounters } = await executeQuery(
    `SELECT COUNT(*) as total FROM encounters`
  );

  res.json({
    totalPatients: totalPatients[0]?.total || 0,
    totalEncounters: totalEncounters[0]?.total || 0,
    tokensBreakdown: tokenRows,
    topComplaints: complaintRows,
    averageWaitMinutes: 14,
    kioskEfficiencyScore: '98.4%',
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Clinical Measurements & Vitals
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
