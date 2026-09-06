/**
 * @file abdmCrypto.ts
 * @description RSA-OAEP encryption helper for the ABDM v3 gateway.
 *
 * ABDM requires all sensitive PII values (Aadhaar numbers, mobile numbers, OTPs)
 * to be encrypted with the gateway's RSA public key before transmission.
 *
 * Public key endpoint: GET /v3/profile/public/certificate
 *
 * The certificate is cached for `ABDM_CONFIG.certCacheTtlMs` (default 1 hour)
 * to avoid hammering the certificate endpoint on every request.  If encryption
 * fails due to a stale or malformed key, the cache is automatically invalidated
 * and the request is retried once with a freshly fetched certificate.
 */

import crypto from 'node:crypto';
import { ABDM_CONFIG, requireAbdmConfiguration } from './abdmConfig';

// ─────────────────────────────────────────────
// In-process certificate cache
// ─────────────────────────────────────────────
interface CertCache {
  /** PEM-formatted RSA public key / X.509 certificate string. */
  value: string;
  /** Unix epoch (ms) after which the cached value should be considered stale. */
  expiresAt: number;
}

let cachedCertificate: CertCache | null = null;

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/**
 * Performs an HTTP GET request with a configurable timeout and AbortController.
 */
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ABDM_CONFIG.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Constructs the fully-qualified URL for a given ABDM API path segment.
 */
function abdmUrl(path: string): string {
  return `${ABDM_CONFIG.baseUrl.replace(/\/$/, '')}${path}`;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Fetches (or returns the cached copy of) the ABDM RSA public certificate.
 *
 * @param forceRefresh - When `true`, bypasses the in-memory cache and always
 *   fetches a fresh certificate from the ABDM gateway.
 * @returns A PEM-formatted RSA public key string.
 * @throws {Error} When the ABDM gateway returns a non-2xx response or an empty body.
 */
export async function getAbdmPublicCertificate(forceRefresh = false): Promise<string> {
  requireAbdmConfiguration();

  if (!forceRefresh && cachedCertificate && cachedCertificate.expiresAt > Date.now()) {
    return cachedCertificate.value;
  }

  const response = await fetchWithTimeout(abdmUrl('/v3/profile/public/certificate'));
  if (!response.ok) {
    throw new Error(
      `ABDM certificate request failed — HTTP ${response.status} ${response.statusText}`
    );
  }

  const payload = (await response.json()) as { certificate?: string; publicKey?: string };
  const certificate = payload.certificate || payload.publicKey;

  if (!certificate) {
    throw new Error(
      'ABDM certificate response did not contain a "certificate" or "publicKey" field.'
    );
  }

  cachedCertificate = {
    value: certificate,
    expiresAt: Date.now() + ABDM_CONFIG.certCacheTtlMs,
  };

  return certificate;
}

/**
 * Encrypts a plaintext string using the ABDM RSA public key (OAEP/SHA-256).
 *
 * ABDM mandates that Aadhaar numbers, mobile numbers, and OTPs are encrypted
 * with this key before they are included in any API request body.
 *
 * **Automatic stale-cert recovery**: If the first encryption attempt throws
 * (e.g. the cached key has been rotated), the cache is invalidated and one
 * additional attempt is made with a freshly fetched certificate.
 *
 * @param value - The plaintext value to encrypt (e.g. "9876543210").
 * @returns A Base64-encoded RSA-OAEP encrypted ciphertext string.
 * @throws {Error} When encryption still fails after the automatic retry.
 */
export async function encryptForAbdm(value: string): Promise<string> {
  const tryEncrypt = async (forceRefresh: boolean): Promise<string> => {
    const publicKey = await getAbdmPublicCertificate(forceRefresh);
    return crypto
      .publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(value, 'utf8')
      )
      .toString('base64');
  };

  try {
    return await tryEncrypt(false);
  } catch (firstError) {
    // The cached certificate may be stale (rotated key).  Invalidate and retry.
    console.warn('[ABDM Crypto] First encryption attempt failed, retrying with fresh certificate:', firstError);
    cachedCertificate = null;
    try {
      return await tryEncrypt(true);
    } catch (retryError) {
      throw new Error(
        `ABDM RSA encryption failed after cache invalidation: ${(retryError as Error).message}`
      );
    }
  }
}
