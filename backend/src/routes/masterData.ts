/**
 * @file routes/masterData.ts
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
router.get('/api/kiosk/config', async (_req, res) => {
  const { rows, fromDb } = await executeQuery(
    'SELECT * FROM kiosk_stations WHERE is_active = 1 LIMIT 1'
  );
  if (fromDb && rows.length > 0) {
    return res.json(rows[0]);
  }
  res.json(inMemoryDb.kioskStations[0]);
});

const ALLOWED_LANGUAGE_CODES = ['en', 'te', 'ta', 'kn', 'ml', 'mr'];

router.get('/api/languages', async (_req, res) => {
  const { rows, fromDb } = await executeQuery(
    "SELECT * FROM supported_languages WHERE is_active = 1 AND code IN ('en', 'te', 'ta', 'kn', 'ml', 'mr') ORDER BY sort_order ASC"
  );
  if (fromDb && rows.length > 0) {
    const filtered = rows.filter((r: any) => ALLOWED_LANGUAGE_CODES.includes(r.code));
    if (filtered.length > 0) {
      return res.json(filtered);
    }
  }
  res.json(inMemoryDb.supportedLanguages);
});

router.get('/api/chief-complaints', async (req, res) => {
  const opdType = req.query.opd_type as string;
  let sql = 'SELECT * FROM chief_complaints WHERE is_active = 1';
  const params: any[] = [];

  if (opdType && (opdType === 'allopathic' || opdType === 'ayurveda')) {
    sql += ' AND (opd_type = ? OR opd_type = "both")';
    params.push(opdType);
  }
  sql += ' ORDER BY sort_order ASC';

  const { rows, fromDb } = await executeQuery(sql, params);
  if (fromDb && rows.length > 0) {
    const hasOther = rows.some((r: any) => r.complaint_key === 'other_disease');
    if (!hasOther) {
      const otherItem = inMemoryDb.chiefComplaints.find((c) => c.complaint_key === 'other_disease');
      if (otherItem) {
        try {
          await executeQuery(
            `INSERT IGNORE INTO chief_complaints 
            (id, complaint_key, display_name_en, display_name_hi, display_name_te, display_name_ta, display_name_kn, display_name_ml, display_name_mr, icon, color_class, opd_type, is_red_flag_trigger, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              otherItem.id, otherItem.complaint_key, otherItem.display_name_en, otherItem.display_name_hi,
              otherItem.display_name_te, otherItem.display_name_ta, otherItem.display_name_kn,
              otherItem.display_name_ml, otherItem.display_name_mr, otherItem.icon,
              otherItem.color_class, otherItem.opd_type, otherItem.is_red_flag_trigger, otherItem.sort_order
            ]
          );
        } catch (_e) {
          // ignore error
        }
        rows.push(otherItem as any);
      }
    }
    return res.json(rows);
  }

  let list = inMemoryDb.chiefComplaints;
  if (opdType) {
    list = list.filter((c) => c.opd_type === opdType || c.opd_type === 'both');
  }
  res.json(list);
});

router.get('/api/ayush/cards', async (_req, res) => {
  const { AYUSH_DASHAVIDHA_CARDS } = await import('../data/mockData');
  res.json(AYUSH_DASHAVIDHA_CARDS);
});

router.get('/api/socrates/questions/:complaintId', async (req, res) => {
  const { SOCRATES_QUESTIONS_MAP } = await import('../data/mockData');
  const complaintId = req.params.complaintId;
  const questions = SOCRATES_QUESTIONS_MAP[complaintId] || SOCRATES_QUESTIONS_MAP['chest_pain'];
  res.json(questions);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Patient Master Registry & Search
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/api/chief-complaints/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { is_active, display_name_en, display_name_te, display_name_ta, display_name_kn, display_name_ml, display_name_mr } = req.body;

  try {
    await executeQuery(
      `UPDATE chief_complaints SET
         is_active = COALESCE(?, is_active),
         display_name_en = COALESCE(?, display_name_en),
         display_name_te = COALESCE(?, display_name_te),
         display_name_ta = COALESCE(?, display_name_ta),
         display_name_kn = COALESCE(?, display_name_kn),
         display_name_ml = COALESCE(?, display_name_ml),
         display_name_mr = COALESCE(?, display_name_mr)
       WHERE id = ? OR complaint_key = ?`,
      [is_active !== undefined ? (is_active ? 1 : 0) : null, display_name_en || null, display_name_te || null, display_name_ta || null, display_name_kn || null, display_name_ml || null, display_name_mr || null, id, id]
    );
  } catch (err) {
    console.warn('DB update complaint warning:', err);
  }

  const memoryItem = inMemoryDb.chiefComplaints.find((c) => c.id === id || c.complaint_key === id);
  if (memoryItem) {
    if (is_active !== undefined) memoryItem.is_active = is_active ? 1 : 0;
    if (display_name_en) memoryItem.display_name_en = display_name_en;
    if (display_name_te) memoryItem.display_name_te = display_name_te;
    if (display_name_ta) memoryItem.display_name_ta = display_name_ta;
    if (display_name_kn) memoryItem.display_name_kn = display_name_kn;
    if (display_name_ml) memoryItem.display_name_ml = display_name_ml;
    if (display_name_mr) memoryItem.display_name_mr = display_name_mr;
  }

  res.json({ success: true, updated: id });
});

router.put('/api/languages/:code', requireRole('admin'), async (req, res) => {
  const { code } = req.params;
  const { is_active } = req.body;

  try {
    await executeQuery(
      `UPDATE supported_languages SET is_active = ? WHERE code = ?`,
      [is_active ? 1 : 0, code]
    );
  } catch (err) {
    console.warn('DB update language warning:', err);
  }

  const memoryItem = inMemoryDb.supportedLanguages.find((l) => l.code === code);
  if (memoryItem) {
    (memoryItem as any).is_active = is_active ? 1 : 0;
  }

  res.json({ success: true, updated: code });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AI Kiosk Chat Assistant
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
