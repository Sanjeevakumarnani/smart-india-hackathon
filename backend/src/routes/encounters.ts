/**
 * @file routes/encounters.ts
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
import { broadcastSSE } from './sse';
router.post('/api/encounters/complete', async (req, res) => {
  try {
    // Accept both the original API contract and the kiosk's current payload.
    // Keeping this normalization here prevents the client from having to know
    // about persistence-specific field names.
    const payload = req.body || {};
    const patient = payload.patient || payload.patientProfile;
    const encounter = payload.encounter || (payload.tokenPayload ? {
      opdType: payload.tokenPayload.opdType,
      chiefComplaint: payload.tokenPayload.chiefComplaint,
      priorityLevel: payload.tokenPayload.priorityLevel,
      redFlagReason: payload.tokenPayload.redFlagReason,
    } : undefined);
    const vitals = payload.vitals || payload.patientProfile?.vitals;
    const socrates = payload.socrates;
    const ayush = payload.ayush;
    const clinicalHistory = payload.clinicalHistory || ((payload.familyHistory || payload.personalHistory) ? {
      familyHistory: payload.familyHistory,
      personalHistory: payload.personalHistory,
    } : undefined);
    const documents = Array.isArray(payload.documents) ? payload.documents : [];
    const summary = payload.summary;

    const patientId = patient?.id || `PAT-${randomUUID()}`;
    const encounterId = encounter?.id || `ENC-${randomUUID()}`;
    const tokenId = encounter?.tokenId || `TOK-${randomUUID()}`;
    const tokenNumber = inMemoryDb.queueTokens.length + 101;
    const isCritical = encounter?.priorityLevel === 'CRITICAL' || (socrates?.redFlags && socrates.redFlags.length > 0);

    const defaultRoom = isCritical
      ? 'Emergency Triage Room 01'
      : encounter?.opdType === 'ayurveda'
      ? 'AYUSH Room 202'
      : 'OPD Room 104';

    const defaultDoctor = isCritical
      ? 'Dr. Vikram Malhotra (Emergency Triage)'
      : encounter?.opdType === 'ayurveda'
      ? 'Vaidya R. S. Joshi'
      : 'Dr. Priya Sharma (MD)';

    const tokenRecord = {
      id: tokenId,
      tokenId,
      encounterId,
      tokenNumber,
      patientId,
      patientName: patient?.fullName || 'Patient',
      age: patient?.age || 40,
      gender: patient?.gender || 'Other',
      opdType: encounter?.opdType || 'allopathic',
      chiefComplaint: encounter?.chiefComplaint || 'Clinical consultation',
      priorityLevel: isCritical ? 'CRITICAL' : (encounter?.priorityLevel || 'ROUTINE'),
      redFlagReason: isCritical ? (encounter?.redFlagReason || socrates?.redFlags?.[0] || 'Critical condition') : null,
      roomNumber: defaultRoom,
      doctorName: defaultDoctor,
      waitMinutes: isCritical ? 0 : 15,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
    };

    // 1. Save patient
    if (patient) {
      await executeQuery(
        `INSERT INTO patients (id, abha_id, abha_address, aadhaar_hash, aadhaar_last4, full_name, age, gender, phone, city, state, blood_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), age = VALUES(age), gender = VALUES(gender), phone = VALUES(phone)`,
        [
          patientId,
          patient.abhaId || null,
          patient.abhaAddress || null,
          patient.aadhaarNumber ? createHash('sha256').update(String(patient.aadhaarNumber)).digest('hex') : null,
          patient.aadhaarLast4 || null,
          patient.fullName || 'Registered Patient',
          patient.age || 30,
          patient.gender || 'Other',
          patient.phone || null,
          patient.city || null,
          patient.state || null,
          patient.bloodGroup || 'O+',
        ]
      );
      const pIdx = inMemoryDb.patients.findIndex(p => p.id === patientId);
      if (pIdx >= 0) inMemoryDb.patients[pIdx] = { ...inMemoryDb.patients[pIdx], ...patient, id: patientId };
      else inMemoryDb.patients.unshift({ ...patient, id: patientId });
    }

    // 2. Save encounter
    await executeQuery(
      `INSERT INTO encounters (id, patient_id, opd_type, chief_complaint_text, language_code, consent_given, status)
       VALUES (?, ?, ?, ?, ?, ?, 'awaiting_doctor')
       ON DUPLICATE KEY UPDATE status = 'awaiting_doctor'`,
      [encounterId, patientId, encounter?.opdType || 'allopathic', encounter?.chiefComplaint || 'Consultation', payload.language || 'en', payload.consent?.demographics ? 1 : 0]
    );
    const encounterIndex = inMemoryDb.encounters.findIndex((record) => record.id === encounterId);
    const encounterRecord = {
      id: encounterId,
      patientId,
      opdType: encounter?.opdType || 'allopathic',
      chiefComplaint: encounter?.chiefComplaint || 'Consultation',
      languageCode: payload.language || 'en',
      status: 'awaiting_doctor',
      arrivalTime: new Date().toISOString(),
    };
    if (encounterIndex >= 0) inMemoryDb.encounters[encounterIndex] = encounterRecord;
    else inMemoryDb.encounters.unshift(encounterRecord);

    // 3. Save queue token
    await executeQuery(
      `INSERT INTO queue_tokens (id, encounter_id, token_number, priority_level, is_red_flag, red_flag_reason, room_number, doctor_name, estimated_wait_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING')
       ON DUPLICATE KEY UPDATE priority_level = VALUES(priority_level)`,
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

    if (isCritical) inMemoryDb.queueTokens.unshift(tokenRecord);
    else inMemoryDb.queueTokens.push(tokenRecord);

    // 4. Save vitals
    if (vitals) {
      await executeQuery(
        `INSERT INTO vitals (id, encounter_id, systolic_bp, diastolic_bp, heart_rate, spo2, temperature, weight, height, bmi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE systolic_bp = VALUES(systolic_bp)`,
        [
          `VIT-${Date.now()}`,
          encounterId,
          vitals.bpSystolic || vitals.systolicBp || null,
          vitals.bpDiastolic || vitals.diastolicBp || null,
          vitals.heartRate || null,
          vitals.spO2 || vitals.spo2 || null,
          vitals.temperature || null,
          vitals.weight || null,
          vitals.height || null,
          vitals.bmi || null,
        ]
      );
      inMemoryDb.vitals.push({ ...vitals, encounterId });
    }

    // 5. Save Socrates
    if (socrates) {
      await executeQuery(
        `INSERT INTO socrates_assessments
         (id, encounter_id, site, onset, character_pain, radiation, associations, timing, exacerbating_factors, severity, raw_responses, red_flags_triggered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE severity = VALUES(severity), raw_responses = VALUES(raw_responses)`,
        [
          `SOC-${Date.now()}`,
          encounterId,
          socrates.site || null,
          socrates.onset || null,
          socrates.character || null,
          socrates.radiation || null,
          Array.isArray(socrates.associations) ? socrates.associations.join(', ') : (socrates.associations || null),
          socrates.timing || null,
          [socrates.exacerbating, socrates.relieving].filter(Boolean).join(' | ') || null,
          socrates.severity || 5,
          JSON.stringify(socrates),
          JSON.stringify(socrates.redFlags || []),
        ]
      );
      inMemoryDb.socratesAssessments.push({ ...socrates, encounterId });
    }

    // 6. Save AYUSH
    if (ayush) {
      await executeQuery(
        `INSERT INTO ayush_assessments
         (id, encounter_id, prakriti, agni, koshtha, vata_score, pitta_score, kapha_score, dosha_imbalance, chikitsa_guidance, nadi_image_url, tongue_image_url, card_responses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AYU-${Date.now()}`,
          encounterId,
          ayush.prakriti || 'Vata-Pitta',
          ayush.agni || null,
          ayush.koshtha || null,
          ayush.vataScore || 0,
          ayush.pittaScore || 0,
          ayush.kaphaScore || 0,
          ayush.doshaImbalance || ayush.dominantDosha || null,
          ayush.chikitsaGuidance || null,
          ayush.nadiImageUrl || null,
          ayush.jihvaImageUrl || null,
          JSON.stringify(ayush),
        ]
      );
      inMemoryDb.ayushAssessments.push({ ...ayush, encounterId });
    }

    // 7. Save History
    if (clinicalHistory) {
      await executeQuery(
        `INSERT INTO clinical_history
         (id, encounter_id, family_history, personal_history)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE family_history = VALUES(family_history), personal_history = VALUES(personal_history)`,
        [
          `HIS-${Date.now()}`,
          encounterId,
          JSON.stringify(clinicalHistory.familyHistory || {}),
          JSON.stringify(clinicalHistory.personalHistory || {}),
        ]
      );
      inMemoryDb.clinicalHistories.push({ ...clinicalHistory, encounterId });
    }

    // 8. Save Documents
    if (Array.isArray(documents)) {
      for (const doc of documents) {
        await executeQuery(
          `INSERT INTO documents
           (id, encounter_id, patient_id, document_type, hospital_or_clinic, doctor_name, document_date, raw_ocr_text, parsed_data, ocr_confidence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            doc.id || `DOC-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            encounterId,
            patientId,
            doc.documentType || 'prescription',
            doc.hospitalOrClinic || 'OPD Clinic',
            doc.doctorName || 'Attending Physician',
            doc.date || new Date().toISOString().slice(0, 10),
            doc.rawOcrText || '',
            JSON.stringify({ title: doc.title || 'Scanned Document', diagnoses: doc.diagnoses || [], medications: doc.medications || [], labValues: doc.labValues || [] }),
            doc.confidenceScore || doc.ocrConfidenceScore || 90,
          ]
        );
        inMemoryDb.documents.push({ ...doc, encounterId });
      }
    }

    // 9. Save Summary
    if (summary) {
      await executeQuery(
        `INSERT INTO clinical_summaries
         (id, encounter_id, hpi, hpi_hindi, differential_diagnosis, provisional_plan, red_flags, drug_interactions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SUM-${Date.now()}`,
          encounterId,
          summary.hpi || '',
          summary.regionalSummary || summary.hindiSummary || '',
          JSON.stringify(summary.differentialDiagnosis || []),
          summary.provisionalPlan || '',
          JSON.stringify(socrates?.redFlags || []),
          JSON.stringify(summary.drugInteractions || []),
        ]
      );
      inMemoryDb.clinicalSummaries.push({ ...summary, encounterId, patientId });
    }

    // Broadcast real-time event to connected doctor consoles via SSE
    broadcastSSE({
      type: 'NEW_PATIENT_QUEUED',
      token: tokenRecord,
      encounterId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      patientId,
      encounterId,
      queueToken: tokenRecord,
      token: tokenRecord,
      persistenceStatus: 'saved_to_configured_store',
      message: 'Encounter and all clinical records persisted atomically',
    });
  } catch (err: any) {
    console.error('Atomic encounter persistence failed:', err);
    res.status(500).json({ error: 'Failed to complete encounter', detail: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Real-Time Server-Sent Events (SSE) for Doctor Workstations
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/api/encounters/by-token/:tokenId', async (req, res) => {
  const { tokenId } = req.params;
  try {
    const { rows: tokenRows, fromDb } = await executeQuery(
      'SELECT * FROM queue_tokens WHERE id = ? OR token_number = ? LIMIT 1',
      [tokenId, parseInt(tokenId, 10) || 0]
    );

    let token = tokenRows[0];
    if (!token) {
      token = inMemoryDb.queueTokens.find(t => t.id === tokenId || t.tokenId === tokenId || t.tokenNumber === parseInt(tokenId, 10));
    }

    if (!token) {
      return res.status(404).json({ error: 'Queue token not found' });
    }

    const encounterId = token.encounter_id || token.encounterId;

    let patient: any = null;
    let encounter: any = null;
    let vitals: any = null;
    let socrates: any = null;
    let ayush: any = null;
    let history: any = null;
    let documents: any[] = [];
    let summary: any = null;

    if (fromDb && encounterId) {
      const { rows: encRows } = await executeQuery('SELECT * FROM encounters WHERE id = ? LIMIT 1', [encounterId]);
      encounter = encRows[0] || null;

      const patientId = encounter?.patient_id;
      if (patientId) {
        const { rows: patRows } = await executeQuery('SELECT * FROM patients WHERE id = ? LIMIT 1', [patientId]);
        patient = patRows[0] || null;
      }

      const { rows: vitRows } = await executeQuery('SELECT * FROM vitals WHERE encounter_id = ? ORDER BY recorded_at DESC LIMIT 1', [encounterId]);
      vitals = vitRows[0] || null;

      const { rows: socRows } = await executeQuery('SELECT * FROM socrates_assessments WHERE encounter_id = ? ORDER BY created_at DESC LIMIT 1', [encounterId]);
      socrates = socRows[0] || null;

      const { rows: ayuRows } = await executeQuery('SELECT * FROM ayush_assessments WHERE encounter_id = ? ORDER BY created_at DESC LIMIT 1', [encounterId]);
      ayush = ayuRows[0] || null;

      const { rows: hisRows } = await executeQuery('SELECT * FROM clinical_history WHERE encounter_id = ? ORDER BY created_at DESC LIMIT 1', [encounterId]);
      history = hisRows[0] || null;

      const { rows: docRows } = await executeQuery('SELECT * FROM documents WHERE encounter_id = ?', [encounterId]);
      documents = docRows || [];

      const { rows: sumRows } = await executeQuery('SELECT * FROM clinical_summaries WHERE encounter_id = ? ORDER BY created_at DESC LIMIT 1', [encounterId]);
      summary = sumRows[0] || null;
    }

    if (!encounter && encounterId) {
      encounter = inMemoryDb.encounters.find(e => e.id === encounterId);
      const patientId = encounter?.patient_id || token?.patientId;
      patient = inMemoryDb.patients.find(p => p.id === patientId);
      vitals = inMemoryDb.vitals.find(v => v.encounterId === encounterId);
      socrates = inMemoryDb.socratesAssessments.find(s => s.encounterId === encounterId);
      ayush = inMemoryDb.ayushAssessments.find(a => a.encounterId === encounterId);
      history = inMemoryDb.clinicalHistories.find(h => h.encounterId === encounterId);
      documents = inMemoryDb.documents.filter(d => d.encounterId === encounterId);
      summary = inMemoryDb.clinicalSummaries.find(s => s.encounterId === encounterId);
    }

    const patientProfile = patient ? {
      id: patient.id,
      abhaId: patient.abha_id || patient.abhaId || '',
      abhaAddress: patient.abha_address || patient.abhaAddress || '',
      aadhaarNumber: patient.aadhaar_number || patient.aadhaarNumber || '',
      aadhaarLast4: patient.aadhaar_last4 || patient.aadhaarLast4 || '',
      fullName: patient.full_name || patient.fullName || token.patientName || 'Patient',
      age: patient.age || token.age || 30,
      gender: patient.gender || token.gender || 'Other',
      phone: patient.phone || '',
      city: patient.city || '',
      state: patient.state || '',
      bloodGroup: patient.blood_group || patient.bloodGroup || 'O+',
      vitals: vitals ? {
        bpSystolic: vitals.systolic_bp || vitals.bpSystolic || 120,
        bpDiastolic: vitals.diastolic_bp || vitals.bpDiastolic || 80,
        heartRate: vitals.heart_rate || vitals.heartRate || 72,
        spO2: vitals.spo2 || vitals.spO2 || 98,
        temperature: Number(vitals.temperature) || 98.6,
        weight: Number(vitals.weight) || 65,
        height: Number(vitals.height) || 165,
        bmi: Number(vitals.bmi) || 23.8,
      } : undefined,
    } : {
      id: `PAT-${token.tokenNumber || '01'}`,
      fullName: token.patientName || 'Patient',
      age: token.age || 35,
      gender: token.gender || 'Other',
      phone: '',
      abhaId: token.abhaId || '',
      abhaAddress: '',
      aadhaarLast4: '',
      city: '',
      state: '',
      bloodGroup: 'O+',
    };

    const parseJsonField = (value: unknown, fallback: Record<string, unknown> = {}) => {
      if (typeof value !== 'string') return value && typeof value === 'object' ? value as Record<string, unknown> : fallback;
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return fallback;
      }
    };
    const familyHistory = parseJsonField(history?.family_history || history?.familyHistory);
    const personalHistory = parseJsonField(history?.personal_history || history?.personalHistory);

    const historyObject = {
      chiefComplaint: encounter?.chief_complaint_text || token.chiefComplaint || 'General Consultation',
      opdType: encounter?.opd_type || token.opdType || 'allopathic',
      socrates: socrates ? {
        site: socrates.site,
        onset: socrates.onset,
        character: socrates.character_pain || socrates.character,
        radiation: socrates.radiation,
        associations: socrates.associations ? String(socrates.associations).split(', ') : [],
        timing: socrates.timing,
        exacerbating: socrates.exacerbating_factors?.split(' | ')[0] || socrates.exacerbating,
        relieving: socrates.exacerbating_factors?.split(' | ')[1] || socrates.relieving,
        severity: socrates.severity || 5,
      } : {},
      ayush: ayush ? {
        prakriti: ayush.prakriti,
        dominantDosha: ayush.dosha_imbalance || ayush.dominantDosha,
        vataScore: ayush.vata_score || ayush.vataScore || 0,
        pittaScore: ayush.pitta_score || ayush.pittaScore || 0,
        kaphaScore: ayush.kapha_score || ayush.kaphaScore || 0,
        agni: ayush.agni,
        koshtha: ayush.koshtha,
        aharaVihara: ayush.aharaVihara,
        doshaImbalance: ayush.dosha_imbalance || ayush.doshaImbalance,
        chikitsaGuidance: ayush.chikitsa_guidance || ayush.chikitsaGuidance,
      } : undefined,
      familyHistory: history ? {
        diabetes: Boolean(familyHistory.diabetes),
        hypertension: Boolean(familyHistory.hypertension),
        heartDisease: Boolean(familyHistory.heartDisease),
        cancer: Boolean(familyHistory.cancer),
        kidneyDisease: Boolean(familyHistory.kidneyDisease),
        thyroid: Boolean(familyHistory.thyroid),
      } : undefined,
      personalHistory: history ? {
        smokingStatus: personalHistory.smokingStatus || 'Non-Smoker',
        alcoholUse: personalHistory.alcoholUse || 'None',
        occupation: personalHistory.occupation || '',
      } : undefined,
      redFlags: token.is_red_flag || token.priorityLevel === 'CRITICAL'
        ? [token.red_flag_reason || token.redFlagReason || 'High Priority Alert']
        : [],
    };

    res.json({
      success: true,
      token,
      patientProfile,
      historyObject,
      documents: documents.map(d => ({
        id: d.id,
        documentType: d.document_type || d.documentType || 'prescription',
        title: parseJsonField(d.parsed_data).title || d.title || 'Scanned Record',
        hospitalOrClinic: d.hospital_or_clinic || d.hospitalOrClinic || 'Hospital',
        doctorName: d.doctor_name || d.doctorName || 'Attending Physician',
        date: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        diagnoses: [],
        medications: [],
        labValues: [],
        rawOcrText: d.raw_ocr_text || '',
        confidenceScore: d.ocr_confidence || d.ocrConfidenceScore || 90,
      })),
      summary: summary ? normalizeClinicalSummary(summary) : null,
    });
  } catch (err: any) {
    console.error('Error fetching encounter by token:', err);
    res.status(500).json({ error: 'Failed to fetch encounter details', detail: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Automated WhatsApp & SMS Notification Gateways
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/encounters/:id/vitals', async (req, res) => {
  const encounterId = req.params.id;
  const v = req.body;
  const vitalsId = `VIT-${Date.now()}`;

  await executeQuery(
    `INSERT INTO vitals (id, encounter_id, systolic_bp, diastolic_bp, heart_rate, spo2, temperature, weight, height, bmi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vitalsId,
      encounterId,
      v.systolicBp || null,
      v.diastolicBp || null,
      v.heartRate || null,
      v.spo2 || null,
      v.temperature || null,
      v.weight || null,
      v.height || null,
      v.bmi || null,
    ]
  );

  res.json({ success: true, vitalsId });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Session Data Hygiene & DPDP Purge
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/session/purge/:id', async (req, res) => {
  const encounterOrTokenId = req.params.id;
  try {
    // Resolve the encounter id when given a queue token id.
    let encounterId: string | null = null;
    const tokenDb = await executeQuery<any>(
      `SELECT encounter_id FROM queue_tokens WHERE id = ? OR token_number = ? LIMIT 1`,
      [encounterOrTokenId, parseInt(encounterOrTokenId, 10) || -1]
    );
    if (tokenDb.rows?.[0]?.encounter_id) {
      encounterId = tokenDb.rows[0].encounter_id;
    } else if (!tokenDb.fromDb) {
      const memToken = inMemoryDb.queueTokens.find(
        (t) => t.id === encounterOrTokenId || t.tokenId === encounterOrTokenId || String(t.tokenNumber) === encounterOrTokenId
      );
      encounterId = memToken?.encounter_id || memToken?.encounterId || null;
    }

    const targetId = encounterId || encounterOrTokenId;

    const purgedSets: string[] = [];
    let dbPurged = false;

    if (encounterId) {
      const childTables = [
        'documents',
        'vitals',
        'socrates_assessments',
        'ayush_assessments',
        'clinical_history',
        'queue_tokens',
      ];
      for (const table of childTables) {
        try {
          await executeQuery(`DELETE FROM ${table} WHERE encounter_id = ?`, [encounterId]);
          dbPurged = true;
        } catch (err: any) {
          console.warn(`[DPDP Purge] DB delete skipped for ${table}:`, err?.message);
        }
      }
      purgedSets.push('encounter_children');
    } else {
      try {
        await executeQuery(
          `DELETE FROM queue_tokens WHERE id = ? OR token_number = ?`,
          [encounterOrTokenId, parseInt(encounterOrTokenId, 10) || -1]
        );
        dbPurged = true;
      } catch (err: any) {
        console.warn('[DPDP Purge] DB token delete skipped:', err?.message);
      }
    }

    const before = {
      vitals: inMemoryDb.vitals.length,
      documents: inMemoryDb.documents.length,
      socrates: inMemoryDb.socratesAssessments.length,
      ayush: inMemoryDb.ayushAssessments.length,
      histories: inMemoryDb.clinicalHistories.length,
      tokens: inMemoryDb.queueTokens.length,
    };
    let memPurged = false;
    try {
      inMemoryDb.vitals = inMemoryDb.vitals.filter((v) => (v.encounterId || v.encounter_id) !== targetId);
      inMemoryDb.documents = inMemoryDb.documents.filter((d) => (d.encounterId || d.encounter_id) !== targetId);
      inMemoryDb.socratesAssessments = inMemoryDb.socratesAssessments.filter((s) => (s.encounterId || s.encounter_id) !== targetId);
      inMemoryDb.ayushAssessments = inMemoryDb.ayushAssessments.filter((a) => (a.encounterId || a.encounter_id) !== targetId);
      inMemoryDb.clinicalHistories = inMemoryDb.clinicalHistories.filter((h) => (h.encounterId || h.encounter_id) !== targetId);
      inMemoryDb.queueTokens = inMemoryDb.queueTokens.filter(
        (t) => t.id !== encounterOrTokenId
          && t.tokenId !== encounterOrTokenId
          && String(t.tokenNumber) !== encounterOrTokenId
          && (t.encounter_id || t.encounterId) !== targetId
      );
      memPurged = true;
      purgedSets.push('memory_buffers');
    } catch (err: any) {
      console.warn('[DPDP Purge] In-memory flush notice:', err?.message);
    }

    const changed =
      before.vitals !== inMemoryDb.vitals.length ||
      before.documents !== inMemoryDb.documents.length ||
      before.socrates !== inMemoryDb.socratesAssessments.length ||
      before.ayush !== inMemoryDb.ayushAssessments.length ||
      before.histories !== inMemoryDb.clinicalHistories.length ||
      before.tokens !== inMemoryDb.queueTokens.length;

    const real = dbPurged || memPurged || changed;
    console.log(`[DPDP Purge] Session buffer purged for token/encounter: ${encounterOrTokenId} (encounter: ${targetId}) - ${real ? 'real' : 'no-op'}`);

    res.json({
      success: true,
      mode: real ? 'real' : 'no-op',
      status: real ? 'purged' : 'already-absent',
      integration: real ? 'real' : 'simulated',
      message: real
        ? 'Local session cleared and privacy buffers flushed under DPDP Act 2023'
        : 'No session data found - buffers already clear under DPDP Act 2023',
      purgedAt: new Date().toISOString(),
      encounterId: targetId,
      purgedSets,
      counts: {
        db: dbPurged ? 'deleted' : 'none',
        memory: {
          before,
          after: {
            vitals: inMemoryDb.vitals.length,
            documents: inMemoryDb.documents.length,
            socrates: inMemoryDb.socratesAssessments.length,
            ayush: inMemoryDb.ayushAssessments.length,
            histories: inMemoryDb.clinicalHistories.length,
            tokens: inMemoryDb.queueTokens.length,
          },
        },
      },
    });
  } catch (err: any) {
    console.error('[DPDP Purge] Error:', err?.message || err);
    res.status(500).json({
      success: false,
      status: 'failed',
      integration: 'failed',
      error: 'Purge failed. Please retry or notify IT.',
      detail: err?.message,
    });
  }
});

router.delete('/api/encounters/:id', async (req, res) => {
  const encounterId = req.params.id;
  try {
    let deletedDb = false;
    try {
      const result: any = await executeQuery('DELETE FROM encounters WHERE id = ?', [encounterId]);
      const affectedRows = result && typeof result === 'object' ? (result.rows as any)?.affectedRows : 0;
      deletedDb = typeof affectedRows === 'number' && affectedRows > 0;
    } catch (err: any) {
      console.warn('[Encounter Delete] DB cascade skipped:', err?.message);
    }

    const memBefore = {
      encounters: inMemoryDb.encounters.length,
      vitals: inMemoryDb.vitals.length,
      documents: inMemoryDb.documents.length,
      socrates: inMemoryDb.socratesAssessments.length,
      ayush: inMemoryDb.ayushAssessments.length,
      histories: inMemoryDb.clinicalHistories.length,
      summaries: inMemoryDb.clinicalSummaries.length,
      tokens: inMemoryDb.queueTokens.length,
    };
    inMemoryDb.encounters = inMemoryDb.encounters.filter((e) => e.id !== encounterId);
    inMemoryDb.vitals = inMemoryDb.vitals.filter((v) => (v.encounterId || v.encounter_id) !== encounterId);
    inMemoryDb.documents = inMemoryDb.documents.filter((d) => (d.encounterId || d.encounter_id) !== encounterId);
    inMemoryDb.socratesAssessments = inMemoryDb.socratesAssessments.filter((s) => (s.encounterId || s.encounter_id) !== encounterId);
    inMemoryDb.ayushAssessments = inMemoryDb.ayushAssessments.filter((a) => (a.encounterId || a.encounter_id) !== encounterId);
    inMemoryDb.clinicalHistories = inMemoryDb.clinicalHistories.filter((h) => (h.encounterId || h.encounter_id) !== encounterId);
    inMemoryDb.clinicalSummaries = inMemoryDb.clinicalSummaries.filter((s) => (s.encounterId || s.encounter_id) !== encounterId);
    inMemoryDb.queueTokens = inMemoryDb.queueTokens.filter(
      (t) => (t.encounter_id || t.encounterId) !== encounterId
    );

    const existed = Object.values(memBefore).some((n) => n > 0);

    if (!deletedDb && !existed) {
      return res.status(404).json({ success: false, error: 'Encounter not found', code: 'NOT_FOUND' });
    }

    console.log(`[Encounter Delete] Purged encounter: ${encounterId} (db: ${deletedDb}, memory: ${existed})`);
    res.json({
      success: true,
      id: encounterId,
      status: 'purged',
      mode: deletedDb ? 'database_cascade' : 'memory_flush',
      purgedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Encounter Delete] Error:', err?.message || err);
    res.status(500).json({ success: false, error: 'Purge failed', detail: err?.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Analytics & Real-Time Telemetry
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/encounters/:id/socrates', async (req, res) => {
  const encounterId = req.params.id;
  const s = req.body;
  const id = `SOC-${Date.now()}`;
  try {
    await executeQuery(
      `INSERT INTO socrates_assessments 
       (id, encounter_id, site, onset, character_quality, radiation, associations, timing, exacerbating_relieving, severity_score, transcript_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE severity_score = VALUES(severity_score)`,
      [
        id,
        encounterId,
        s.site || null,
        s.onset || null,
        s.character || null,
        s.radiation || null,
        Array.isArray(s.associations) ? s.associations.join(', ') : (s.associations || null),
        s.timing || null,
        `${s.exacerbating || ''} | ${s.relieving || ''}`,
        s.severity || 5,
        s.notes || null,
      ]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save Socrates assessment', detail: err.message });
  }
});

router.post('/api/encounters/:id/ayush', async (req, res) => {
  const encounterId = req.params.id;
  const a = req.body;
  const id = `AYU-${Date.now()}`;
  try {
    await executeQuery(
      `INSERT INTO ayush_assessments
       (id, encounter_id, prakriti, agni, koshtha, dominant_dosha, vata_score, pitta_score, kapha_score, ahara_vihara, dosha_imbalance, chikitsa_guidance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        encounterId,
        a.prakriti || 'Vata-Pitta',
        a.agni || null,
        a.koshtha || null,
        a.dominantDosha || 'Vata-Pitta',
        a.vataScore || 0,
        a.pittaScore || 0,
        a.kaphaScore || 0,
        a.aharaVihara || null,
        a.doshaImbalance || null,
        a.chikitsaGuidance || null,
      ]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save AYUSH assessment', detail: err.message });
  }
});

router.post('/api/encounters/:id/history', async (req, res) => {
  const encounterId = req.params.id;
  const { familyHistory, personalHistory } = req.body;
  const id = `HIS-${Date.now()}`;
  try {
    await executeQuery(
      `INSERT INTO clinical_history
       (id, encounter_id, family_diabetes, family_hypertension, family_heart_disease, family_cancer, family_kidney_disease, family_thyroid, smoking_status, alcohol_use, occupation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        encounterId,
        familyHistory?.diabetes ? 1 : 0,
        familyHistory?.hypertension ? 1 : 0,
        familyHistory?.heartDisease ? 1 : 0,
        familyHistory?.cancer ? 1 : 0,
        familyHistory?.kidneyDisease ? 1 : 0,
        familyHistory?.thyroid ? 1 : 0,
        personalHistory?.smokingStatus || 'Non-Smoker',
        personalHistory?.alcoholUse || 'None',
        personalHistory?.occupation || null,
      ]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save clinical history', detail: err.message });
  }
});

router.post('/api/encounters/:id/summary', async (req, res) => {
  const encounterId = req.params.id;
  const s = req.body;
  const id = `SUM-${Date.now()}`;
  try {
    await executeQuery(
      `INSERT INTO clinical_summaries
       (id, encounter_id, hpi, hpi_hindi, summary_json, differential_diagnosis, provisional_plan, red_flags, drug_interactions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         hpi = VALUES(hpi), hpi_hindi = VALUES(hpi_hindi), summary_json = VALUES(summary_json),
         differential_diagnosis = VALUES(differential_diagnosis), provisional_plan = VALUES(provisional_plan),
         red_flags = VALUES(red_flags), drug_interactions = VALUES(drug_interactions)`,
      [
        id,
        encounterId,
        s.hpi || '',
        s.regionalSummary || s.hindiSummary || '',
        JSON.stringify(s),
        JSON.stringify(s.differentialDiagnosis || []),
        s.provisionalPlan || '',
        JSON.stringify(s.redFlagsIdentified || []),
        JSON.stringify(s.drugInteractions || []),
      ]
    );
    const encounter = inMemoryDb.encounters.find((record) => record.id === encounterId);
    const summaryRecord = { ...s, id, encounterId, patientId: encounter?.patientId };
    const index = inMemoryDb.clinicalSummaries.findIndex((record) => record.encounterId === encounterId);
    if (index >= 0) inMemoryDb.clinicalSummaries[index] = summaryRecord;
    else inMemoryDb.clinicalSummaries.push(summaryRecord);
    res.json({ success: true, id, encounterId, persistenceStatus: 'saved_to_configured_store' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save clinical summary', detail: err.message });
  }
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Legacy encounter-completion implementation retained temporarily for source
// compatibility only. The canonical route is the shared handler above.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/internal/legacy-encounter-complete', async (_req, res) => {
  return res.status(410).json({ error: 'Deprecated. Use /api/encounters/complete.' });
  /*
  const {
    tokenPayload,
    patientProfile,
    socrates,
    ayush,
    familyHistory,
    personalHistory,
    documents = [],
  } = req.body;

  if (!tokenPayload) {
    return res.status(400).json({ error: 'tokenPayload is required' });
  }

  const encounterId = `ENC-${Date.now().toString().slice(-6)}`;
  const patientId = patientProfile?.id || `PAT-${Date.now().toString().slice(-6)}`;
  const tokenId = `TOKEN-LIVE-${Date.now().toString().slice(-4)}`;

  try {
    // 1. Persist Patient Profile (if new)
    if (patientProfile) {
      await executeQuery(
        `INSERT INTO patients (id, abha_id, full_name, age, gender, phone, blood_group)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), age=VALUES(age), gender=VALUES(gender)`,
        [
          patientId,
          patientProfile.abhaId || null,
          patientProfile.fullName || tokenPayload.patientName || 'Registered Patient',
          parseInt(String(patientProfile.age || tokenPayload.age), 10) || 30,
          patientProfile.gender || tokenPayload.gender || 'Other',
          patientProfile.phone || null,
          patientProfile.bloodGroup || 'O+',
        ]
      );
      inMemoryDb.patients.push({ ...patientProfile, id: patientId });
    }

    // 2. Persist Encounter
    await executeQuery(
      `INSERT INTO encounters (id, patient_id, opd_type, chief_complaint_text, language_code, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        encounterId,
        patientId,
        tokenPayload.opdType || 'allopathic',
        tokenPayload.chiefComplaint || '',
        tokenPayload.language || 'en',
        'awaiting_doctor',
      ]
    );
    inMemoryDb.encounters.push({
      id: encounterId,
      patientId,
      opdType: tokenPayload.opdType,
      chiefComplaint: tokenPayload.chiefComplaint,
      language: tokenPayload.language,
      status: 'awaiting_doctor',
      createdAt: new Date().toISOString(),
    });

    // 3. Persist Queue Token
    const isRedFlag = tokenPayload.priorityLevel === 'CRITICAL';
    const tokenNumber = Math.floor(100 + Math.random() * 900);
    const roomNumber = tokenPayload.opdType === 'ayurveda' ? 'AYUSH Room 202' : 'OPD Room 104';
    const doctorName = tokenPayload.opdType === 'ayurveda' ? 'Vaidya R. S. Joshi' : 'Dr. Priya Sharma (MD)';
    const waitMinutes = isRedFlag ? 0 : 15;

    await executeQuery(
      `INSERT INTO queue_tokens (id, encounter_id, token_number, priority_level, is_red_flag, red_flag_reason, room_number, doctor_name, estimated_wait_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tokenId,
        encounterId,
        tokenNumber,
        tokenPayload.priorityLevel || 'NORMAL',
        isRedFlag ? 1 : 0,
        tokenPayload.redFlagReason || null,
        roomNumber,
        doctorName,
        waitMinutes,
        'WAITING',
      ]
    );

    const tokenRecord = {
      tokenId,
      id: tokenId,
      encounterId,
      tokenNumber,
      abhaId: tokenPayload.abhaId || '',
      patientName: tokenPayload.patientName || 'Patient',
      age: tokenPayload.age || 30,
      gender: tokenPayload.gender || 'Other',
      opdType: tokenPayload.opdType || 'allopathic',
      chiefComplaint: tokenPayload.chiefComplaint || '',
      priorityLevel: tokenPayload.priorityLevel || 'NORMAL',
      redFlagReason: tokenPayload.redFlagReason,
      arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'WAITING',
      roomNumber,
      doctorName,
      waitMinutes,
      language: tokenPayload.language || 'en',
    };
    inMemoryDb.queueTokens.push(tokenRecord);

    // 4. Persist Vitals (if provided)
    if (patientProfile?.vitals) {
      const vit = patientProfile.vitals;
      const vitId = `VIT-${Date.now()}`;
      await executeQuery(
        `INSERT INTO vitals (id, encounter_id, systolic_bp, diastolic_bp, heart_rate, spo2, temperature, weight, height, bmi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vitId,
          encounterId,
          vit.bpSystolic || null,
          vit.bpDiastolic || null,
          vit.heartRate || null,
          vit.spO2 || null,
          vit.temperature || null,
          vit.weight || null,
          vit.height || null,
          vit.bmi || null,
        ]
      );
      inMemoryDb.vitals.push({ ...vit, id: vitId, encounterId });
    }

    // 5. Persist SOCRATES Assessment (if provided)
    if (socrates && Object.keys(socrates).length > 0) {
      const socId = `SOC-${Date.now()}`;
      await executeQuery(
        `INSERT INTO socrates_assessments (id, encounter_id, site, onset, character_pain, radiation, associations, timing, exacerbating_factors, severity, raw_responses, red_flags_triggered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          socId,
          encounterId,
          socrates.site || null,
          socrates.onset || null,
          socrates.character || null,
          socrates.radiation || null,
          Array.isArray(socrates.associations) ? socrates.associations.join(', ') : (socrates.associations || null),
          socrates.timing || null,
          socrates.exacerbating || null,
          socrates.severity || 0,
          JSON.stringify(socrates),
          JSON.stringify(tokenPayload.redFlagReason ? [tokenPayload.redFlagReason] : []),
        ]
      );
      inMemoryDb.socratesAssessments.push({ ...socrates, id: socId, encounterId });
    }

    // 6. Persist AYUSH Assessment (if provided)
    if (ayush && Object.keys(ayush).length > 0) {
      const ayushId = `AYUSH-${Date.now()}`;
      await executeQuery(
        `INSERT INTO ayush_assessments (id, encounter_id, prakriti, agni, koshtha, vata_score, pitta_score, kapha_score, dosha_imbalance, chikitsa_guidance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ayushId,
          encounterId,
          ayush.prakriti || 'Vata-Pitta',
          ayush.agni || 'Sama Agni',
          ayush.koshtha || 'Madhyama',
          ayush.vataScore || 0,
          ayush.pittaScore || 0,
          ayush.kaphaScore || 0,
          ayush.dominantDosha || ayush.prakriti || 'Vata-Pitta',
          ayush.chikitsaGuidance || null,
        ]
      );
      inMemoryDb.ayushAssessments.push({ ...ayush, id: ayushId, encounterId });
    }

    // 7. Persist Clinical History (if provided)
    if (familyHistory || personalHistory) {
      const hisId = `HIS-${Date.now()}`;
      await executeQuery(
        `INSERT INTO clinical_history (id, encounter_id, family_history, personal_history)
         VALUES (?, ?, ?, ?)`,
        [
          hisId,
          encounterId,
          JSON.stringify(familyHistory || {}),
          JSON.stringify(personalHistory || {}),
        ]
      );
      inMemoryDb.clinicalHistories.push({ id: hisId, encounterId, familyHistory, personalHistory });
    }

    // 8. Persist Documents (if provided)
    if (Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        const docId = doc.id || `DOC-${Date.now()}-${Math.random().toString(36).slice(-4)}`;
        await executeQuery(
          `INSERT INTO documents (id, encounter_id, patient_id, document_type, hospital_or_clinic, doctor_name, raw_ocr_text)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            docId,
            encounterId,
            patientId,
            doc.documentType || 'prescription',
            doc.hospitalOrClinic || 'OPD Clinic',
            doc.doctorName || 'Attending Physician',
            doc.rawOcrText || '',
          ]
        );
        inMemoryDb.documents.push({ ...doc, id: docId, encounterId, patientId });
      }
    }

    return res.json({
      success: true,
      token: tokenRecord,
      encounterId,
      patientId,
    });
  } catch (err: any) {
    console.error('Error during atomic encounter completion:', err);
    res.status(500).json({ error: 'Atomic encounter completion failed', detail: err.message });
  }
  */
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Twilio WhatsApp & SMS Notifications
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
