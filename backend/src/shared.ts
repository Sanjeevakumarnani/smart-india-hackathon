/**
 * @file shared.ts
 * @description Cross-cutting helpers + in-memory fallback store shared between
 * route modules. Extracted (byte-preserved) from the legacy monolithic
 * `server.ts`. These live in module scope so every route module works against
 * the same in-memory arrays when MySQL is unavailable.
 */

import { aiConfigured } from './services/aiService';

// AI provider is configured through the provider-neutral aiService (Groq).
// `getAiClient` is retained as a boolean capability check used by routes that
// degrade to deterministic fallbacks when no AI key is present.
export function getAiClient(): boolean {
  return aiConfigured();
}

// Normalise a persisted clinical_summaries row (SQL) or in-memory record into
// the full ClinicalSummary shape consumed by the PhysicianSummaryConsole.
export function normalizeClinicalSummary(summary: any): Record<string, any> | null {
  if (!summary) return null;

  const parseJson = (value: unknown): any => {
    if (typeof value !== 'string') return value ?? undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  };

  // Prefer the full JSON snapshot persisted by the summary creation route.
  const snapshot = parseJson(summary.summary_json) as
    | (Record<string, any> & { note?: Record<string, any> })
    | undefined;

  const base = snapshot && typeof snapshot === 'object'
    ? (snapshot.note && typeof snapshot.note === 'object' ? snapshot.note : snapshot)
    : {};

  const fullSummary = {
    ...base,
    chiefComplaint: base.chiefComplaint ?? summary.chief_complaint ?? '',
    hpi: base.hpi ?? summary.hpi ?? '',
    provisionalPlan: base.provisionalPlan ?? summary.provisional_plan ?? '',
    regionalSummary: base.regionalSummary ?? base.hindiSummary ?? summary.hpi_hindi ?? '',
    hindiSummary: base.hindiSummary ?? summary.hpi_hindi ?? '',
    pastHistory: base.pastHistory ?? summary.past_history ?? '',
    medications: base.medications ?? summary.medications ?? '',
    allergies: base.allergies ?? summary.allergies ?? '',
    investigationsSummary: base.investigationsSummary ?? summary.investigations_summary ?? '',
    redFlagsIdentified: Array.isArray(base.redFlagsIdentified)
      ? base.redFlagsIdentified
      : Array.isArray(parseJson(summary.red_flags))
        ? parseJson(summary.red_flags)
        : [],
    differentialDiagnosis: Array.isArray(base.differentialDiagnosis)
      ? base.differentialDiagnosis
      : Array.isArray(parseJson(summary.differential_diagnosis))
        ? parseJson(summary.differential_diagnosis)
        : [],
    ayushAssessment: base.ayushAssessment ?? parseJson(summary.ayush_assessment) ?? null,
  };

  // Drop undefined fields so the console falls back to its own presets.
  return Object.fromEntries(Object.entries(fullSummary).filter(([_, v]) => v !== undefined)) as Record<string, any>;
}

// In-Memory Fallback Persistence for Documents & Prescriptions
export const inMemoryDocuments: any[] = [
  {
    id: 'DOC-PREV-101',
    patientId: 'PAT-DEFAULT',
    title: 'Dr. R. K. Mehta - Cardiology Prescription',
    date: '2026-08-15',
    documentType: 'prescription',
    hospitalOrClinic: 'Apex Heart & Chest Institute, Delhi',
    doctorName: 'Dr. R. K. Mehta (MD, DM Cardiology)',
    diagnoses: ['Hypertension Stage 2', 'Atherosclerosis evaluation'],
    medications: [
      { name: 'Telmisartan', dosage: '40mg', frequency: '1-0-0 (Morning)', duration: '30 Days' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: '0-0-1 (Bedtime)', duration: '30 Days' },
      { name: 'Ecosprin', dosage: '75mg', frequency: '0-1-0 (After lunch)', duration: '30 Days' }
    ],
    labValues: [
      { test: 'Serum Cholesterol', value: '235', unit: 'mg/dL', reference: '<200', status: 'HIGH', isAbnormal: true },
      { test: 'Blood Pressure', value: '148/92', unit: 'mmHg', reference: '<120/80', status: 'HIGH', isAbnormal: true }
    ],
    rawOcrText: 'Rx: Telmisartan 40mg OD, Atorvastatin 20mg HS, Ecosprin 75mg OD. BP 148/92 mmHg. Low sodium diet advised.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60',
    abnormalCount: 2,
    ocrConfidenceScore: 96,
    pendingReview: false,
    createdAt: '2026-08-15T10:30:00.000Z'
  },
  {
    id: 'DOC-PREV-102',
    patientId: 'PAT-DEFAULT',
    title: 'Pathology Blood Investigation Report',
    date: '2026-07-20',
    documentType: 'lab_report',
    hospitalOrClinic: 'Metropolis Diagnostics',
    doctorName: 'Dr. S. K. Gupta (Pathologist)',
    diagnoses: ['Pre-Diabetic Glycemic Profile'],
    medications: [],
    labValues: [
      { test: 'HbA1c', value: '6.4', unit: '%', reference: '<5.7', status: 'BORDERLINE_HIGH', isAbnormal: true },
      { test: 'Fasting Plasma Glucose', value: '118', unit: 'mg/dL', reference: '70-100', status: 'HIGH', isAbnormal: true },
      { test: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', reference: '0.7-1.2', status: 'NORMAL', isAbnormal: false }
    ],
    rawOcrText: 'Automated Analyzer Result: HbA1c 6.4%, Fasting Glucose 118 mg/dL, Creatinine 0.9 mg/dL.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=300&auto=format&fit=crop&q=60',
    abnormalCount: 2,
    ocrConfidenceScore: 98,
    pendingReview: false,
    createdAt: '2026-07-20T14:15:00.000Z'
  }
];

export const inMemoryPrescriptions: any[] = [];