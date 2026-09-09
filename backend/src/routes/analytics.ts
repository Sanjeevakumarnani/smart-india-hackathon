/**
 * @file routes/analytics.ts
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
router.get('/api/analytics/aggregate', async (req, res) => {
  const days = parseInt(req.query.days as string || '30', 10);

  try {
    const { rows: complaints } = await executeQuery(
      `SELECT chief_complaint_text, opd_type, COUNT(*) as frequency
       FROM encounters
       WHERE arrival_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND chief_complaint_text IS NOT NULL
       GROUP BY chief_complaint_text, opd_type
       ORDER BY frequency DESC LIMIT 15`,
      [days]
    );

    const { rows: dailyVolume } = await executeQuery(
      `SELECT DATE(arrival_time) as date,
              COUNT(*) as total,
              SUM(CASE WHEN opd_type='ayurveda' THEN 1 ELSE 0 END) as ayush_count,
              SUM(CASE WHEN opd_type='allopathic' THEN 1 ELSE 0 END) as allopathic_count
       FROM encounters
       WHERE arrival_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(arrival_time)
       ORDER BY date ASC`,
      [days]
    );

    const { rows: criticalCount } = await executeQuery(
      `SELECT COUNT(*) as critical_alerts
       FROM queue_tokens
       WHERE priority_level = 'CRITICAL'
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );

    const { rows: langDistribution } = await executeQuery(
      `SELECT language_code, COUNT(*) as patient_count
       FROM encounters
       WHERE arrival_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY language_code`,
      [days]
    );

    return res.json({
      periodDays: days,
      complaintTrends: complaints.length > 0 ? complaints : [
        { chief_complaint_text: 'Chest Pain / Discomfort', opd_type: 'both', frequency: 18 },
        { chief_complaint_text: 'Joint / Knee Pain (Sandhivata)', opd_type: 'ayurveda', frequency: 24 },
        { chief_complaint_text: 'Shortness of Breath', opd_type: 'both', frequency: 12 },
        { chief_complaint_text: 'Indigestion / Constipation (Agni Mandya)', opd_type: 'ayurveda', frequency: 31 },
        { chief_complaint_text: 'Fever & Chills', opd_type: 'allopathic', frequency: 19 },
      ],
      dailyVolume: dailyVolume.length > 0 ? dailyVolume : [
        { date: '2026-09-01', total: 42, ayush_count: 18, allopathic_count: 24 },
        { date: '2026-09-02', total: 56, ayush_count: 25, allopathic_count: 31 },
        { date: '2026-09-03', total: 61, ayush_count: 28, allopathic_count: 33 },
        { date: '2026-09-04', total: 58, ayush_count: 26, allopathic_count: 32 },
        { date: '2026-09-05', total: 72, ayush_count: 34, allopathic_count: 38 },
        { date: '2026-09-06', total: 80, ayush_count: 39, allopathic_count: 41 },
        { date: '2026-09-07', total: 85, ayush_count: 41, allopathic_count: 44 },
      ],
      criticalAlerts: criticalCount[0]?.critical_alerts || 7,
      languages: langDistribution.length > 0 ? langDistribution : [
        { language_code: 'hi', patient_count: 48 },
        { language_code: 'en', patient_count: 35 },
        { language_code: 'te', patient_count: 22 },
        { language_code: 'ta', patient_count: 15 },
        { language_code: 'kn', patient_count: 11 },
        { language_code: 'ml', patient_count: 9 },
        { language_code: 'mr', patient_count: 14 },
      ],
      avgTimeSavingsMinutes: 6.8,
      hospitalDeskCode: 'AIIMS-OPD-K04',
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Analytics Error]:', err);
    res.status(500).json({ error: 'Failed to aggregate analytics', detail: err.message });
  }
});

router.get('/api/analytics/summary', async (_req, res) => {
  try {
    const { rows: encounters } = await executeQuery('SELECT COUNT(*) as total FROM encounters');
    const totalCount = encounters[0]?.total || inMemoryDb.queueTokens.length || 24;
    res.json({
      totalPatients: totalCount,
      avgWait: 12,
      consultTimeSaved: `${(totalCount * 6.8).toFixed(1)} hrs`,
      consultTimeReduction: '65%',
      throughputData: [
        { time: '08:00', patients: 12 },
        { time: '10:00', patients: 28 },
        { time: '12:00', patients: 45 },
        { time: '14:00', patients: 32 },
        { time: '16:00', patients: 18 },
      ],
      timeSavingsData: [
        { day: 'Mon', traditional: 15, medikiosk: 5 },
        { day: 'Tue', traditional: 14, medikiosk: 4.5 },
        { day: 'Wed', traditional: 16, medikiosk: 5 },
        { day: 'Thu', traditional: 15, medikiosk: 4 },
        { day: 'Fri', traditional: 17, medikiosk: 5.5 },
      ],
    });
  } catch {
    res.json({
      totalPatients: 28,
      avgWait: 11,
      consultTimeSaved: '3.2 hrs',
      consultTimeReduction: '65%',
      throughputData: [
        { time: '08:00', patients: 8 },
        { time: '10:00', patients: 22 },
        { time: '12:00', patients: 35 },
      ],
      timeSavingsData: [
        { day: 'Mon', traditional: 15, medikiosk: 5 },
        { day: 'Tue', traditional: 14, medikiosk: 4.5 },
      ],
    });
  }
});

router.get('/api/analytics/complaints', async (_req, res) => {
  res.json([
    { name: 'Chest Pain / Cardiac', value: 25, color: '#f43f5e' },
    { name: 'Respiratory / Asthma', value: 20, color: '#06b6d4' },
    { name: 'Joint Pain (Sandhivata)', value: 30, color: '#f59e0b' },
    { name: 'Digestive / Agni Mandya', value: 15, color: '#10b981' },
    { name: 'General / Fever', value: 10, color: '#6366f1' },
  ]);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Indic ASR Proxy (Bhashini / AI4Bharat Gateway)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
