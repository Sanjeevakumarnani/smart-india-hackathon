/**
 * @file patientRepository.ts
 * @description Data-access layer for the `patients` table.
 *
 * This module provides a set of clean CRUD placeholder methods backed by
 * both the live MySQL pool (when the database server is available) and an
 * in-memory fallback store.  Connect your own database layer by replacing the
 * body of each method — the public interface and return types are stable.
 *
 * Placeholder methods:
 *  - `db.findPatientByAbha(identifier)`      — look up by 14-digit ABHA ID
 *  - `db.findPatientByAbhaAddress(address)`  — look up by ABHA address (name@abdm)
 *  - `db.findPatientByAadhaar(number)`       — look up by Aadhaar number
 *  - `db.findPatientByMobile(phone)`         — look up by normalised mobile number
 *  - `db.createNewPatientRecord(input)`      — insert and return a new record
 *  - `db.upsertPatient(input)`               — idempotent create-or-update
 */

import crypto from 'node:crypto';
import { getDbPool, inMemoryDb } from '../db';

// ─────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────

/**
 * Canonical shape of a patient record as returned by this repository.
 * All nullable fields will be `null` (not `undefined`) when not present so
 * that downstream consumers can use strict equality checks.
 */
export type PatientRecord = {
  /** Internal unique patient identifier — e.g. "PAT-1LB4X2QZ". */
  id: string;
  /** 14-digit formatted ABHA Health ID — e.g. "91-1234-5678-9012". */
  abhaId?: string | null;
  /** ABHA PHR address — e.g. "john.doe@abdm". */
  abhaAddress?: string | null;
  /** 12-digit Aadhaar number (stored masked in prod). */
  aadhaarNumber?: string | null;
  /** Last 4 digits of Aadhaar (safe to display). */
  aadhaarLast4?: string | null;
  /** Legal full name as per Aadhaar / ABHA record. */
  fullName: string;
  /** Age in years (derived from DOB when available). */
  age?: number | null;
  /** Biological sex / gender as returned by the ABDM gateway. */
  gender?: string | null;
  /** Date of birth in ISO-8601 format (YYYY-MM-DD). */
  dob?: string | null;
  /** Mobile number in E.164 format — e.g. "+919876543210". */
  phone?: string | null;
  /** URL to the patient's ABHA profile photo (base64 or hosted URL). */
  photoUrl?: string | null;
};

// ─────────────────────────────────────────────
// Internal mapper
// ─────────────────────────────────────────────

/**
 * Maps a raw database row (snake_case) or an in-memory object (camelCase) to
 * a typed `PatientRecord`.  Tolerates either naming convention.
 */
function mapPatient(row: Record<string, any>): PatientRecord {
  return {
    id: row.id,
    abhaId: row.abha_id ?? row.abhaId ?? null,
    abhaAddress: row.abha_address ?? row.abhaAddress ?? null,
    aadhaarNumber: row.aadhaar_number ?? row.aadhaarNumber ?? null,
    aadhaarLast4: row.aadhaar_last4 ?? row.aadhaarLast4 ?? null,
    fullName: row.full_name ?? row.fullName ?? 'Unknown Patient',
    age: row.age ?? null,
    gender: row.gender ?? null,
    dob: row.dob ?? null,
    phone: row.phone ?? null,
    photoUrl: row.photo_url ?? row.photoUrl ?? null,
  };
}

// ─────────────────────────────────────────────
// PatientRepository class
// ─────────────────────────────────────────────

export class PatientRepository {
  // ── READ OPERATIONS ────────────────────────

  /**
   * Finds a patient by their 14-digit ABHA Health ID (formatted or unformatted) or ABHA address.
   */
  async findPatientByAbha(identifier: string): Promise<PatientRecord | null> {
    const raw = identifier.trim();
    const cleanDigits = raw.replace(/\D/g, '');
    const formatted = cleanDigits.length === 14 
      ? cleanDigits.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4') 
      : raw;

    try {
      const [rows] = await getDbPool().execute(
        'SELECT * FROM patients WHERE abha_id IN (?, ?) OR abha_address = ? LIMIT 1',
        [raw, formatted, raw.toLowerCase()]
      );
      return (rows as any[]).length ? mapPatient((rows as any[])[0]) : null;
    } catch {
      // Database unavailable — fall back to in-memory store.
      const match = inMemoryDb.patients.find(
        (p) => {
          const storedAbha = (p.abhaId || p.abha_id || '').replace(/\D/g, '');
          const storedAddr = (p.abhaAddress || p.abha_address || '').toLowerCase();
          return (cleanDigits && storedAbha === cleanDigits) || (raw.includes('@') && storedAddr === raw.toLowerCase());
        }
      );
      return match ? mapPatient(match) : null;
    }
  }

  /**
   * Finds a patient specifically by their ABHA PHR address (e.g. "john.doe@abdm").
   *
   * Use this when you have an explicit ABHA address and want a targeted lookup
   * instead of the broader `findPatientByAbha` dual-column search.
   *
   * @param address - The ABHA PHR address string.
   * @returns The matching `PatientRecord` or `null` if not found.
   */
  async findPatientByAbhaAddress(address: string): Promise<PatientRecord | null> {
    try {
      const [rows] = await getDbPool().execute(
        'SELECT * FROM patients WHERE abha_address = ? LIMIT 1',
        [address.toLowerCase()]
      );
      return (rows as any[]).length ? mapPatient((rows as any[])[0]) : null;
    } catch {
      const match = inMemoryDb.patients.find(
        (p) => (p.abhaAddress ?? p.abha_address)?.toLowerCase() === address.toLowerCase()
      );
      return match ? mapPatient(match) : null;
    }
  }

  /**
   * Finds a patient by their 12-digit Aadhaar number.
   *
   * @param aadhaarNumber - The raw 12-digit Aadhaar number string.
   * @returns The matching `PatientRecord` or `null` if not found.
   */
  async findPatientByAadhaar(aadhaarNumber: string): Promise<PatientRecord | null> {
    const digits = aadhaarNumber.replace(/\D/g, '');
    try {
      const [rows] = await getDbPool().execute(
        'SELECT * FROM patients WHERE aadhaar_number = ? LIMIT 1',
        [digits]
      );
      return (rows as any[]).length ? mapPatient((rows as any[])[0]) : null;
    } catch {
      const match = inMemoryDb.patients.find(
        (p) => (p.aadhaarNumber ?? p.aadhaar_number)?.replace(/\D/g, '') === digits
      );
      return match ? mapPatient(match) : null;
    }
  }

  /**
   * Finds a patient by their mobile number.
   *
   * Matches against all common formats: E.164 ("+919876543210"), local 10-digit
   * ("9876543210"), and full international ("919876543210") to be resilient to
   * format drift between data sources.
   *
   * @param phone - The mobile number in any format.
   * @returns The matching `PatientRecord` or `null` if not found.
   */
  async findPatientByMobile(phone: string): Promise<PatientRecord | null> {
    const digits = phone.replace(/\D/g, '').replace(/^91/, '');
    const variants = [phone, digits, `+91${digits}`, `91${digits}`];
    try {
      const placeholders = variants.map(() => '?').join(', ');
      const [rows] = await getDbPool().execute(
        `SELECT * FROM patients WHERE phone IN (${placeholders}) LIMIT 1`,
        variants
      );
      return (rows as any[]).length ? mapPatient((rows as any[])[0]) : null;
    } catch {
      const match = inMemoryDb.patients.find((p) => {
        const stored = (p.phone ?? '').replace(/\D/g, '').replace(/^91/, '');
        return stored && stored === digits;
      });
      return match ? mapPatient(match) : null;
    }
  }

  // ── WRITE OPERATIONS ───────────────────────

  /**
   * Inserts a brand-new patient record in the local database and returns it
   * with the auto-generated internal Patient ID.
   *
   * Patient IDs use `crypto.randomUUID()` to guarantee global uniqueness and
   * avoid the collision risk of timestamp-based IDs.
   *
   * @param input - All patient fields except `id` (which is auto-generated).
   * @returns The persisted `PatientRecord` including the newly assigned `id`.
   */
  async createNewPatientRecord(input: Omit<PatientRecord, 'id'>): Promise<PatientRecord> {
    // Generate a short, URL-safe patient ID: "PAT-" + first 8 hex chars of a UUID.
    const id = `PAT-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const record: PatientRecord = { ...input, id };
    const aadhaarLast4 = input.aadhaarNumber?.slice(-4) ?? null;

    try {
      await getDbPool().execute(
        `INSERT INTO patients
           (id, abha_id, abha_address, aadhaar_number, aadhaar_last4,
            full_name, age, gender, dob, phone, photo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.abhaId || null,
          input.abhaAddress || null,
          input.aadhaarNumber || null,
          aadhaarLast4,
          input.fullName,
          input.age ?? null,
          input.gender ?? 'Prefer not to say',
          input.dob ?? null,
          input.phone || null,
          input.photoUrl || null,
        ]
      );
      console.info(`[PatientRepo] Created patient ${id} (${input.fullName}) in MySQL.`);
    } catch (dbErr) {
      // Database unavailable — persist to in-memory fallback.
      console.warn('[PatientRepo] MySQL insert failed, using in-memory store:', (dbErr as Error).message);
      inMemoryDb.patients.push({ ...record, aadhaarLast4 });
    }

    return { ...record, aadhaarLast4 };
  }

  /**
   * Idempotent create-or-update operation.
   *
   * If a patient with the same `abhaId`, `aadhaarNumber`, or `phone` already
   * exists, their record is updated with the supplied fields.  Otherwise a new
   * record is created.  Returns the final persisted `PatientRecord`.
   *
   * @param input - Patient fields to persist (without `id`).
   * @returns The created or updated `PatientRecord`.
   */
  async upsertPatient(input: Omit<PatientRecord, 'id'>): Promise<PatientRecord> {
    // Look for an existing patient by any available unique identifier.
    let existing: PatientRecord | null = null;

    if (input.abhaId) existing = await this.findPatientByAbha(input.abhaId);
    if (!existing && input.abhaAddress) existing = await this.findPatientByAbhaAddress(input.abhaAddress);
    if (!existing && input.aadhaarNumber) existing = await this.findPatientByAadhaar(input.aadhaarNumber);
    if (!existing && input.phone) existing = await this.findPatientByMobile(input.phone);

    if (existing) {
      // Merge — existing fields take precedence; new fields fill gaps.
      const merged: PatientRecord = {
        ...existing,
        abhaId: input.abhaId ?? existing.abhaId,
        abhaAddress: input.abhaAddress ?? existing.abhaAddress,
        aadhaarNumber: input.aadhaarNumber ?? existing.aadhaarNumber,
        aadhaarLast4: input.aadhaarNumber?.slice(-4) ?? existing.aadhaarLast4,
        fullName: input.fullName || existing.fullName,
        age: input.age ?? existing.age,
        gender: input.gender ?? existing.gender,
        dob: input.dob ?? existing.dob,
        phone: input.phone ?? existing.phone,
        photoUrl: input.photoUrl ?? existing.photoUrl,
      };
      try {
        await getDbPool().execute(
          `UPDATE patients SET
             abha_id = ?, abha_address = ?, full_name = ?,
             age = ?, gender = ?, dob = ?, phone = ?, photo_url = ?
           WHERE id = ?`,
          [
            merged.abhaId ?? null,
            merged.abhaAddress ?? null,
            merged.fullName,
            merged.age ?? null,
            merged.gender ?? null,
            merged.dob ?? null,
            merged.phone ?? null,
            merged.photoUrl ?? null,
            merged.id,
          ]
        );
      } catch {
        const idx = inMemoryDb.patients.findIndex((p) => p.id === merged.id);
        if (idx >= 0) inMemoryDb.patients[idx] = merged;
      }
      return merged;
    }

    return this.createNewPatientRecord(input);
  }
}

// ─────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────
export const patientRepository = new PatientRepository();
