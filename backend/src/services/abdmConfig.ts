/**
 * @file abdmConfig.ts
 * @description Centralised configuration for the Ayushman Bharat Digital Mission (ABDM) v3 integration.
 *
 * All sensitive values are read from environment variables so that no credentials
 * are ever committed to source control.  Leave the variables blank during local
 * development — the system will degrade gracefully by throwing a descriptive
 * error only when an actual ABDM API call is attempted.
 */

import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────
// Typed configuration interface
// ─────────────────────────────────────────────
export interface AbdmConfig {
  /** ABDM sandbox / production gateway base URL. Example: https://dev.abdm.gov.in/api */
  baseUrl: string;
  /** OAuth2 client-id issued by the ABDM gateway. */
  clientId: string;
  /** OAuth2 client-secret issued by the ABDM gateway. */
  clientSecret: string;
  /** Facility / HIP id registered with ABDM (used in FHIR resource references). */
  facilityId: string;
  /**
   * Per-request HTTP timeout in milliseconds.
   * @default 12000
   */
  timeoutMs: number;
  /**
   * How many milliseconds before the cached token expiry we proactively refresh.
   * @default 60000 (60 s)
   */
  tokenRefreshSkewMs: number;
  /**
   * Number of retry attempts for transient ABDM network failures.
   * @default 2
   */
  maxRetries: number;
  /**
   * How long (ms) the public RSA certificate is cached before it is re-fetched.
   * @default 3600000 (1 hour)
   */
  certCacheTtlMs: number;
}

// ─────────────────────────────────────────────
// Singleton configuration object
// ─────────────────────────────────────────────
export const ABDM_CONFIG: AbdmConfig = {
  /** Leave blank — provide via ABDM_BASE_URL environment variable. */
  baseUrl: process.env.ABDM_BASE_URL || '',
  /** Leave blank — provide via ABDM_CLIENT_ID environment variable. */
  clientId: process.env.ABDM_CLIENT_ID || '',
  /** Leave blank — provide via ABDM_CLIENT_SECRET environment variable. */
  clientSecret: process.env.ABDM_CLIENT_SECRET || '',
  /** Leave blank — provide via ABDM_FACILITY_ID environment variable. */
  facilityId: process.env.ABDM_FACILITY_ID || '',
  timeoutMs: Number(process.env.ABDM_TIMEOUT_MS || 12000),
  tokenRefreshSkewMs: Number(process.env.ABDM_TOKEN_REFRESH_SKEW_MS || 60_000),
  maxRetries: Number(process.env.ABDM_MAX_RETRIES || 2),
  certCacheTtlMs: Number(process.env.ABDM_CERT_CACHE_TTL_MS || 3_600_000),
};

// ─────────────────────────────────────────────
// Guard helpers
// ─────────────────────────────────────────────

/**
 * Returns `true` when all mandatory ABDM credentials are present in the
 * environment.  Use this for feature-flag checks before attempting live calls.
 */
export function isAbdmConfigured(): boolean {
  return Boolean(
    ABDM_CONFIG.baseUrl &&
    ABDM_CONFIG.clientId &&
    ABDM_CONFIG.clientSecret
  );
}

/**
 * Throws a descriptive `Error` when ABDM is not configured.  Call this at the
 * top of any function that makes a live ABDM request so that misconfiguration
 * surfaces immediately with a clear message instead of a cryptic network error.
 */
export function requireAbdmConfiguration(): void {
  if (!isAbdmConfigured()) {
    throw new Error(
      'ABDM integration is not configured. ' +
      'Set ABDM_BASE_URL, ABDM_CLIENT_ID, and ABDM_CLIENT_SECRET in your .env file.'
    );
  }
}
