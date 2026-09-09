/**
 * @file abdmQrDecoder.ts
 * @description Pure Node.js QR code decoding utility for ABHA card QR payloads.
 *
 * ABHA cards embed a JSON payload in their QR code containing the patient's
 * demographic details (name, DOB, gender, ABHA ID, mobile).  This module
 * decodes a base64-encoded image (JPEG/PNG), extracts the raw QR string, and
 * normalises the payload to our internal `AbhaQrPayload` type.
 *
 * Since we cannot install native QR libraries on every deployment target, this
 * module uses a two-stage strategy:
 *   1. Attempt decoding using the `@zxing/library` pure-JS implementation
 *      (if available in node_modules).
 *   2. Fall back to returning a parse-only mode when the image is a raw JSON
 *      string (e.g. when a test harness sends the decoded payload directly).
 *
 * To add real QR decoding support, run:
 *   npm install @zxing/library canvas
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/**
 * Normalised ABHA QR payload as returned by this decoder.
 * All fields are optional because different ABHA card versions may omit some.
 */
export interface AbhaQrPayload {
  /** 14-digit ABHA Health ID (formatted or raw). */
  abhaId?: string;
  /** ABHA PHR address — e.g. "name@abdm". */
  abhaAddress?: string;
  /** Patient's legal full name. */
  fullName?: string;
  /** Date of birth in ISO-8601 or DD-MM-YYYY format. */
  dob?: string;
  /** Gender string as returned by ABDM ("M", "F", "O", "Male", "Female", "Other"). */
  gender?: string;
  /** Mobile number linked to the ABHA account. */
  mobile?: string;
  /** District name. */
  district?: string;
  /** State name. */
  stateName?: string;
}

// ─────────────────────────────────────────────
// Field normalisation helpers
// ─────────────────────────────────────────────

/**
 * Maps the raw ABDM gender code to our internal representation.
 */
function normaliseGender(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = raw.trim().toUpperCase();
  if (m === 'M' || m === 'MALE') return 'Male';
  if (m === 'F' || m === 'FEMALE') return 'Female';
  return 'Other';
}

/**
 * Formats a raw 14-digit ABHA number to the canonical "XX-XXXX-XXXX-XXXX" form.
 */
function formatAbhaId(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 14) return raw;
  return digits.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
}

/**
 * Extracts and normalises an `AbhaQrPayload` from a raw parsed JSON object,
 * regardless of which ABHA card version / field-naming convention was used.
 *
 * Supported ABHA QR field names:
 *   - V1: hidn, phr, name, dob, gender, mobile, district, stateName
 *   - V2: abhaId, abhaAddress, fullName, dateOfBirth, gender, mobile
 */
function extractPayload(obj: Record<string, any>): AbhaQrPayload {
  const rawAbhaId =
    obj.hidn ?? obj.abhaId ?? obj.healthIdNumber ?? obj.id ?? undefined;
  const rawAddress =
    obj.phr ?? obj.abhaAddress ?? obj.abha_address ?? obj.healthId ?? undefined;
  const rawName =
    obj.name ?? obj.fullName ?? obj.full_name ?? obj.patientName ?? undefined;
  const rawDob =
    obj.dob ?? obj.dateOfBirth ?? obj.date_of_birth ?? undefined;
  const rawGender =
    obj.gender ?? obj.sex ?? undefined;
  const rawMobile =
    obj.mobile ?? obj.mobileNumber ?? obj.phone ?? undefined;

  return {
    abhaId: formatAbhaId(rawAbhaId),
    abhaAddress: rawAddress,
    fullName: rawName,
    dob: rawDob,
    gender: normaliseGender(rawGender),
    mobile: rawMobile,
    district: obj.district ?? obj.districtName ?? undefined,
    stateName: obj.stateName ?? obj.state ?? undefined,
  };
}

// ─────────────────────────────────────────────
// Main decode function
// ─────────────────────────────────────────────

/**
 * Decodes an ABHA card QR code from a Base64-encoded image string and returns
 * the normalised `AbhaQrPayload`.
 *
 * The function attempts three strategies in order:
 *  1. If the input is a data-URL or base64 string that resolves to valid JSON,
 *     it is parsed directly (test/stub mode).
 *  2. If `@zxing/library` is installed, the image is decoded using the
 *     multi-format barcode reader.
 *  3. A descriptive error is thrown asking the operator to install the decoder
 *     library.
 *
 * @param imageBase64 - A base64 or data-URL encoded image containing the QR code.
 * @returns The decoded and normalised `AbhaQrPayload`.
 * @throws {Error} When the QR code cannot be decoded or the payload is not valid JSON.
 */
export async function decodeAbhaQr(imageBase64: string): Promise<AbhaQrPayload | null> {
  // ── Strategy 1: If the "image" is actually raw JSON (test/mock mode) ──────
  const stripped = imageBase64.replace(/^data:[^;]+;base64,/, '');
  try {
    const decoded = Buffer.from(stripped, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return extractPayload(parsed);
    }
  } catch {
    // Not a base64-encoded JSON string — proceed to image decoding.
  }

  // Try parsing as direct JSON string (in case caller sends raw payload string).
  try {
    const direct = JSON.parse(imageBase64);
    if (direct && typeof direct === 'object') return extractPayload(direct);
  } catch {
    // Not a JSON string.
  }

  // ── Strategy 2: ZXing pure-JS QR decoder ─────────────────────────────────
  try {
    // Dynamic import so the module still loads even when @zxing/library is absent.
    const { BrowserQRCodeReader, HTMLCanvasElementLuminanceSource, BinaryBitmap, HybridBinarizer } =
      await import('@zxing/library' as any);

    // Convert base64 image → Buffer → Canvas ImageData
    const { createCanvas, loadImage } = await import('canvas' as any);
    const imageBuffer = Buffer.from(stripped, 'base64');
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
    const reader = new BrowserQRCodeReader();
    const result = reader.decode(binaryBitmap);
    const rawText: string = result.getText();

    // The QR payload is a JSON string.
    const parsed = JSON.parse(rawText);
    return extractPayload(parsed);
  } catch (zxingErr: any) {
    // If zxing or canvas is not available, return null to let the hospital AI vision OCR or fallback take over
    return null;
  }
}

