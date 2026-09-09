/**
 * @file patientVerificationWorkflow.ts
 * @description Unified 3-path Patient Intake & Registration state machine.
 *
 * This module implements the core business logic for Step 2 of the patient
 * registration workflow.  It is intentionally framework-agnostic — call it
 * from any Express handler, a test suite, or a CLI script.
 *
* ────────────────────────────────────────────────────────────────────────────
 * PATH 1 — ABHA ID or QR Code scan
 *   path: 'abha', action: 'lookup' / 'verify'
 *   - Accepts a 14-digit ABHA number, ABHA address (name@abdm), or a JSON
 *     payload decoded from a physical ABHA card QR code.
 *   - Performs an internal DB lookup first.
 *   - If found: returns existing patient record.
 *   - If not found: auto-registers from QR demographic data (if available) or
 *     as a walk-in patient with a generated display name.
 *
 * PATH 2 — Aadhaar
 *   path: 'aadhaar', action: 'verify'
 *   - Accepts any valid 12-digit Aadhaar number.
 *
 * PATH 3 — Mobile Number
 *   path: 'mobile', action: 'verify' / 'register'
 *   - Accepts any valid 10-digit Indian mobile number.
 *
 * Demo mode (ABDM not configured): the OTP verification system is REMOVED for
 * all paths — any valid number/identifier is accepted immediately. Known demo
 * patients are matched against their seeded profile; unknown numbers are
 * auto-registered as walk-in patients so the kiosk flow always proceeds.
 * When ABDM IS configured, the real ABDM OTP gateway flows apply unchanged.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { z } from 'zod';
import { encryptForAbdm } from './abdmCrypto';
import { ABDM_CONFIG, requireAbdmConfiguration, isAbdmConfigured } from './abdmConfig';
import { abdmTokenManager } from './abdmTokenManager';
import { PatientRecord, patientRepository } from '../repositories/patientRepository';

// ─────────────────────────────────────────────
// Custom error types
// ─────────────────────────────────────────────

/**
 * Structured error thrown when the ABDM gateway returns a non-2xx response.
 * Exposes the HTTP status code and the raw ABDM error body for precise error
 * differentiation in the Express handler.
 */
export class AbdmApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'AbdmApiError';
  }
}

/**
 * Structured error thrown when an OTP-related request fails because the transaction has expired.
 * Maps to HTTP 410 Gone at the route layer. (ABDM gateway flows only — the demo
 * OTP system has been removed.)
 */
export class OtpExpiredError extends Error {
  constructor(message = 'OTP has expired. Please request a new one.') {
    super(message);
    this.name = 'OtpExpiredError';
  }
}

// ─────────────────────────────────────────────
// Zod validation schema (exported for the route)
// ─────────────────────────────────────────────

export const verifyAndRegisterSchema = z.object({
  /** Which authentication path to use. */
  path: z.enum(['abha', 'aadhaar', 'mobile']),
  /** The sub-action within the selected path. */
  action: z.enum(['lookup', 'verify', 'send_otp', 'verify_otp', 'register']).default('lookup'),
  /** The primary identifier — ABHA ID/address, Aadhaar number, or mobile number. */
  identifier: z.string().trim().min(1),
  /** Transaction ID returned by the ABDM OTP-send step. */
  txnId: z.string().trim().optional(),
  /** 4–8 digit OTP entered by the user. */
  otp: z.string().regex(/^\d{4,8}$/).optional(),
  /**
   * Raw demographic payload decoded from a QR code scan.
   * Can be either a parsed object or the raw JSON string.
   */
  demographicPayload: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
  /** Manual demographic fields collected from the user. */
  demographics: z
    .object({
      firstName: z.string().trim().min(1).optional(),
      lastName: z.string().trim().min(1).optional(),
      fullName: z.string().trim().min(1).optional(),
      age: z.number().int().min(0).max(130).optional(),
      gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
      dob: z.string().optional(),
      phone: z.string().trim().optional(),
      photoUrl: z.string().optional(),
    })
    .optional(),
});

export type VerifyAndRegisterInput = z.infer<typeof verifyAndRegisterSchema>;

// ─────────────────────────────────────────────
// ABDM API helpers
// ─────────────────────────────────────────────

type AbdmPayload = Record<string, any>;

/**
 * Executes an authenticated POST request to the ABDM gateway.
 *
 * Handles:
 *  - Bearer token injection via `abdmTokenManager`
 *  - Request timeout via `AbortController`
 *  - HTTP error → `AbdmApiError` conversion
 *  - OTP-expiry detection (HTTP 400 with "OTP expired" body)
 *
 * @param path - ABDM API path segment (e.g. "/v3/enrollment/request/otp").
 * @param body - Request body object (will be JSON-serialised).
 */
async function abdmPost(path: string, body: Record<string, unknown>): Promise<AbdmPayload> {
  requireAbdmConfiguration();
  const token = await abdmTokenManager.getAccessToken();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ABDM_CONFIG.timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${ABDM_CONFIG.baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CM-ID': 'sbx',
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`ABDM request to ${path} timed out after ${ABDM_CONFIG.timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const payload: AbdmPayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Detect OTP expiry — ABDM returns 400 with body containing "OTP expired"
    const bodyStr = JSON.stringify(payload).toLowerCase();
    if (
      response.status === 400 &&
      (bodyStr.includes('otp expired') || bodyStr.includes('otp has expired') || bodyStr.includes('txnid expired'))
    ) {
      throw new OtpExpiredError();
    }
    throw new AbdmApiError(
      response.status,
      `ABDM ${path} failed — HTTP ${response.status}: ${payload?.message || payload?.error || response.statusText}`,
      payload
    );
  }

  return payload;
}

// ─────────────────────────────────────────────
// Identifier normalisation helpers
// ─────────────────────────────────────────────

/**
 * Normalises a raw ABHA identifier to the canonical formatted form.
 * Accepts: raw 14-digit string, formatted "XX-XXXX-XXXX-XXXX", or ABHA address.
 */
function normaliseAbhaIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length !== 14) {
    throw new Error('ABHA ID must contain exactly 14 digits or be an ABHA address (e.g. name@abdm)');
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
}

/**
 * Normalises a raw Aadhaar number to a clean 12-digit string.
 */
function normaliseAadhaar(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) {
    throw new Error('Aadhaar number must contain exactly 12 digits');
  }
  return digits;
}

/**
 * Normalises a mobile number to E.164 format (+91XXXXXXXXXX).
 */
function normaliseMobile(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^91/, '');
  if (digits.length !== 10) {
    throw new Error('Mobile number must contain exactly 10 digits (excluding country code)');
  }
  return `+91${digits}`;
}

// ─────────────────────────────────────────────
// Demographic helpers
// ─────────────────────────────────────────────

/**
 * Resolves a full name from the demographics object — prefers `fullName`,
 * then falls back to "FirstName LastName" concatenation.
 */
function nameFromDemographics(demographics?: VerifyAndRegisterInput['demographics']): string | null {
  if (!demographics) return null;
  return (
    demographics.fullName ||
    [demographics.firstName, demographics.lastName].filter(Boolean).join(' ') ||
    null
  );
}

/**
 * Builds a standard success response object wrapping a `PatientRecord`.
 */
function profileResponse(patient: PatientRecord, source: VerifyAndRegisterInput['path']) {
  return { status: 'VERIFIED' as const, source, patientId: patient.id, patient };
}

/**
 * Creates a new patient record by merging ABDM-returned `profile` data with
 * any manually-supplied `demographics`, then persisting via the repository.
 *
 * Throws if no name can be resolved — a name is mandatory for every record.
 */
async function createFromProfile(
  source: VerifyAndRegisterInput['path'],
  profile: Record<string, any>,
  identifier: string,
  demographics?: VerifyAndRegisterInput['demographics']
): Promise<PatientRecord> {
  const name = nameFromDemographics(demographics) || profile.fullName || profile.name || profile.patientName;
  if (!name) {
    throw new Error(
      'Unable to resolve patient name from ABDM profile or supplied demographics. ' +
      'Please provide firstName and lastName.'
    );
  }

  // Idempotent create-or-update so re-registration never duplicates a patient
  // in the in-memory fallback (MySQL offline) store.
  return patientRepository.upsertPatient({
    abhaId: profile.abhaId || profile.abha_id || profile.healthIdNumber || (source === 'abha' && !identifier.includes('@') ? identifier : null),
    abhaAddress: profile.abhaAddress || profile.phr || profile.healthId || (source === 'abha' && identifier.includes('@') ? identifier : null),
    aadhaarNumber: profile.aadhaarNumber || profile.aadhaar_number || (source === 'aadhaar' ? identifier : null),
    fullName: name,
    age: demographics?.age ?? profile.age ?? null,
    gender: demographics?.gender ?? profile.gender ?? 'Prefer not to say',
    dob: demographics?.dob ?? profile.dob ?? profile.dateOfBirth ?? null,
    phone: demographics?.phone ?? profile.mobile ?? profile.phone ?? (source === 'mobile' ? identifier : null),
    photoUrl: demographics?.photoUrl ?? profile.photo ?? profile.photoUrl ?? profile.profilePhoto ?? null,
  });
}

// ─────────────────────────────────────────────
// No-OTP acceptance helpers (demo mode)
// ─────────────────────────────────────────────

/** Generates a display name for a registration that supplied no demographics. */
function walkInName(source: VerifyAndRegisterInput['path'], identifier: string): string {
  const last4 = identifier.replace(/\D/g, '').slice(-4);
  if (source === 'mobile') return `Walk-in ${identifier}`;
  if (source === 'abha' && identifier.includes('@')) return `Walk-in ${identifier}`;
  return `Walk-in Patient ·${last4}`;
}

/**
 * Creates (or idempotently updates) a patient record from a raw identifier,
 * merging QR/ABDM profile data and manual demographics. Unlike
 * `createFromProfile`, it never throws for a missing name — any accepted number
 * maps to a walk-in patient so the kiosk flow can always proceed.
 */
async function createWalkIn(
  source: VerifyAndRegisterInput['path'],
  identifier: string,
  profileData: Record<string, any>,
  demographics?: VerifyAndRegisterInput['demographics']
): Promise<PatientRecord> {
  const name =
    nameFromDemographics(demographics) ||
    profileData.fullName ||
    profileData.name ||
    profileData.patientName ||
    walkInName(source, identifier);

  return patientRepository.upsertPatient({
    abhaId: profileData.abhaId || profileData.abha_id || profileData.healthIdNumber || (source === 'abha' && !identifier.includes('@') ? identifier : null),
    abhaAddress: profileData.abhaAddress || profileData.phr || profileData.healthId || (source === 'abha' && identifier.includes('@') ? identifier : null),
    aadhaarNumber: profileData.aadhaarNumber || profileData.aadhaar_number || (source === 'aadhaar' ? identifier : null),
    fullName: name,
    age: demographics?.age ?? profileData.age ?? null,
    gender: demographics?.gender ?? profileData.gender ?? 'Prefer not to say',
    dob: demographics?.dob ?? profileData.dob ?? profileData.dateOfBirth ?? null,
    phone: demographics?.phone ?? profileData.mobile ?? profileData.phone ?? (source === 'mobile' ? identifier : null),
    photoUrl: demographics?.photoUrl ?? profileData.photo ?? profileData.photoUrl ?? profileData.profilePhoto ?? null,
  });
}

/**
 * Demo mode: OTP-free acceptance of ANY valid identifier.
 * Known demo patients are matched against the local store; unknown numbers are
 * auto-registered as walk-in patients. The deprecated `send_otp`/`verify_otp`
 * actions are treated identically — no OTP is ever issued or required.
 */
async function acceptAnyNumber(input: VerifyAndRegisterInput) {
  let identifier: string;
  let existing: PatientRecord | null = null;
  let profileData: Record<string, any> = {};

  if (input.path === 'abha') {
    let qrData: Record<string, any> | undefined;
    try {
      const parsed = JSON.parse(input.identifier);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        qrData = parsed;
      }
    } catch {
      /* plain ABHA ID or address */
    }
    const payloadObject = qrData || (typeof input.demographicPayload === 'object' ? input.demographicPayload : undefined);
    profileData = payloadObject || {};

    const rawId =
      payloadObject?.abhaId ??
      payloadObject?.hidn ??
      payloadObject?.healthIdNumber ??
      payloadObject?.id ??
      payloadObject?.abhaAddress ??
      payloadObject?.phr ??
      input.identifier;

    identifier = normaliseAbhaIdentifier(rawId);
    existing = await patientRepository.findPatientByAbha(identifier);
  } else if (input.path === 'aadhaar') {
    identifier = normaliseAadhaar(input.identifier);
    existing = await patientRepository.findPatientByAadhaar(identifier);
  } else {
    identifier = normaliseMobile(input.identifier);
    existing = await patientRepository.findPatientByMobile(identifier);
  }

  if (existing) return profileResponse(existing, input.path);

  const patient = await createWalkIn(input.path, identifier, profileData, input.demographics);
  return profileResponse(patient, input.path);
}

// ─────────────────────────────────────────────
// Main exported workflow function
// ─────────────────────────────────────────────

/**
 * Unified patient verification and registration handler.
 *
 * This is the single entry-point for the `/api/patient/verify-and-register`
 * endpoint.  Dispatch is performed based on `input.path` and `input.action`.
 *
 * @returns One of:
 *   - `{ status: 'VERIFIED', patientId, patient }` — patient found or created
 *   - `{ status: 'OTP_SENT', txnId, expiresIn }` — OTP dispatched (ABDM gateway only)
 *   - `{ status: 'NOT_FOUND' | 'REGISTRATION_REQUIRED', ... }` — caller must
 *     collect missing demographics and resubmit
 */
export async function verifyAndRegister(input: VerifyAndRegisterInput) {
  // Demo mode (ABDM gateway not configured): the OTP verification system is
  // removed for ALL identity paths — ANY valid identifier is accepted
  // immediately. Known demo patients are matched against their seeded profile;
  // unknown numbers are auto-registered as walk-in patients so the kiosk flow
  // always proceeds. `send_otp` / `verify_otp` are treated identically to
  // `verify` and never require an OTP.
  if (!isAbdmConfigured()) {
    return acceptAnyNumber(input);
  }

  // ──────────────────────────────────────────
  // PATH 1: ABHA ID or QR Code scan
  // ──────────────────────────────────────────
  if (input.path === 'abha') {
    // Parse QR payload if the identifier contains embedded JSON.
    let qrData: Record<string, any> | undefined;
    try {
      const parsed = JSON.parse(input.identifier);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        qrData = parsed;
      }
    } catch {
      /* identifier is a plain ABHA ID or address — not JSON */
    }

    // Also check the explicit `demographicPayload` field (passed by QR scan flow).
    const payloadObject =
      qrData ||
      (typeof input.demographicPayload === 'object' ? input.demographicPayload : undefined);

    // Resolve the normalised ABHA identifier from QR data or raw input.
    const rawId =
      payloadObject?.abhaId ??
      payloadObject?.hidn ??
      payloadObject?.healthIdNumber ??
      payloadObject?.id ??
      payloadObject?.abhaAddress ??
      payloadObject?.phr ??
      input.identifier;

    const identifier = normaliseAbhaIdentifier(rawId);

    // 1a. Internal DB lookup.
    const existing = await patientRepository.findPatientByAbha(identifier);
    if (existing) return profileResponse(existing, input.path);

    // 1b. New registration path or not found in local database.
    if (!payloadObject && !input.demographics) {
      // No demographic data available and not found in local DB.
      return {
        status: 'NOT_FOUND' as const,
        source: input.path,
        message: 'No patient record found for this ABHA number.',
        identifier,
        requiredFields: ['fullName', 'gender', 'dob', 'phone'],
      };
    }

    // Demographic data is available from QR or manual demographics payload.
    const patient = await createFromProfile(input.path, payloadObject || {}, identifier, input.demographics);
    return profileResponse(patient, input.path);
  }

  // ──────────────────────────────────────────
  // PATH 2: Aadhaar OTP (ABDM two-step)
  // ──────────────────────────────────────────
  if (input.path === 'aadhaar') {
    const aadhaarNumber = normaliseAadhaar(input.identifier);

    // STEP A: Send OTP
    if (input.action === 'send_otp') {
      const encryptedAadhaar = await encryptForAbdm(aadhaarNumber);
      const payload = await abdmPost('/v3/enrollment/request/otp', {
        aadhaar: encryptedAadhaar,
        // ABDM requires scope for the OTP — 'abha-enrol' for new enrollments.
        scope: 'abha-enrol',
        loginHint: 'aadhaar',
      });
      return {
        status: 'OTP_SENT' as const,
        source: input.path,
        txnId: payload.txnId ?? payload.txn_id,
        expiresIn: payload.expiresIn ?? payload.expires_in ?? 300,
      };
    }

    // STEP B: Verify OTP and enrol
    if (input.action !== 'verify_otp') {
      throw new Error('Aadhaar path accepts actions: send_otp or verify_otp');
    }
    if (!input.txnId || !input.otp) {
      throw new Error('Both txnId and otp are required for Aadhaar verification');
    }

    // SECURITY: Both Aadhaar AND OTP must be RSA-encrypted before transmission.
    const [encryptedAadhaar, encryptedOtp] = await Promise.all([
      encryptForAbdm(aadhaarNumber),
      encryptForAbdm(input.otp),
    ]);

    const payload = await abdmPost('/v3/enrollment/enrol/byAadhaar', {
      txnId: input.txnId,
      otp: encryptedOtp,          // ← Bug fix: OTP must also be encrypted
      aadhaar: encryptedAadhaar,
    });

    // ABDM returns profile data under multiple possible keys.
    const abdmProfile =
      payload.ABHAProfile ??
      payload.profile ??
      payload.data ??
      payload;

    const verifiedAadhaar = abdmProfile?.aadhaarNumber ?? aadhaarNumber;

    // DB lookup by verified Aadhaar.
    const existing = await patientRepository.findPatientByAadhaar(verifiedAadhaar);
    if (existing) return profileResponse(existing, input.path);

    // New registration from ABDM-returned profile.
    const patient = await createFromProfile(
      input.path,
      abdmProfile,
      verifiedAadhaar,
      input.demographics
    );
    return profileResponse(patient, input.path);
  }

  // ──────────────────────────────────────────
  // PATH 3: Mobile Number + OTP (ABDM PHR)
  // ──────────────────────────────────────────
  const mobile = normaliseMobile(input.identifier);

  // STEP A: Send OTP
  if (input.action === 'send_otp') {
    const encryptedMobile = await encryptForAbdm(mobile);
    const payload = await abdmPost('/v3/phr/login/init', {
      mobile: encryptedMobile,
      purpose: 'CM_ACCESS',
      authMode: 'MOBILE_OTP',
      requester: {
        type: 'HIP',
        id: ABDM_CONFIG.facilityId || 'DEFAULT_HIP_ID',
      },
    });
    return {
      status: 'OTP_SENT' as const,
      source: input.path,
      txnId: payload.txnId ?? payload.txn_id,
      expiresIn: payload.expiresIn ?? payload.expires_in ?? 300,
    };
  }

  // STEP B: Verify OTP
  if (input.action === 'verify_otp') {
    if (!input.txnId || !input.otp) {
      throw new Error('Both txnId and otp are required for mobile verification');
    }

    const encryptedOtp = await encryptForAbdm(input.otp);
    await abdmPost('/v3/phr/login/verify/otp', {
      txnId: input.txnId,
      otp: encryptedOtp,
    });

    // Mobile verified — check local DB.
    const existing = await patientRepository.findPatientByMobile(mobile);
    if (existing) return profileResponse(existing, input.path);

    return {
      status: 'NOT_FOUND' as const,
      source: input.path,
      message: 'No patient record found for this mobile number.',
      verifiedMobile: mobile,
    };
  }

  // STEP C: Register with collected demographics (after REGISTRATION_REQUIRED)
  if (input.action === 'register') {
    const fullName = nameFromDemographics(input.demographics);
    if (!fullName || input.demographics?.age === undefined || !input.demographics?.gender) {
      return {
        status: 'REGISTRATION_REQUIRED' as const,
        source: input.path,
        requiredFields: ['firstName', 'lastName', 'age', 'gender'],
        verifiedMobile: mobile,
      };
    }

    const patient = await createFromProfile(input.path, {}, mobile, {
      ...input.demographics,
      phone: mobile,
    });
    return profileResponse(patient, input.path);
  }

  throw new Error(`Unsupported action "${input.action}" for path "${input.path}"`);
}
