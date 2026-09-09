import { describe, it, expect } from 'vitest';
import { decodeQrImage } from '../qrService';

describe('decodeQrImage', () => {
  const samplePayload = {
    abhaId: '91-2345-6789-0123',
    abhaAddress: 'test@abdm',
    fullName: 'Ananya Reddy',
    gender: 'Female',
    dob: '1992-04-17',
    mobile: '9876540001',
  };

  it('decodes a base64-encoded JSON payload via the deterministic fast path', async () => {
    const b64 = Buffer.from(JSON.stringify(samplePayload), 'utf-8').toString('base64');
    const result = await decodeQrImage(b64);
    // decodeAbhaQr's strategy-1 (base64 JSON) wins, so the source is the
    // dedicated decoder and the type is ABHA_QR — still fully deterministic.
    expect(result.success).toBe(true);
    expect(result.type).toBe('ABHA_QR');
    expect(result.source).toBe('dedicated_ocr');
    expect(result.data?.abhaId).toBe('91-2345-6789-0123');
    expect(result.data?.fullName).toBe('Ananya Reddy');
  });

  it('decodes a data-URL wrapped base64 JSON payload', async () => {
    const b64 = Buffer.from(JSON.stringify(samplePayload), 'utf-8').toString('base64');
    const dataUrl = `data:image/jpeg;base64,${b64}`;
    const result = await decodeQrImage(dataUrl);
    expect(result.success).toBe(true);
    expect(result.type).toBe('ABHA_QR');
  });

  it('returns UNREADABLE for non-JSON junk input', async () => {
    const junk = Buffer.from('this is definitely not a QR code', 'utf-8').toString('base64');
    const result = await decodeQrImage(junk);
    expect(result.success).toBe(false);
    expect(result.type).toBe('UNREADABLE');
  });

  it('does not treat an array as a valid payload', async () => {
    const b64 = Buffer.from(JSON.stringify([1, 2, 3]), 'utf-8').toString('base64');
    const result = await decodeQrImage(b64);
    expect(result.success).toBe(false);
  });
});