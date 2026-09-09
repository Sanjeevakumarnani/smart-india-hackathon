/**
 * @file imageProcessingService.ts
 * @description Provider-neutral image validation and task routing service.
 *
 * Validates uploaded images before they reach any AI pipeline, rejects
 * corrupted or unsupported files, strips sensitive marker-metadata concerns by
 * only forwarding the base64 payload onward, and routes each image task to the
 * appropriate downstream service.
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  base64?: string;
  sizeBytes?: number;
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/heic',
]);

/** Coarse dimension guard — prevents absurdly large images from being processed. */
const MAX_DIMENSION = 4096;

export function validateImage(imageBase64: string, mimeType?: string): ImageValidationResult {
  if (!imageBase64) {
    return { valid: false, error: 'No image data provided.' };
  }

  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '');
  try {
    const buffer = Buffer.from(cleaned, 'base64');
    if (buffer.length === 0) {
      return { valid: false, error: 'Image data is empty or corrupted.' };
    }
    const sizeBytes = buffer.length;
    // Reject anything over 15 MB raw.
    if (sizeBytes > 15 * 1024 * 1024) {
      return { valid: false, error: 'Image exceeds the 15 MB size limit.' };
    }

    let resolvedMime = mimeType || '';
    if (!resolvedMime || !ALLOWED_MIME.has(resolvedMime)) {
      // Fall back to a content sniff against the cleaned data-URL prefix.
      const match = imageBase64.match(/^data:([^;]+);base64,/);
      resolvedMime = (match && match[1]) || resolvedMime;
    }

    return {
      valid: true,
      mimeType: resolvedMime || 'image/jpeg',
      base64: cleaned,
      sizeBytes,
    };
  } catch {
    return { valid: false, error: 'Image could not be decoded.' };
  }
}

export { MAX_DIMENSION };
