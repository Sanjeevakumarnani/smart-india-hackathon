export type LanguageCode =
  | 'en'
  | 'hi'
  | 'te'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'mr';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  greeting: string;
  audioPrompt: string;
}

export type OpdType = 'allopathic' | 'ayurveda';

export interface PatientProfile {
  id: string;
  abhaId: string;
  abhaAddress?: string;
  aadhaarLast4: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  city: string;
  state: string;
  aadhaarNumber?: string;
  bloodGroup?: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  medicalHistory: string[];
  currentMedications: string[];
  allergies: string[];
  vitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    spO2?: number;
    temperature?: number;
    weight?: number;
    vitalSource?: Record<string, 'device' | 'manual'>;
    capturedAt?: Record<string, string>;
  };
}

export interface ConsentSettings {
  demographics: boolean;
  medicalHistory: boolean;
  documentOcr: boolean;
  abdmLinking: boolean;
  voiceRecording: boolean;
  timestamp: string;
}

export interface SocratesHistory {
  site?: string;
  onset?: string;
  character?: string;
  radiation?: string;
  associations?: string[];
  timing?: string;
  exacerbating?: string;
  relieving?: string;
  severity?: number;
  notes?: string;
}

export type SocratesData = SocratesHistory;

export interface AharaViharaDetails {
  mealTimingRegularity?: 'Regular' | 'Irregular' | 'Very Irregular';
  dominantRasa?: string;
  sleepPattern?: 'Early Bird' | 'Night Owl' | 'Irregular';
  exerciseRoutine?: 'Daily' | 'Weekly' | 'Sedentary';
  waterIntake?: 'Low' | 'Moderate' | 'High';
}

export interface AyushAssessment {
  prakriti?: string;
  vataScore?: number;
  pittaScore?: number;
  kaphaScore?: number;
  agni?: string;
  koshtha?: string;
  aharaVihara?: string;
  aharaViharaDetails?: AharaViharaDetails;
  jihva?: string;
  jihvaImageUrl?: string;
  nadiImageUrl?: string;
  dhatuSara?: string;
  satva?: string;
  dominantDosha?: 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Tridosha';
  doshaImbalance?: string;
  chikitsaGuidance?: string;
  vikriti?: string;
  sara?: string;
  samhanana?: string;
  pramana?: string;
  satmya?: string;
  vyayamaShakti?: string;
  vaya?: string;
}

export interface LabValue {
  test: string;
  value: string;
  unit: string;
  reference: string;
  status: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' | 'BORDERLINE_HIGH';
  isAbnormal: boolean;
}

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  confidenceScore?: number;
}

export interface InteractionResult {
  drug1: string;
  drug2: string;
  severity: 'CONTRAINDICATED' | 'CAUTION' | 'MONITOR';
  description: string;
}

export interface FamilyHistory {
  noSignificantFamilyHistory?: boolean;
  diabetes: boolean;
  hypertension: boolean;
  heartDisease: boolean;
  cancer: boolean;
  kidneyDisease: boolean;
  thyroid: boolean;
  other?: string;
}

export interface PrescriptionMedicationItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface DoctorPrescription {
  id?: string;
  encounterId: string;
  patientId: string;
  prescribedBy: string;
  doctorDepartment?: string;
  medications: PrescriptionMedicationItem[];
  instructions?: string;
  issuedAt?: string;
}

export interface PersonalHistory {
  smokingStatus: 'Non-Smoker' | 'Ex-Smoker' | 'Current Smoker';
  alcoholUse: 'None' | 'Occasional' | 'Regular';
  occupation?: string;
  obstetricsHistory?: {
    pregnancies: number;
    deliveries: number;
    miscarriages: number;
  };
}

export interface DigitizedDocument {
  id: string;
  title: string;
  date: string;
  documentType: 'prescription' | 'lab_report' | 'discharge_summary' | 'imaging';
  hospitalOrClinic: string;
  doctorName: string;
  diagnoses: string[];
  medications: MedicationItem[];
  labValues: LabValue[];
  rawOcrText: string;
  thumbnailUrl?: string;
  abnormalCount: number;
  isSample?: boolean;
  ocrConfidenceScore?: number;
  pendingReview?: boolean;
}

export interface ClinicalSummary {
  chiefComplaint: string;
  hpi: string;
  pastHistory: string;
  medications: string;
  allergies: string;
  familyHistory?: string;
  personalHistory?: string;
  ros?: string;
  ayushAssessment?: {
    prakriti: string;
    agni: string;
    koshtha: string;
    aharaVihara: string;
    doshaImbalance: string;
    chikitsaGuidance: string;
    vikriti?: string;
    sara?: string;
    satva?: string;
    vyayamaShakti?: string;
    vaya?: string;
  } | null;
  investigationsSummary: string;
  redFlagsIdentified: string[];
  differentialDiagnosis: string[];
  provisionalPlan: string;
  hindiSummary: string;
}

export interface HistoryObject {
  opdType: OpdType;
  chiefComplaint: string;
  socrates: SocratesHistory;
  ayush?: AyushAssessment;
  redFlags: string[];
  transcriptLogs: (string | { speaker: 'kiosk' | 'patient'; text: string; time: string })[];
  completedAt?: string;
  familyHistory?: FamilyHistory;
  personalHistory?: PersonalHistory;
}

export interface PhysicianCorrection {
  id: string;
  timestamp: string;
  section: string;
  originalValue: string;
  correctedValue: string;
  physicianId: string;
}

export interface QueueToken {
  tokenId: string;
  encounterId?: string;
  tokenNumber: number;
  abhaId: string;
  patientName: string;
  age: number;
  gender: string;
  opdType: OpdType;
  chiefComplaint: string;
  priorityLevel: 'CRITICAL' | 'URGENT' | 'ROUTINE';
  redFlagReason?: string;
  arrivalTime: string;
  status: 'WAITING' | 'IN_CONSULT' | 'COMPLETED';
  roomNumber: string;
  doctorName: string;
  waitMinutes: number;
  language?: LanguageCode;
}

export type KioskStep =
  | 'LANGUAGE'
  | 'CONSENT'
  | 'IDENTITY'
  | 'VITALS'
  | 'COMPLAINT_SELECT'
  | 'CONVERSATION'
  | 'FAMILY_HISTORY'
  | 'AYUSH_PARIKSHA'
  | 'DOC_SCAN'
  | 'SESSION_PURGE'
  | 'SUMMARY_REVIEW'
  | 'PHYSICIAN_CONSOLE'
  | 'QUEUE_DISPLAY'
  | 'CONTINUITY_WHATSAPP'
  | 'ANALYTICS'
  | 'PATIENT_PORTAL_AUTH'
  | 'PATIENT_PORTAL_DASHBOARD'
  | 'PATIENT_COMPLETE';
