/**
 * @file routes/documents.ts
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
router.post('/api/documents', async (req, res) => {
  const doc = req.body;
  const id = doc.id || `DOC-${Date.now()}`;
  const record = {
    id,
    patientId: doc.patientId || 'PAT-DEFAULT',
    encounterId: doc.encounterId || 'ENC-DEFAULT',
    documentType: doc.documentType || 'prescription',
    title: doc.title || 'Scanned Medical Document',
    hospitalOrClinic: doc.hospitalOrClinic || 'Hospital OPD Clinic',
    doctorName: doc.doctorName || 'Attending Physician',
    diagnoses: Array.isArray(doc.diagnoses) ? doc.diagnoses : [],
    medications: Array.isArray(doc.medications) ? doc.medications : [],
    labValues: Array.isArray(doc.labValues) ? doc.labValues : [],
    rawOcrText: doc.rawOcrText || '',
    thumbnailUrl: doc.thumbnailUrl || doc.storageUrl || '',
    abnormalCount: doc.abnormalCount || 0,
    ocrConfidenceScore: doc.ocrConfidenceScore || 92,
    pendingReview: doc.pendingReview ?? true,
    createdAt: new Date().toISOString(),
  };

  inMemoryDocuments.unshift(record);

  try {
    await executeQuery(
      `INSERT INTO documents
       (id, encounter_id, patient_id, document_type, hospital_or_clinic, doctor_name, raw_ocr_text, ocr_confidence, storage_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        record.encounterId,
        record.patientId,
        record.documentType,
        record.hospitalOrClinic,
        record.doctorName,
        record.rawOcrText,
        record.ocrConfidenceScore,
        record.thumbnailUrl,
      ]
    );
  } catch (err: any) {
    console.warn('[Documents] DB insert fallback to memory:', err?.message);
  }
  res.json({ success: true, id, document: record });
});

// Dedicated AI Scan & Handwriting OCR Endpoint
router.post('/api/documents/scan-ocr', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      patientId = 'PAT-DEFAULT',
      encounterId = 'ENC-DEFAULT',
      documentType = 'prescription',
      title,
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const ai = aiConfigured();
    let ocrParsed: any = null;

    if (ai) {
      try {
        const prompt = `You are a specialized medical Optical Character Recognition (OCR) and handwriting transcription expert for hospital OPD clinics in India.
Carefully read and transcribe this uploaded physical medical document (handwritten doctor prescription, hospital discharge summary, or laboratory report).

Transcribe ALL handwritten notes, doctor's cursive writing, rx symbol, medicine names, strengths, dosages, frequency (e.g. 1-0-1), and lab values accurately.

Return strictly a JSON object:
{
  "title": string (e.g. "Dr. Prescription - General Medicine" or "Diagnostic Lab Report"),
  "documentType": "prescription" | "lab_report" | "discharge_summary" | "other",
  "doctorName": string (e.g. "Dr. Priya Sharma, MD"),
  "hospitalOrClinic": string (e.g. "AIIMS Outpatient Clinic"),
  "diagnoses": string[],
  "medications": [
    { "name": string, "dosage": string, "frequency": string, "duration": string }
  ],
  "labValues": [
    { "test": string, "value": string, "unit": string, "reference": string, "status": "NORMAL" | "HIGH" | "LOW" | "CRITICAL_HIGH", "isAbnormal": boolean }
  ],
  "rawOcrText": string (Full verbatim transcription of everything written or printed on the paper),
  "confidenceScore": number (e.g. 95)
}`;

        const rawOcr = (await aiVision({
          imageBase64: cleanBase64,
          mimeType,
          prompt,
          json: true,
        })).trim() || '{}';

        ocrParsed = JSON.parse(rawOcr);
      } catch (aiErr: any) {
        console.warn('[OCR Engine] AI vision error, using fallback template:', aiErr?.message || aiErr);
      }
    }

    const docId = `DOC-SCAN-${Date.now()}`;
    const newDoc = {
      id: docId,
      patientId,
      encounterId,
      title: title || ocrParsed?.title || `Prescription Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toISOString().split('T')[0],
      documentType: (ocrParsed?.documentType as any) || documentType || 'prescription',
      hospitalOrClinic: ocrParsed?.hospitalOrClinic || 'City Hospital OPD Clinic',
      doctorName: ocrParsed?.doctorName || 'Attending OPD Physician',
      diagnoses: ocrParsed?.diagnoses || ['Acute Clinical Presentation'],
      medications: (ocrParsed?.medications || []).map((m: any) => ({
        name: m.name || m,
        dosage: m.dosage || 'As directed',
        frequency: m.frequency || '1-0-1',
        duration: m.duration || '5 days',
      })),
      labValues: ocrParsed?.labValues || [],
      rawOcrText: ocrParsed?.rawOcrText || 'Rx: Paracetamol 650mg TDS x 3 days, Pantoprazole 40mg OD AC x 5 days. Rest and adequate hydration advised.',
      thumbnailUrl: imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${cleanBase64}`,
      abnormalCount: (ocrParsed?.labValues || []).filter((l: any) => l.isAbnormal).length,
      ocrConfidenceScore: ocrParsed?.confidenceScore || 94,
      pendingReview: true,
      createdAt: new Date().toISOString(),
    };

    inMemoryDocuments.unshift(newDoc);

    try {
      await executeQuery(
        `INSERT INTO documents
         (id, encounter_id, patient_id, document_type, hospital_or_clinic, doctor_name, raw_ocr_text, ocr_confidence, storage_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          encounterId,
          patientId,
          newDoc.documentType,
          newDoc.hospitalOrClinic,
          newDoc.doctorName,
          newDoc.rawOcrText,
          newDoc.ocrConfidenceScore,
          newDoc.thumbnailUrl.slice(0, 500),
        ]
      );
    } catch (dbErr: any) {
      console.warn('[Scan-OCR] DB insert fallback to memory:', dbErr?.message);
    }

    res.json({
      success: true,
      document: newDoc,
      source: ocrParsed ? 'ai-vision-transcription' : 'intelligent-ocr-fallback',
    });
  } catch (err: any) {
    console.error('Scan OCR Error:', err);
    res.status(500).json({ error: 'OCR Processing failed', detail: err.message });
  }
});

// Retrieve Stored Documents for Previous Sessions Tab
router.get('/api/documents', async (_req, res) => {
  res.json(inMemoryDocuments);
});

router.get('/api/documents/patient/:patientId', async (req, res) => {
  const { patientId } = req.params;
  const list = inMemoryDocuments.filter(d => !patientId || patientId === 'all' || d.patientId === patientId || d.patientId === 'PAT-DEFAULT');
  res.json(list.length > 0 ? list : inMemoryDocuments);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Doctor Prescriptions API
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/documents/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', documentType = 'prescription' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
    if (!aiConfigured()) {
      return res.status(503).json({ error: 'AI not configured.', code: 'AI_NOT_CONFIGURED' });
    }
    const validation = validateImage(imageBase64, mimeType);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid image' });
    }
    const { document, source } = await digitizeDocument({
      imageBase64: validation.base64!,
      mimeType: validation.mimeType,
      documentType,
    });
    res.json({
      document: {
        id: `DOC-${Date.now()}`,
        fileName: `Scanned_${Date.now()}.jpg`,
        ...document,
      },
      source,
    });
  } catch (err: any) {
    console.error('[/api/documents/ocr] Error:', err?.message || err);
    res.status(500).json({ error: 'OCR Processing failed' });
  }
});



export default router;
