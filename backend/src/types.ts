/**
 * @file types.ts
 * @description Minimal type surface shared by backend modules.
 *
 * Only the types that the server-side code actually needs are copied here so
 * the backend can be deployed independently of the React frontend. Keep this
 * file in sync with the corresponding definitions in `frontend/src/types.ts`.
 */

export type LanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  greeting: string;
  audioPrompt: string;
}

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