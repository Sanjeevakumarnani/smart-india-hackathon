/**
 * @file routes/auth.ts
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
router.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const { rows, fromDb } = await executeQuery(
      'SELECT * FROM users WHERE (username = ? OR employee_id = ?) AND is_active = 1 LIMIT 1',
      [username.trim(), username.trim()]
    );

    let userRecord = rows[0];

    // Hardcoded kiosk admin credential (admin/admin) — demo only, disabled in production
    if (process.env.NODE_ENV !== 'production' && username === 'admin' && password === 'admin') {
      userRecord = {
        id: 'usr-admin-001',
        username: 'admin',
        role: 'admin',
        full_name: 'System Administrator',
        employee_id: 'EMP-001',
        department: 'IT Administration',
      };
    }

    // Fallback users for local resilience (disabled in production — real accounts only)
    if (!userRecord && !fromDb && process.env.NODE_ENV !== 'production') {
      if (username === 'admin' && password === 'Admin@123') {
        userRecord = {
          id: 'usr-admin-001',
          username: 'admin',
          role: 'admin',
          full_name: 'System Administrator',
          employee_id: 'EMP-001',
          department: 'IT Administration',
        };
      } else if (username === 'doctor1' && password === 'Doctor@123') {
        userRecord = {
          id: 'usr-doc-001',
          username: 'doctor1',
          role: 'doctor',
          full_name: 'Dr. Priya Sharma (MD)',
          employee_id: 'DOC-001',
          department: 'General Medicine',
        };
      } else if (username === 'staff1' && password === 'Staff@123') {
        userRecord = {
          id: 'usr-staff-001',
          username: 'staff1',
          role: 'staff',
          full_name: 'Sister Anita Rao (Staff Nurse)',
          employee_id: 'STF-001',
          department: 'Triage & OPD',
        };
      }
    }

    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (userRecord.password_hash) {
      const isMatch = await bcrypt.compare(password, userRecord.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    }

    const tokenPayload = {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      fullName: userRecord.full_name,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    // Record session
    try {
      await executeQuery(
        `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 12 HOUR))`,
        [`SES-${Date.now()}`, userRecord.id, token.slice(-16), req.ip || '127.0.0.1']
      );
    } catch {
      // Non-blocking
    }

    res.json({
      success: true,
      token,
      user: {
        id: userRecord.id,
        username: userRecord.username,
        role: userRecord.role,
        fullName: userRecord.full_name,
        employeeId: userRecord.employee_id,
        department: userRecord.department,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication service error', detail: err.message });
  }
});

router.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

router.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin: User & Role Management
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
