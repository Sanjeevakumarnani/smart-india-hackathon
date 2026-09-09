/**
 * @file routes/gemini.ts
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
router.post('/api/gemini/summarize', async (req, res) => {
  try {
    const { historyObject, documents, patientProfile, language = 'en' } = req.body;
    const aiEnabled = aiConfigured();

    if (!aiEnabled) {
      const isAyush = historyObject.opdType === 'ayurveda';
      const socrates = historyObject.socrates || {};
      const redFlags = historyObject.redFlags || [];
      const chiefComplaint = historyObject.chiefComplaint || 'Clinical Consultation';

      const hpiParts: string[] = [];
      if (socrates.character) hpiParts.push(`Character: ${socrates.character}`);
      if (socrates.site) hpiParts.push(`Site: ${socrates.site}`);
      if (socrates.onset) hpiParts.push(`Onset: ${socrates.onset}`);
      if (socrates.radiation) hpiParts.push(`Radiation: ${socrates.radiation}`);
      if (socrates.timing) hpiParts.push(`Timing: ${socrates.timing}`);
      if (socrates.associations?.length) hpiParts.push(`Associated: ${socrates.associations.join(', ')}`);
      if (socrates.severity) hpiParts.push(`Pain: ${socrates.severity}/10`);

      const regionalSummaries: Record<string, string> = {
        te: `à°°à±‹à°—à°¿ ${chiefComplaint} à°²à°•à±à°·à°£à°¾à°²à°¤à±‹ à°¹à°¾à°œà°°à°¯à±à°¯à°¾à°°à±. à°¤à°¦à±à°ªà°°à°¿ à°•à±à°²à°¿à°¨à°¿à°•à°²à± à°ªà°°à±€à°•à±à°· à°®à°°à°¿à°¯à± à°¡à°¾à°•à±à°Ÿà°°à± à°¸à°‚à°ªà±à°°à°¦à°¿à°‚à°ªà±à°²à± à°…à°µà°¸à°°à°‚.`,
        ta: `à®¨à¯‹à®¯à®¾à®³à®¿ ${chiefComplaint} à®…à®±à®¿à®•à¯à®±à®¿à®•à®³à¯à®Ÿà®©à¯ à®µà®¨à¯à®¤à¯à®³à¯à®³à®¾à®°à¯. à®®à®°à¯à®¤à¯à®¤à¯à®µà®°à¯ à®ªà®°à®¿à®šà¯‹à®¤à®©à¯ˆ à®®à®±à¯à®±à¯à®®à¯ à®†à®²à¯‹à®šà®©à¯ˆ à®¤à¯‡à®µà¯ˆ.`,
        kn: `à²°à³‹à²—à²¿à²¯à³ ${chiefComplaint} à²²à²•à³à²·à²£à²—à²³à³Šà²‚à²¦à²¿à²—à³† à²¬à²‚à²¦à²¿à²¦à³à²¦à²¾à²°à³†. à²¹à³†à²šà³à²šà²¿à²¨ à²µà³ˆà²¦à³à²¯à²•à³€à²¯ à²ªà²°à³€à²•à³à²·à³† à²®à²¤à³à²¤à³ à²¸à²®à²¾à²²à³‹à²šà²¨à³† à²…à²—à²¤à³à²¯à²µà²¿à²¦à³†.`,
        ml: `à´°àµ‹à´—à´¿ ${chiefComplaint} à´²à´•àµà´·à´£à´™àµà´™à´³àµ‹à´Ÿàµ† à´¹à´¾à´œà´°à´¾à´¯à´¿. à´¤àµà´Ÿàµ¼ à´ªà´°à´¿à´¶àµ‹à´§à´¨à´¯àµà´‚ à´¡àµ‹à´•àµà´Ÿàµ¼ à´•àµºà´¸àµ¾à´Ÿàµà´Ÿàµ‡à´·à´¨àµà´‚ à´†à´µà´¶àµà´¯à´®à´¾à´£àµ.`,
        mr: `à¤°à¥à¤—à¥à¤£ ${chiefComplaint} à¤²à¤•à¥à¤·à¤£à¤¾à¤‚à¤¸à¤¹ à¤‰à¤ªà¤¸à¥à¤¥à¤¿à¤¤ à¤à¤¾à¤²à¤¾ à¤†à¤¹à¥‡. à¤ªà¥à¤¢à¥€à¤² à¤µà¥ˆà¤¦à¥à¤¯à¤•à¥€à¤¯ à¤¤à¤ªà¤¾à¤¸à¤£à¥€ à¤†à¤£à¤¿ à¤¡à¥‰à¤•à¥à¤Ÿà¤° à¤¸à¤²à¥à¤²à¤¾ à¤†à¤µà¤¶à¥à¤¯à¤• à¤†à¤¹à¥‡.`,
        hi: `à¤°à¥‹à¤—à¥€ ${chiefComplaint} à¤•à¥‡ à¤²à¤•à¥à¤·à¤£à¥‹à¤‚ à¤•à¥‡ à¤¸à¤¾à¤¥ à¤‰à¤ªà¤¸à¥à¤¥à¤¿à¤¤ à¤¹à¥à¤† à¤¹à¥ˆà¥¤ à¤†à¤—à¥‡ à¤•à¥€ à¤µà¤¿à¤¸à¥à¤¤à¥ƒà¤¤ à¤šà¤¿à¤•à¤¿à¤¤à¥à¤¸à¥€à¤¯ à¤œà¤¾à¤‚à¤š à¤”à¤° à¤¡à¥‰à¤•à¥à¤Ÿà¤° à¤ªà¤°à¤¾à¤®à¤°à¥à¤¶ à¤•à¥€ à¤†à¤µà¤¶à¥à¤¯à¤•à¤¤à¤¾ à¤¹à¥ˆà¥¤`,
        en: `Patient presents with symptoms of ${chiefComplaint}. Clinical examination and attending physician consultation advised.`,
      };
      let regionalSummary = regionalSummaries[language] || regionalSummaries.en;

      // Live Sarvam translation when configured (best-effort; keep the static
      // regional string if the gateway is unavailable).
      if (isSarvamConfigured() && language !== 'en') {
        try {
          const translated = await sarvamTranslate({
            input: regionalSummaries.en || regionalSummary,
            sourceLanguageCode: 'en-IN',
            targetLanguageCode: languageCodeToSarvam(language),
          });
          if (translated.translatedText) {
            regionalSummary = translated.translatedText;
          }
        } catch (translateErr: any) {
          console.warn('[Summarize] Sarvam regional translation unavailable, using static string:', translateErr?.message);
        }
      }

      const fallbackNote = {
        chiefComplaint: chiefComplaint,
        hpi: hpiParts.length > 0 ? `Patient presents with ${chiefComplaint}. ${hpiParts.join('. ')}.` : `Patient presents for clinical evaluation regarding ${chiefComplaint}.`,
        pastHistory: patientProfile?.medicalHistory?.length ? patientProfile.medicalHistory.join(', ') : 'None documented during kiosk intake.',
        medications: patientProfile?.currentMedications?.length ? patientProfile.currentMedications.join(', ') : 'None reported.',
        allergies: patientProfile?.allergies?.length ? patientProfile.allergies.join(', ') : 'No known drug allergies reported.',
        ayushAssessment: isAyush ? {
          prakriti: historyObject.ayush?.prakriti || 'Constitutional evaluation noted',
          agni: historyObject.ayush?.agni || 'Not specified',
          koshtha: historyObject.ayush?.koshtha || 'Not specified',
          aharaVihara: historyObject.ayush?.aharaVihara || 'Not recorded',
          doshaImbalance: historyObject.ayush?.dominantDosha ? `${historyObject.ayush.dominantDosha} Imbalance` : 'Dosha evaluation pending',
          chikitsaGuidance: 'Ayurvedic physician clinical assessment advised.'
        } : null,
        investigationsSummary: documents && documents.length > 0
          ? documents.map((d: any) => `${d.title || d.fileName}: ${d.labValues?.length ? d.labValues.map((l: any) => `${l.test} ${l.value} ${l.unit}`).join(', ') : 'Record attached'}`).join(' | ')
          : 'No historical lab investigations uploaded.',
        redFlagsIdentified: redFlags,
        differentialDiagnosis: redFlags.length > 0
          ? [chiefComplaint + ' (Evaluation required)', 'Secondary symptomatic etiology']
          : [chiefComplaint, 'Benign presentation'],
        provisionalPlan: isAyush
          ? 'Complete Dashavidha examination. Prescribe Shamana/Shodhana chikitsa. Provide Pathya-Apathya guidance.'
          : 'Detailed clinical assessment. Review 12-lead ECG and basic biochemical profile if pain persists.',
        regionalSummary: regionalSummary,
        hindiSummary: regionalSummary
      };

      return res.json({ note: fallbackNote, source: 'deterministic_fallback' });
    }

    const prompt = `You are an expert Chief Medical Officer and AI Scribe at an OPD Kiosk.
Synthesize the structured triage data below into an EHR clinical summary conforming to standard SOAP format.
Patient Intake Data:
- Chief Complaint: ${historyObject.chiefComplaint || 'Not specified'}
- OPD Type: ${historyObject.opdType}
- SOCRATES Pain Profile: ${JSON.stringify(historyObject.socrates || {})}
- Red Flags: ${JSON.stringify(historyObject.redFlags || [])}
- Patient Profile: ${JSON.stringify(patientProfile || {})}
- AYUSH Pariksha: ${JSON.stringify(historyObject.ayush || {})}
- Digitized Historical Documents: ${JSON.stringify(documents || [])}
- Patient Selected Language: ${language}

Return a valid JSON object matching this schema:
{
  "chiefComplaint": string,
  "hpi": string,
  "pastHistory": string,
  "medications": string,
  "allergies": string,
  "ayushAssessment": {
    "prakriti": string,
    "agni": string,
    "koshtha": string,
    "aharaVihara": string,
    "doshaImbalance": string,
    "chikitsaGuidance": string
  } | null,
  "investigationsSummary": string,
  "redFlagsIdentified": string[],
  "differentialDiagnosis": string[],
  "provisionalPlan": string,
  "regionalSummary": string (2-3 sentences concise patient summary written in the requested language: ${language}),
  "hindiSummary": string
}
Return only JSON.`;

    const raw = (await aiText({
      prompt,
      modelKind: 'reasoning',
      json: true,
      system: 'You are an expert medical AI scribe. Never present the output as a confirmed diagnosis; it is assistance for the attending clinician.',
    })).trim() || '{}';
    const note = JSON.parse(raw);
    if (!note.regionalSummary && note.hindiSummary) {
      note.regionalSummary = note.hindiSummary;
    }
    res.json({ note, source: 'ai' });
  } catch (err: any) {
    console.error('AI Summarize Error:', err?.message || err);
    res.status(500).json({ error: 'Clinical summarization failed' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Multimodal Document OCR
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/gemini/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const ai = aiConfigured();

    if (!ai) {
      return res.json({
        document: {
          id: `DOC-${Date.now()}`,
          fileName: 'Scanned_Prescription.jpg',
          documentType: 'prescription',
          date: new Date().toISOString().split('T')[0],
          doctorName: 'Dr. A. K. Sharma, MD',
          hospitalOrClinic: 'Civil Hospital OPD',
          diagnoses: ['Acute Dyspepsia', 'Borderline Hypertension'],
          medications: ['Tab Pantoprazole 40mg OD (ante-cibum)', 'Tab Ecosprin 75mg OD'],
          labValues: [{ test: 'Blood Pressure', value: '142/88', unit: 'mmHg', status: 'ELEVATED' }],
          ayushCorrelation: 'Pitta Vriddhi / Amlapitta',
          rawOcrText: 'Rx: Pantoprazole 40mg, Ecosprin 75mg. BP 142/88. Follow up in 7 days.',
          confidenceScore: 0.94,
        },
        source: 'fallback_ocr',
      });
    }

    const validation = validateImage(imageBase64, mimeType);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid image' });
    }

    const prompt = `You are a medical OCR specialist. Analyze this uploaded medical document (prescription, discharge summary, or lab report).
Extract the structured clinical information into this JSON schema:
{
  "documentType": "prescription" | "lab_report" | "discharge_summary" | "other",
  "date": "YYYY-MM-DD" or null,
  "doctorName": string or null,
  "hospitalOrClinic": string or null,
  "diagnoses": string[],
  "medications": string[],
  "labValues": [{ "test": string, "value": string, "unit": string, "status": "NORMAL" | "HIGH" | "LOW" | "CRITICAL" }],
  "ayushCorrelation": string or null,
  "rawOcrText": string,
  "confidenceScore": number
}
Do NOT invent data not visible in the image. Set unclear fields to null.
Return only JSON.`;

    const raw = (await aiVision({
      imageBase64: validation.base64 || cleanBase64,
      mimeType: validation.mimeType || mimeType,
      prompt,
      json: true,
    })).trim() || '{}';

    const documentData = JSON.parse(raw);
    res.json({
      document: {
        id: `DOC-${Date.now()}`,
        fileName: `Scanned_${Date.now()}.jpg`,
        ...documentData,
      },
      source: 'ai-vision',
    });
  } catch (err: any) {
    console.error('OCR Error:', err?.message || err);
    res.status(500).json({ error: 'OCR Processing failed' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Conversational NLP Parser
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/gemini/nlp-parser', async (req, res) => {
  try {
    const { transcript, language, currentStep } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'transcript required' });
    }

    const ai = aiConfigured();
    if (!ai) {
      const lower = transcript.toLowerCase();
      let extracted: any = { extractedSummary: transcript, detectedAttributes: {}, isRedFlagCandidate: false };
      if (lower.includes('chest') || lower.includes('pain') || lower.includes('chhati') || lower.includes('dard')) {
        extracted.detectedAttributes.site = 'Retrosternal chest';
        extracted.detectedAttributes.character = 'Compressive / pressure sensation';
        extracted.detectedAttributes.severity = 8;
        extracted.isRedFlagCandidate = true;
        extracted.redFlagReason = 'Severe retrosternal discomfort';
      }
      return res.json({ success: true, extracted, source: 'fallback-nlp' });
    }

    const prompt = `You are a medical NLP parser at an OPD Kiosk triage station in India.
Current step: ${currentStep}. Language: ${language}.
Patient transcript: "${transcript}"
Extract clinical attributes according to SOCRATES framework and determine if red-flag triage criteria are met.
Return JSON:
{
  "extractedSummary": string,
  "detectedAttributes": {
    "site": string | null,
    "onset": string | null,
    "character": string | null,
    "radiation": string | null,
    "associations": string[],
    "timing": string | null,
    "exacerbating": string | null,
    "relieving": string | null,
    "severity": number | null
  },
  "isRedFlagCandidate": boolean,
  "redFlagReason": string | null
}`;

    const parsed = JSON.parse((await aiText({
      prompt,
      modelKind: 'fast',
      json: true,
    })).trim() || '{}');
    return res.json({ success: true, extracted: parsed, source: 'ai-nlp' });
  } catch (error: any) {
    console.error('Error in NLP parser:', error);
    res.status(500).json({ error: error.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Dynamic Adaptive Clinical Conversation Engine
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/gemini/drug-interaction', async (req, res) => {
  const { medications } = req.body;
  if (!medications || !Array.isArray(medications)) {
    return res.status(400).json({ error: 'medications array required' });
  }
  try {
    if (!aiConfigured()) {
      return res.json({ interactions: [], source: 'fallback_no_api_key' });
    }
    const prompt = `You are a clinical pharmacist. Analyze these medications for dangerous drug-drug interactions: ${medications.join(', ')}. 
Return a JSON array: [{ "drug1": string, "drug2": string, "severity": "CONTRAINDICATED"|"CAUTION"|"MONITOR", "description": string }].
If no interactions found, return []. Return only valid JSON.`;

    const raw = (await aiText({
      prompt,
      modelKind: 'fast',
      json: true,
    })).trim() || '[]';
    const interactions = JSON.parse(raw);
    res.json({ interactions, source: 'ai' });
  } catch (err: any) {
    console.error('Drug interaction error:', err?.message || err);
    res.json({ interactions: [], source: 'error_fallback' });
  }
});



export default router;
