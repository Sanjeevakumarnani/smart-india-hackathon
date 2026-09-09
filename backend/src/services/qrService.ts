/**
 * @file qrService.ts
 * @description Deterministic ABHA QR code decoding service.
 *
 * ABHA card QR decoding is a deterministic operation and is performed with a
 * dedicated QR decoding library (see `abdmQrDecoder.ts`).  An AI vision model
 * is only consulted as a last resort when the image is damaged and a standard
 * decoder fails — an AI model is never the primary QR decoder.
 *
 * This module is provider-neutral and does not reference any specific AI
 * vendor for the primary decode path.
 */

import { decodeAbhaQr, type AbhaQrPayload } from './abdmQrDecoder';

export interface QrDecodeResult {
  success: boolean;
  type: 'AR_ABHA_JSON' | 'ABHA_QR' | 'UNREADABLE';
  data?: AbhaQrPayload;
  rawContent?: string;
  source: 'dedicated_ocr' | 'simulated' | 'ai_fallback';
}

/**
 * Decodes an ABHA card from a base64 / data-URL image using a dedicated QR
 * decoder.  When the image cannot be decoded by the dedicated decoder, the
 * caller may invoke `decodeAbhaQrWithAiFallback` for damaged-images recovery.
 */
export async function decodeQrImage(imageBase64: string): Promise<QrDecodeResult> {
  const stripped = imageBase64.replace(/^data:[^;]+;base64,/, '');

  // Fast path — the payload may already be base64-encoded or plain JSON.
  const payload = await decodeAbhaQr(imageBase64);
  if (payload && (payload.abhaId || payload.fullName || payload.abhaAddress)) {
    return {
      success: true,
      type: 'ABHA_QR',
      data: payload,
      source: 'dedicated_ocr',
    };
  }

  // Try base64-decoding the raw bytes to see if it is JSON.
  try {
    const decoded = Buffer.from(stripped, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { success: true, type: 'AR_ABHA_JSON', data: parsed, source: 'simulated' };
    }
  } catch {
    // Not a base64-encoded JSON payload.
  }

  return { success: false, type: 'UNREADABLE', source: 'dedicated_ocr' };
}
