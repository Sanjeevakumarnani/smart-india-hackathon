/**
 * @file abdmTokenManager.ts
 * @description Background service that provisions and auto-refreshes the ABDM
 * Bearer access token using client-credential OAuth2 flow.
 *
 * Token endpoint: POST /v3/sessions
 * Authentication: HTTP Basic (clientId:clientSecret) + JSON body with same credentials.
 *
 * Features:
 *  - Lazy singleton — token is only fetched on first use
 *  - Proactive refresh 60 s before expiry (configurable via ABDM_TOKEN_REFRESH_SKEW_MS)
 *  - Exponential backoff on transient failures (up to `ABDM_CONFIG.maxRetries` attempts)
 *  - `status()` method exposed for the `/api/abdm/status` health endpoint
 */

import { ABDM_CONFIG, isAbdmConfigured, requireAbdmConfiguration } from './abdmConfig';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type TokenResponse = {
  accessToken?: string;
  access_token?: string;
  expiresIn?: number;
  expires_in?: number;
};

export type TokenManagerStatus = {
  configured: boolean;
  hasToken: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  refreshing: boolean;
};

// ─────────────────────────────────────────────
// AbdmTokenManager class
// ─────────────────────────────────────────────

class AbdmTokenManager {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private isRefreshing = false;

  // ── Lifecycle ──────────────────────────────

  /**
   * Starts the background token refresh timer.  Should be called once at
   * application boot (after `dotenv.config()`).  Safe to call multiple times —
   * only one timer will be active at any point.
   */
  public start(): void {
    if (!isAbdmConfigured() || this.refreshTimer) return;

    // Eagerly fetch the first token so the server is ready immediately.
    void this.refresh().catch((err) =>
      console.warn('[ABDM Token] Initial token fetch failed:', err.message)
    );

    // Re-validate every 5 minutes; the `getAccessToken` path handles proactive refresh.
    this.refreshTimer = setInterval(() => {
      void this.refresh().catch((err) =>
        console.warn('[ABDM Token] Scheduled refresh failed:', err.message)
      );
    }, 5 * 60 * 1000);

    // Allow the Node process to exit naturally even if this timer is pending.
    this.refreshTimer.unref?.();

    console.info('[ABDM Token] Background token manager started.');
  }

  /** Stops the background refresh timer and clears the in-memory token. */
  public stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.accessToken = null;
    this.expiresAt = 0;
    console.info('[ABDM Token] Background token manager stopped.');
  }

  // ── Public API ─────────────────────────────

  /**
   * Returns a valid Bearer token, refreshing it proactively if it is close to
   * expiring.  Will block until the token is available.
   *
   * @throws {Error} When ABDM is not configured or the token cannot be obtained.
   */
  public async getAccessToken(): Promise<string> {
    const skewMs = ABDM_CONFIG.tokenRefreshSkewMs;
    if (this.accessToken && this.expiresAt > Date.now() + skewMs) {
      return this.accessToken;
    }
    return this.refresh();
  }

  /**
   * Returns a snapshot of the token manager's current state, suitable for
   * inclusion in a health-check or status API response.
   */
  public status(): TokenManagerStatus {
    return {
      configured: isAbdmConfigured(),
      hasToken: Boolean(this.accessToken),
      expiresAt: this.expiresAt ? new Date(this.expiresAt).toISOString() : null,
      isExpired: Boolean(this.accessToken) && Date.now() >= this.expiresAt,
      refreshing: this.isRefreshing,
    };
  }

  // ── Internal refresh with exponential backoff ──

  private async refresh(): Promise<string> {
    requireAbdmConfiguration();

    // Serialise concurrent refresh calls — if one is in-flight, wait for it.
    if (this.isRefreshing) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!this.isRefreshing) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
      if (this.accessToken) return this.accessToken;
    }

    this.isRefreshing = true;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= ABDM_CONFIG.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 500 ms, 1 s, 2 s …
          await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
          console.warn(`[ABDM Token] Retry attempt ${attempt} of ${ABDM_CONFIG.maxRetries}…`);
        }

        const token = await this._doFetch();
        this.isRefreshing = false;
        return token;
      } catch (err) {
        lastError = err as Error;
        console.error(`[ABDM Token] Refresh attempt ${attempt + 1} failed:`, lastError.message);
      }
    }

    this.isRefreshing = false;
    throw new Error(
      `ABDM token refresh failed after ${ABDM_CONFIG.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private async _doFetch(): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ABDM_CONFIG.timeoutMs);

    try {
      const credentials = Buffer.from(
        `${ABDM_CONFIG.clientId}:${ABDM_CONFIG.clientSecret}`
      ).toString('base64');

      const url = `${ABDM_CONFIG.baseUrl.replace(/\/$/, '')}/v3/sessions`;

      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'X-CM-ID': 'sbx',  // ABDM sandbox CM ID — swap for prod
        },
        body: JSON.stringify({
          clientId: ABDM_CONFIG.clientId,
          clientSecret: ABDM_CONFIG.clientSecret,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} — ${body}`);
      }

      const payload = (await response.json()) as TokenResponse;
      const token = payload.accessToken || payload.access_token;

      if (!token) {
        throw new Error('ABDM token response did not contain an access token field.');
      }

      const expiresIn = payload.expiresIn ?? payload.expires_in ?? 900; // default 15 min
      this.accessToken = token;
      this.expiresAt = Date.now() + expiresIn * 1_000;

      console.info(
        `[ABDM Token] Token refreshed — expires in ${expiresIn}s ` +
        `(${new Date(this.expiresAt).toISOString()})`
      );

      return token;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────
export const abdmTokenManager = new AbdmTokenManager();
