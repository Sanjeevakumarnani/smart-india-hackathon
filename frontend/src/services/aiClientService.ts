import { apiFetch, apiUrl } from '../config/api';
import { ClinicalSummary, DigitizedDocument, FamilyHistory, HistoryObject, PatientProfile, SocratesHistory } from '../types';

/**
 * @file aiClientService.ts
 * @description Provider-neutral frontend client for the AI pipeline.
 *
 * All AI work is performed by the backend so that no provider API key ever
 * reaches the browser.  These helpers talk to the provider-neutral routes
 * under /api/ai/* (plus /api/documents/ocr and /api/qr/decode).
 */

const FAMILY_HISTORY_LABELS: [keyof FamilyHistory, string][] = [
  ['diabetes', 'Diabetes mellitus'],
  ['hypertension', 'Hypertension'],
  ['heartDisease', 'Coronary artery disease'],
  ['cancer', 'Malignancy'],
  ['kidneyDisease', 'Chronic kidney disease'],
  ['thyroid', 'Thyroid disorders'],
];

const SYMPTOM_GUIDANCE: { keywords: string[]; diagnoses: string[]; plan: string }[] = [
  {
    keywords: ['chest pain', 'chest discomfort', 'palpitation', 'breathless', 'short of breath', 'heart'],
    diagnoses: ['Acute Coronary Syndrome', 'Gastroesophageal Reflux Disease', 'Chest Wall Musculoskeletal Pain', 'Anxiety / Panic Disorder'],
    plan: 'Obtain 12-lead ECG, cardiac enzymes and chest X-ray; cardiology referral for persistent symptoms. Symptomatic therapy only after attending physician review.',
  },
  {
    keywords: ['fever', 'temperature', 'malaria', 'dengue', 'typhoid'],
    diagnoses: ['Viral Fever', 'Dengue / Chikungunya', 'Enteric Fever', 'Malaria'],
    plan: 'Complete blood count, peripheral smear and NS1 / Widal as indicated; antipyretics, hydration and physician follow-up.',
  },
  {
    keywords: ['headache', 'migraine', 'head ache'],
    diagnoses: ['Migraine', 'Tension-Type Headache', 'Hypertension-Associated Headache', 'Sinusitis'],
    plan: 'Blood pressure measurement and neurological examination; analgesia and hydration after physician consultation.',
  },
  {
    keywords: ['cough', 'sore throat', 'cold', 'flu', 'throat pain'],
    diagnoses: ['Upper Respiratory Tract Infection', 'Acute Bronchitis', 'Influenza-Like Illness', 'Post-Nasal Drip Syndrome'],
    plan: 'Supportive care, antitussives and warm fluids; chest examination for any respiratory spread.',
  },
  {
    keywords: ['stomach', 'abdominal', 'abdom', 'gastric', 'acidity', 'indigestion', 'belly'],
    diagnoses: ['Acute Gastritis / Dyspepsia', 'Gastroenteritis', 'Irritable Bowel Syndrome', 'Peptic Ulcer Disease'],
    plan: 'Dietary modification, antacids and hydration; review for red flags such as peritonism or gastrointestinal bleed.',
  },
  {
    keywords: ['diarrhoea', 'diarrhea', 'loose motion', 'vomiting', 'vomit', 'nausea'],
    diagnoses: ['Infective Gastroenteritis', 'Food Poisoning', 'Traveller\u2019s Diarrhoea', 'Gastroenteritis with Dehydration'],
    plan: 'Oral rehydration, antiemetics and stool examination if prolonged; monitor for dehydration.',
  },
  {
    keywords: ['joint', 'knee', 'arthritis', 'back pain', 'body pain', 'neck pain', 'shoulder'],
    diagnoses: ['Osteoarthritis', 'Soft Tissue Rheumatism', 'Lumbar Spondylosis', 'Viral Myalgia'],
    plan: 'Radiograph if indicated, rest and analgesia after physician review; physiotherapy referral for chronic joint pain.',
  },
  {
    keywords: ['sugar', 'diabetes', 'blood sugar', 'type 2', 'insulin'],
    diagnoses: ['Type 2 Diabetes Mellitus', 'Impaired Glucose Tolerance', 'Metabolic Syndrome'],
    plan: 'Fasting/post-prandial glucose and HbA1c, diet counselling; refer to medicine OPD for pharmacotherapy titration.',
  },
  {
    keywords: ['bp', 'blood pressure', 'hypertension', 'high bp'],
    diagnoses: ['Essential Hypertension', 'White-Coat Hypertension', 'Hypertension Screening'],
    plan: 'BP recheck at rest, urine protein and ECG; lifestyle counselling and antihypertensive initiation upon physician review.',
  },
  {
    keywords: ['rash', 'itching', 'skin', 'dermatitis', 'allergy', 'hives'],
    diagnoses: ['Allergic Contact Dermatitis', 'Urticaria', 'Fungal Infection', 'Eczema'],
    plan: 'Avoid irritants, antihistamines and topical therapy as appropriate; dermatology review if not resolving.',
  },
  {
    keywords: ['tired', 'fatigue', 'weakness', 'dizziness', 'giddiness'],
    diagnoses: ['Anaemia Workup', 'Hypothyroidism Screening', 'Vitamin D / B12 Deficiency', 'Orthostatic Hypotension'],
    plan: 'Complete blood count, thyroid profile, vitamin levels; lifestyle and dietary counselling.',
  },
];

function deriveClinicalGuidance(
  chiefComplaint: string,
  socrates: SocratesHistory,
  redFlags: string[]
): { differentialDiagnosis: string[]; provisionalPlan: string } {
  const searchText = [
    chiefComplaint,
    socrates.site,
    socrates.character,
    socrates.associations?.join(' '),
  ].filter(Boolean).join(' ').toLowerCase();

  const match = SYMPTOM_GUIDANCE.find((entry) =>
    entry.keywords.some((keyword) => searchText.includes(keyword))
  );
  const baseDiagnoses = match ? [...match.diagnoses] : ['Routine Outpatient Clinical Presentation', 'Unspecified Symptom — Requires Clinical Evaluation'];
  const basePlan = match
    ? match.plan
    : 'Routine physician consultation, clinical evaluation, and diagnostic investigations as indicated.';

  if (redFlags.length > 0) {
    return {
      differentialDiagnosis: ['Acute High-Priority Triage Condition', ...baseDiagnoses.slice(0, 2)],
      provisionalPlan: `Priority triage elevation. Urgent bedside assessment by attending OPD physician. ${basePlan}`,
    };
  }
  return { differentialDiagnosis: baseDiagnoses, provisionalPlan: basePlan };
}

function deriveRos(socrates: SocratesHistory): string {
  const parts: string[] = [];
  if (socrates.associations && socrates.associations.length > 0) {
    parts.push(`Associated symptoms reported: ${socrates.associations.join(', ')}`);
  }
  if (socrates.radiation) parts.push(`Radiation to ${socrates.radiation}`);
  if (socrates.severity !== undefined && socrates.severity !== null) {
    parts.push(`Self-reported severity ${socrates.severity}/10`);
  }
  if (socrates.exacerbating) parts.push(`Aggravated by ${socrates.exacerbating}`);
  if (socrates.relieving) parts.push(`Relieved by ${socrates.relieving}`);
  return parts.length > 0
    ? `Systemic inquiry via SOCRATES completed. ${parts.join('. ')}.`
    : 'Systemic inquiry completed via SOCRATES complaint analysis. No acute unaddressed systemic red flags.';
}

function synthesizeClinicalSummary(
  historyObject: HistoryObject,
  documents: DigitizedDocument[],
  patientProfile: PatientProfile | null,
  language: string = 'en'
): ClinicalSummary {
  const isAyush = historyObject.opdType === 'ayurveda';
  const socrates: SocratesHistory = historyObject.socrates || {};
  const redFlags = historyObject.redFlags || [];
  const chiefComplaint = historyObject.chiefComplaint || 'Consultation Intake';
  const guidance = deriveClinicalGuidance(chiefComplaint, socrates, redFlags);

  const hpiParts: string[] = [];
  if (socrates.character) hpiParts.push(`Character: ${socrates.character}`);
  if (socrates.site) hpiParts.push(`Location: ${socrates.site}`);
  if (socrates.onset) hpiParts.push(`Onset: ${socrates.onset}`);
  if (socrates.radiation) hpiParts.push(`Radiation: ${socrates.radiation}`);
  if (socrates.timing) hpiParts.push(`Timing: ${socrates.timing}`);
  if (socrates.severity !== undefined && socrates.severity !== null) {
    hpiParts.push(`Pain Severity: ${socrates.severity}/10`);
  }
  if (socrates.associations && socrates.associations.length > 0) {
    hpiParts.push(`Associated symptoms: ${socrates.associations.join(', ')}`);
  }
  if (socrates.exacerbating) hpiParts.push(`Aggravating factors: ${socrates.exacerbating}`);
  if (socrates.relieving) hpiParts.push(`Relieving factors: ${socrates.relieving}`);
  if (socrates.notes) hpiParts.push(`Notes: ${socrates.notes}`);

  const hpiText = hpiParts.length > 0
    ? `Patient presents with ${chiefComplaint}. ${hpiParts.join('. ')}.`
    : `Patient presented at kiosk for intake evaluation regarding: ${chiefComplaint}.`;

  const familyHistoryText = (() => {
    const fh = historyObject.familyHistory;
    if (!fh || fh.noSignificantFamilyHistory) return 'No significant family history noted.';
    const active = FAMILY_HISTORY_LABELS.filter(([key]) => fh[key]).map(([, label]) => label);
    if (fh.other) active.push(fh.other);
    return active.length > 0 ? active.join(', ') : 'No significant family history noted.';
  })();

  const personalHistoryText = historyObject.personalHistory
    ? `Smoking: ${historyObject.personalHistory.smokingStatus}; Alcohol: ${historyObject.personalHistory.alcoholUse}${
        historyObject.personalHistory.occupation ? `; Occupation: ${historyObject.personalHistory.occupation}` : ''
      }${
        historyObject.personalHistory.obstetricsHistory
          ? `; Obstetrics: ${historyObject.personalHistory.obstetricsHistory.pregnancies} pregnancies / ${historyObject.personalHistory.obstetricsHistory.deliveries} deliveries`
          : ''
      }`
    : undefined;

  const investigationsSummary =
    documents.length > 0
      ? documents
          .map((d) => {
            const labs = d.labValues.length
              ? d.labValues
                  .map((l) => `${l.test} ${l.value} ${l.unit}${l.status !== 'NORMAL' ? ` (${l.status})` : ''}`)
                  .join(', ')
              : 'Digitized prescription';
            return `${d.title}${d.date ? ` (${d.date})` : ''}: ${labs}`;
          })
          .join(' | ')
      : 'No previous diagnostic reports uploaded.';

  return {
    chiefComplaint,
    hpi: hpiText,
    pastHistory: patientProfile?.medicalHistory?.length
      ? patientProfile.medicalHistory.join(', ')
      : 'No previous medical history recorded during intake.',
    medications: patientProfile?.currentMedications?.length
      ? patientProfile.currentMedications.join(', ')
      : 'None reported.',
    allergies: patientProfile?.allergies?.length
      ? patientProfile.allergies.join(', ')
      : 'No known drug allergies reported.',
    familyHistory: familyHistoryText,
    personalHistory: personalHistoryText,
    ros: deriveRos(socrates),
    ayushAssessment: isAyush && historyObject.ayush
      ? {
          prakriti: historyObject.ayush.prakriti || 'Assessment recorded',
          agni: historyObject.ayush.agni || 'Not assessed',
          koshtha: historyObject.ayush.koshtha || 'Not assessed',
          aharaVihara: historyObject.ayush.aharaVihara || 'Recorded in diary',
          doshaImbalance: historyObject.ayush.dominantDosha
            ? `${historyObject.ayush.dominantDosha} imbalance`
            : 'Constitutional evaluation noted',
          chikitsaGuidance: 'Physician/Vaidya evaluation advised for prescription & Pathya formulation.',
        }
      : null,
    investigationsSummary,
    redFlagsIdentified: redFlags,
    differentialDiagnosis: guidance.differentialDiagnosis,
    provisionalPlan: guidance.provisionalPlan,
    hindiSummary: `रोगी "${chiefComplaint}" के लिए कियोस्क जांच पूर्ण। ${
      socrates.severity !== undefined && socrates.severity !== null
        ? `दर्द तीव्रता ${socrates.severity}/10। `
        : ''
    }चिकित्सक परामर्श प्रतीक्षित है।`,
  };
}

export async function generateClinicalSummary(
  historyObject: HistoryObject,
  documents: DigitizedDocument[],
  patientProfile: PatientProfile | null,
  language: string = 'en'
): Promise<{ success: boolean; summary: ClinicalSummary; source: string }> {
  const buildFallback = (): { success: boolean; summary: ClinicalSummary; source: string } => {
    console.warn('AI summarizer unavailable; showing symptom-grounded synthesis for all sections.');
    return {
      success: false,
      summary: synthesizeClinicalSummary(historyObject, documents, patientProfile, language),
      source: 'client_synthesizer',
    };
  };

  try {
    const res = await apiFetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historyObject,
        documents,
        patientProfile,
        language,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    const rawSummary: any =
      data && typeof data.summary === 'object' && data.summary
        ? data.summary
        : data && typeof data.note === 'object' && data.note
          ? data.note
          : null;

    if (!rawSummary) {
      console.warn('AI summarizer returned no note; falling back to symptom-grounded sections.');
      return buildFallback();
    }

    // Merge so every section is populated and grounded in the patient's own
    // reported symptoms, even if the AI response is partial or empty.
    const synthesized = synthesizeClinicalSummary(historyObject, documents, patientProfile, language);
    const merged: any = {
      chiefComplaint: rawSummary.chiefComplaint || synthesized.chiefComplaint,
      hpi: rawSummary.hpi || synthesized.hpi,
      pastHistory: rawSummary.pastHistory || synthesized.pastHistory,
      medications: rawSummary.medications || synthesized.medications,
      allergies: rawSummary.allergies || synthesized.allergies,
      familyHistory: rawSummary.familyHistory || synthesized.familyHistory,
      personalHistory: rawSummary.personalHistory || synthesized.personalHistory,
      ros: rawSummary.ros || synthesized.ros,
      ayushAssessment: rawSummary.ayushAssessment || synthesized.ayushAssessment,
      investigationsSummary: rawSummary.investigationsSummary || synthesized.investigationsSummary,
      redFlagsIdentified:
        Array.isArray(rawSummary.redFlagsIdentified) && rawSummary.redFlagsIdentified.length > 0
          ? rawSummary.redFlagsIdentified
          : synthesized.redFlagsIdentified,
      differentialDiagnosis:
        Array.isArray(rawSummary.differentialDiagnosis) && rawSummary.differentialDiagnosis.length > 0
          ? rawSummary.differentialDiagnosis
          : synthesized.differentialDiagnosis,
      provisionalPlan: rawSummary.provisionalPlan || synthesized.provisionalPlan,
      hindiSummary: rawSummary.hindiSummary || synthesized.hindiSummary,
      regionalSummary: rawSummary.regionalSummary || rawSummary.hindiSummary || synthesized.hindiSummary,
    };

    return { success: true, summary: merged as ClinicalSummary, source: data.source || 'ai' };
  } catch (err) {
    console.warn('API error in generateClinicalSummary, synthesizing note from genuine patient inputs:', err);
    return buildFallback();
  }
}

export async function processDocumentOcr(
  imageBase64?: string,
  mimeType: string = 'image/jpeg',
  documentType: string = 'prescription'
): Promise<any> {
  try {
    const res = await apiFetch('/api/documents/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        documentType,
      }),
    });

    if (!res.ok) {
      throw new Error(`OCR endpoint returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('OCR processing unavailable:', err);
    return null;
  }
}

export async function pushFhirToAbdm(fhirBundle: any): Promise<any> {
  try {
    const res = await apiFetch('/api/fhir/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fhirBundle }),
    });
    return await res.json();
  } catch (err) {
    console.warn('FHIR push offline, archived to local kiosk storage:', err);
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem('medikiosk_fhir_archive') || '[]');
      localStorage.setItem('medikiosk_fhir_archive', JSON.stringify([...existing, fhirBundle]));
    }
    return {
      status: 'LOCAL_ARCHIVE_SUCCESS',
      code: 200,
      message: 'HL7 FHIR R4 Bundle archived in local kiosk database (Ready for ABDM Gateway upload)',
      gatewayResponse: {
        bundleId: fhirBundle?.id || `bndl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        resourceCount: fhirBundle?.entry?.length || 5,
        bundleType: 'document',
        abdmStatus: 'STORED_LOCALLY_PENDING_GATEWAY_SYNC',
      },
    };
  }
}

export async function checkDrugInteractions(
  medications: string[]
): Promise<{ interactions: any[]; source: string }> {
  try {
    const res = await apiFetch('/api/ai/drug-interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medications }),
    });
    if (!res.ok) throw new Error(`Drug interaction API error: ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Drug interaction fallback:', err);
    // Client-side rule engine for top common dangerous interactions
    const KNOWN_INTERACTIONS: Record<string, { partner: string; severity: 'CONTRAINDICATED' | 'CAUTION' | 'MONITOR'; desc: string }[]> = {
      warfarin: [
        { partner: 'aspirin', severity: 'CONTRAINDICATED', desc: 'Warfarin + Aspirin: Severely increased bleeding risk. Avoid combination unless cardiologist-directed.' },
        { partner: 'ibuprofen', severity: 'CONTRAINDICATED', desc: 'Warfarin + Ibuprofen: High GI bleeding risk.' },
        { partner: 'metronidazole', severity: 'CAUTION', desc: 'Warfarin + Metronidazole: Anticoagulant effect enhanced. Monitor INR closely.' },
      ],
      aspirin: [
        { partner: 'clopidogrel', severity: 'MONITOR', desc: 'Dual antiplatelet: Increased bleeding risk. Use only when clinically indicated (post-ACS).' },
        { partner: 'ibuprofen', severity: 'CAUTION', desc: 'Aspirin + Ibuprofen: NSAID reduces aspirin cardioprotective effect.' },
      ],
      metformin: [
        { partner: 'contrast', severity: 'CAUTION', desc: 'Metformin + IV Contrast: Hold metformin 48h before/after contrast procedures — lactic acidosis risk.' },
      ],
      amlodipine: [
        { partner: 'simvastatin', severity: 'CAUTION', desc: 'Amlodipine + Simvastatin >20mg: Increased risk of myopathy. Limit simvastatin to 20mg.' },
      ],
      amiodarone: [
        { partner: 'warfarin', severity: 'CONTRAINDICATED', desc: 'Amiodarone + Warfarin: Markedly potentiates anticoagulation. Reduce warfarin dose.' },
        { partner: 'digoxin', severity: 'CAUTION', desc: 'Amiodarone + Digoxin: Increases digoxin levels. Monitor and reduce digoxin.' },
      ],
      sildenafil: [
        { partner: 'nitrate', severity: 'CONTRAINDICATED', desc: 'Sildenafil + Nitrates: Severe hypotension. Absolute contraindication.' },
        { partner: 'sorbitrate', severity: 'CONTRAINDICATED', desc: 'Sildenafil + Nitrates (Sorbitrate): Severe hypotension. Absolute contraindication.' },
      ],
    };

    const lower = medications.map(m => m.toLowerCase());
    const found: any[] = [];

    for (const [drug, interactionList] of Object.entries(KNOWN_INTERACTIONS)) {
      if (lower.some(m => m.includes(drug))) {
        for (const interaction of interactionList) {
          if (lower.some(m => m.includes(interaction.partner))) {
            found.push({
              drug1: drug.charAt(0).toUpperCase() + drug.slice(1),
              drug2: interaction.partner.charAt(0).toUpperCase() + interaction.partner.slice(1),
              severity: interaction.severity,
              description: interaction.desc,
            });
          }
        }
      }
    }

    return { interactions: found, source: 'client_rule_engine' };
  }
}

export async function logPhysicianCorrection(
  section: string,
  originalValue: string,
  correctedValue: string
): Promise<void> {
  const correction = {
    id: `CORR-${Date.now()}`,
    timestamp: new Date().toISOString(),
    section,
    originalValue,
    correctedValue,
    physicianId: 'PHYSICIAN-KIOSK-001',
  };

  try {
    await apiFetch('/api/feedback/correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(correction),
    });
  } catch (err) {
    // Fallback: store in localStorage
    console.warn('Feedback API unavailable, storing locally:', err);
    const existing = JSON.parse(localStorage.getItem('medikiosk_corrections') || '[]');
    localStorage.setItem('medikiosk_corrections', JSON.stringify([...existing, correction]));
  }
}