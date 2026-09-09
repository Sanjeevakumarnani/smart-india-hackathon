import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Demo mode (ABDM gateway not configured — snapshotted empty at import time):
 * the OTP verification system is REMOVED. ANY valid identifier is accepted
 * immediately: known demo patients are matched against their seeded record,
 * while unknown numbers are auto-registered as walk-in patients via the
 * (idempotent) `upsertPatient` repository call. The deprecated `send_otp` /
 * `verify_otp` actions behave identically and never require an OTP.
 */

const mocks = vi.hoisted(() => ({
  findPatientByAbha: vi.fn(),
  findPatientByAbhaAddress: vi.fn(),
  findPatientByAadhaar: vi.fn(),
  findPatientByMobile: vi.fn(),
  upsertPatient: vi.fn(),
}));

vi.mock('../../repositories/patientRepository', () => ({
  patientRepository: {
    findPatientByAbha: mocks.findPatientByAbha,
    findPatientByAbhaAddress: mocks.findPatientByAbhaAddress,
    findPatientByAadhaar: mocks.findPatientByAadhaar,
    findPatientByMobile: mocks.findPatientByMobile,
    upsertPatient: mocks.upsertPatient,
  },
}));

import { verifyAndRegister } from '../patientVerificationWorkflow';

type VerifyResult = Awaited<ReturnType<typeof verifyAndRegister>>;
function verifiedPatient(result: VerifyResult) {
  if (result.status !== 'VERIFIED') throw new Error(`expected VERIFIED, got ${result.status}`);
  return result.patient;
}

const ANANYA = {
  id: 'PAT-DEMO-HYD-001',
  abhaId: '91-2345-6789-0123',
  abhaAddress: 'ananya.reddy@abdm',
  aadhaarNumber: '999900001111',
  aadhaarLast4: '1111',
  fullName: 'Ananya Reddy',
  age: 32,
  gender: 'Female',
  dob: null,
  phone: '+919876540001',
  photoUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findPatientByAbha.mockResolvedValue(null);
  mocks.findPatientByAbhaAddress.mockResolvedValue(null);
  mocks.findPatientByAadhaar.mockResolvedValue(null);
  mocks.findPatientByMobile.mockResolvedValue(null);
  mocks.upsertPatient.mockImplementation(async (input: any) => ({ id: 'PAT-NEW-0001', ...input }));
});

describe('accept-any-number (demo mode, OTP system removed)', () => {
  it('accepts ANY unknown 12-digit Aadhaar number immediately', async () => {
    const result = await verifyAndRegister({
      path: 'aadhaar',
      action: 'verify',
      identifier: '555566667777',
    });

    expect(result.status).toBe('VERIFIED');
    expect(mocks.findPatientByAadhaar).toHaveBeenCalledWith('555566667777');
    expect(mocks.upsertPatient).toHaveBeenCalledOnce();
    expect(verifiedPatient(result).aadhaarNumber).toBe('555566667777');
    expect(verifiedPatient(result).fullName).toBe(`Walk-in Patient ·7777`);
  });

  it('accepts ANY unknown 10-digit mobile number, normalised to +91', async () => {
    const result = await verifyAndRegister({
      path: 'mobile',
      action: 'verify',
      identifier: '9876543210',
    });

    expect(result.status).toBe('VERIFIED');
    expect(mocks.findPatientByMobile).toHaveBeenCalledWith('+919876543210');
    expect(verifiedPatient(result).phone).toBe('+919876543210');
    expect(verifiedPatient(result).fullName).toBe('Walk-in +919876543210');
  });

  it('accepts an unknown ABHA Health ID, formatted and saved', async () => {
    const result = await verifyAndRegister({
      path: 'abha',
      action: 'verify',
      identifier: '91771144003322',
    });

    expect(result.status).toBe('VERIFIED');
    expect(mocks.findPatientByAbha).toHaveBeenCalledWith('91-7711-4400-3322');
    expect(verifiedPatient(result).abhaId).toBe('91-7711-4400-3322');
    expect(verifiedPatient(result).fullName).toBe(`Walk-in Patient ·3322`);
  });

  it('accepts an unknown ABHA address (name@abdm)', async () => {
    const result = await verifyAndRegister({
      path: 'abha',
      action: 'verify',
      identifier: 'Test.User@abdm',
    });

    expect(result.status).toBe('VERIFIED');
    expect(mocks.findPatientByAbha).toHaveBeenCalledWith('test.user@abdm');
    expect(verifiedPatient(result).abhaAddress).toBe('test.user@abdm');
    expect(verifiedPatient(result).fullName).toBe('Walk-in test.user@abdm');
  });

  it('decodes a QR JSON payload and uses its demographics for the name', async () => {
    const qr = JSON.stringify({
      hidn: '91123456789012',
      name: 'Ram Kumar',
      gender: 'M',
      dob: '01-01-1985',
      phrAddress: 'ram.kumar@abdm',
    });

    const result = await verifyAndRegister({
      path: 'abha',
      action: 'lookup',
      identifier: qr,
      demographicPayload: qr,
    });

    expect(result.status).toBe('VERIFIED');
    expect(verifiedPatient(result).fullName).toBe('Ram Kumar');
    expect(verifiedPatient(result).abhaId).toBe('91-1234-5678-9012');
  });

  it('matches a known demo patient and does NOT re-register them', async () => {
    mocks.findPatientByAbha.mockResolvedValue(ANANYA);

    const result = await verifyAndRegister({
      path: 'abha',
      action: 'verify',
      identifier: '91234567890123',
    });

    expect(result.status).toBe('VERIFIED');
    expect(verifiedPatient(result).id).toBe('PAT-DEMO-HYD-001');
    expect(verifiedPatient(result).fullName).toBe('Ananya Reddy');
    expect(mocks.upsertPatient).not.toHaveBeenCalled();
  });

  it('honours manual demographics when registering an unknown number', async () => {
    const result = await verifyAndRegister({
      path: 'mobile',
      action: 'verify',
      identifier: '9988776655',
      demographics: { firstName: 'Ravi', lastName: 'K', age: 40, gender: 'Male' },
    });

    expect(result.status).toBe('VERIFIED');
    expect(verifiedPatient(result).fullName).toBe('Ravi K');
    expect(mocks.upsertPatient).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+919988776655', fullName: 'Ravi K', age: 40, gender: 'Male' })
    );
  });

  it('treats the deprecated send_otp / verify_otp actions as plain verify — no OTP ever sent', async () => {
    for (const action of ['send_otp', 'verify_otp'] as const) {
      const result = await verifyAndRegister({
        path: 'mobile',
        action,
        identifier: '9678524130',
      });

      expect(result.status).toBe('VERIFIED');
      expect(verifiedPatient(result).fullName).toBe('Walk-in +919678524130');
    }
    expect(mocks.findPatientByMobile).toHaveBeenCalledTimes(2);
    expect(mocks.upsertPatient).toHaveBeenCalledTimes(2);
  });

  it('still rejects malformed identifiers', async () => {
    await expect(
      verifyAndRegister({ path: 'aadhaar', action: 'verify', identifier: '123456' })
    ).rejects.toThrow(/exactly 12 digits/);

    await expect(
      verifyAndRegister({ path: 'abha', action: 'verify', identifier: '91123' })
    ).rejects.toThrow(/exactly 14 digits/);

    await expect(
      verifyAndRegister({ path: 'mobile', action: 'verify', identifier: '98765' })
    ).rejects.toThrow(/exactly 10 digits/);
  });
});