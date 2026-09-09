/**
 * @file routes/notifications.ts
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
import twilio from 'twilio';
router.post('/api/notifications/whatsapp', async (req, res) => {
  const { phone, message, patientName, tokenNumber, roomNumber } = req.body;
  const targetPhone = phone || '+919876543210';
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (sid && auth && !sid.startsWith('placeholder') && sid.length > 5) {
    try {
      const twilioModule = await import('twilio');
      const client = twilioModule.default(sid, auth);
      const toFormatted = targetPhone.startsWith('whatsapp:') ? targetPhone : `whatsapp:${targetPhone.startsWith('+') ? targetPhone : '+91' + targetPhone.replace(/\D/g, '')}`;
      const sent = await client.messages.create({
        body: message || `Namaste ${patientName || 'Patient'}, your MediKiosk+ OPD Token is #${tokenNumber || '101'}. Please report to ${roomNumber || 'Room 104'}.`,
        from,
        to: toFormatted,
      });
      return res.json({ success: true, sid: sent.sid, status: 'DISPATCHED' });
    } catch (err: any) {
      console.warn('[WhatsApp] Twilio dispatch notice, falling back to simulated:', err?.message);
    }
  }

  // Simulation mode
  console.info(`[WhatsApp Simulated] Dispatched to ${targetPhone}: ${message || 'OPD Token Summary'}`);
  res.json({
    success: true,
    simulated: true,
    message: `WhatsApp notification successfully simulated for ${targetPhone}`,
    dispatchedAt: new Date().toISOString(),
  });
});

router.post('/api/notifications/sms', async (req, res) => {
  const { phone, message } = req.body;
  const targetPhone = phone || '+919876543210';
  res.json({
    success: true,
    simulated: true,
    message: `SMS dispatched successfully to ${targetPhone}`,
    dispatchedAt: new Date().toISOString(),
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Authentication & Staff Access
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
