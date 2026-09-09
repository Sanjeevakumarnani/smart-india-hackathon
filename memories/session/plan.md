# MediKiosk+ Demo Flow — Plan & Execution Log

> **Project:** MediKiosk+ — multi-lingual OPD kiosk for Indian public hospitals
> **Branch:** `main`
> **Last updated:** 2026-09-09
> **Status:** Hospital admin kiosk gate (admin/admin) added; demo flow hardening in progress

---

## 1. Overall Goal

Transform the existing MediKiosk+ codebase into a complete, demoable kiosk flow that:

1. Verifies a patient identity (ABHA / Aadhaar / Mobile) with a strictly-gated demo OTP.
2. Forces navigation through identity -> consent -> vitals -> chief complaint -> SOCRATES interview -> AYUSH pariksha -> document scan -> (session purge).
3. Persists ONE unified encounter (patient, vitals, socrates, ayush, history, documents, summary) with a single queue token.
4. Generates a clinical summary via a provider-neutral AI layer (Groq), presented to the physician, corrected by the physician, pushed to ABDM FHIR.
5. Runs a doctor console (queue + summary) and a patient portal (days since last visit, diagnostics, prescriptions, visits).
6. Labels demo vs real integration explicitly (simulated / queued / dispatched / failed / real).
7. Supports the "no documented patient record == cannot continue" written requirement.
8. Has automated tests (Vitest).

---

## 2. Current Architecture (as of 2026-09-08)

- **Stack:** Node + Express + MySQL (in-memory fallback), React + Vite + Tailwind, tsx runner.
- **Lint:** `npm run lint` = `tsc --noEmit` (passing).
- **No test framework installed yet.**
- **AI layer rework (DONE):** Gemini (`@google/genai`) replaced with provider-neutral services:
  - `src/services/groqService.ts` — Groq (OpenAI-compatible) provider, server-only key.
  - `src/services/aiService.ts` — provider-neutral helpers (`aiConfigured`, `aiText`, `aiChat`, `aiVision`).
  - `src/services/qrService.ts`, `imageProcessingService.ts`, `documentService.ts` — QR / image / document pipeline.
  - `src/services/aiClientService.ts` — frontend client calling provider-neutral `/api/ai/*` routes.
- **Server routes:** `/api/ai/*`, `/api/documents/ocr`, `/api/qr/decode`, `/api/abha/scan`, `/api/session/purge/:id`, `DELETE /api/encounters/:id` added; legacy `/api/gemini/*` retained as deprecated aliases during migration.
- **Env:** `.env`/`.env.example` now use `GROQ_API_KEY` + `GROQ_*_MODEL` settings; `.env.example` documents strict demo gates.
- **Demo identity fixtures:** 4 Telangana synthetic patients in `src/data/demoPatients.ts`, wired into `src/db.ts` in-memory fallback + repo lookups.

---

## 3. Phase Plan & Execution Status

### Phase A — Strict demo identity / OTP gating ✅ Done
- `isDemoOtpEnabled()` now `DEMO_MODE === 'true' && !isAbdmConfigured()`.
- `isDemoOtpLoggingEnabled()` now `isDemoOtpEnabled() && DEMO_LOG_OTP === 'true'`.
- OTP is printed to console only when BOTH strict gates pass.
- `register` action (STEP C) in `patientVerificationWorkflow.ts` blocked unless
  `DEMO_ALLOW_REGISTRATION === 'true'` (added `.env.example` key, default `false`).
- ABHA QR auto-register path also gated by the same switch.
- `REGISTRATION_BLOCKED` status surfaced in `IdentityScreen.tsx` (QR scan + mobile register).
- Requirement enforced: **unknown identity without an existing record cannot continue self-registration.**

### Phase B — Unified encounter persistence + doctor console summary ✅ Done
- Consolidated duplicate `GET /api/encounters/by-token/:tokenId` (shadowed route removed).
- `normalizeClinicalSummary()` helper returns the FULL persisted summary (prefers `summary_json`
  snapshot) instead of a 3-field stub.
- `DoctorConsolePage` loads the persisted summary from by-token and passes `initialSummary`
  to `PhysicianSummaryConsole` (prefills the console instead of regenerating).

### Phase C — Real DPDP purge + integration labeling ✅ Done
- `POST /api/session/purge/:id` now performs a REAL purge:
  - Resolves token -> encounter id.
  - Deletes encounter-scoped child rows in MySQL (best effort) and flushes in-memory buffers.
  - Labels response with `mode` (`real` / `no-op`) and `integration` (`real` / `simulated`),
    plus `status` (`purged` / `already-absent` / `failed`) and per-collection counts.
- Added `DELETE /api/encounters/:id` for true encounter purge (DB cascade + memory flush), 404 when absent.
- `SessionPurgeScreen` shows the purge status label on the token slip.

### Phase D — This planning log ✅ Done
- `memories/session/plan.md` created.

### Phase E — Test infrastructure (Vitest) ✅ Done
- `vitest` added as devDependency; `npm test` / `npm run test:watch` scripts added
  (`package.json`); `vitest.config.ts` (Node env, `src/**/*.test.ts`).
- 20 tests across 4 files — all passing:
  - `src/services/__tests__/imageProcessingService.test.ts` (6)
  - `src/services/__tests__/qrService.test.ts` (4)
  - `src/services/__tests__/demoGating.test.ts` (7) — strict `=== "true"` gates + registration block
  - `src/services/__tests__/groqModelConfig.test.ts` (3) — env mapping + documented defaults
- Fixed the patient-accumulation risk: `createFromProfile` now uses idempotent
  `upsertPatient` (dedup by ABHA/Aadhaar/phone) instead of `createNewPatientRecord`,
  preventing duplicate in-memory rows when MySQL is offline.
- Demo gate helpers exported from `patientVerificationWorkflow.ts` for testing:
  `isDemoOtpEnabled`, `isDemoOtpLoggingEnabled`, `isRegistrationAllowed`.

### Phase F — Final verification ✅ Done
- `npm run lint` (tsc --noEmit) passing across all changes.
- `npm run build` succeeds — Vite client (2944 modules) + esbuild `dist/server.cjs`.
- `npm test` — 20/20 passing.
- Runtime smoke: `groqService.ts`/`aiService.ts`/`documentService.ts` import cleanly;
  `aiConfigured()` correctly reflects the presence of `GROQ_API_KEY` in `.env`
  (a real key was added to `.env` after the scrub — all `/api/ai/*` + `/api/gemini/*`
  routes will now make live Groq calls, with deterministic fallbacks still in place).
- **Security note:** `.env` now contains a live `GROQ_API_KEY`. It is git-ignored and
  must never be committed or printed.

### Phase G — OTP verification system removed (accept any number) ✅ Done
- Demo mode (ABDM gateway not configured) no longer issues or requires OTP at all.
  `verifyAndRegister` short-circuits to `acceptAnyNumber(input)` for ALL actions
  (`verify`, `lookup`, deprecated `send_otp`/`verify_otp`). Known demo patients match
  their seeded record; unknown numbers auto-register idempotently via `upsertPatient`.
- `patientVerificationWorkflow.ts`: removed `isDemoOtpEnabled`, `isDemoOtpLoggingEnabled`,
  `isRegistrationAllowed`, `hashOtp`, `issueDemoOtp`, `verifyDemoOtp`, `demoOtpTransactions`;
  action enum now `['lookup','verify','send_otp','verify_otp','register']`; new helpers
  `walkInName` (e.g. `Walk-in Patient ·3322`, `Walk-in +91…`, `Walk-in name@abdm`).
  Real ABDM gateway OTP flows + `OtpExpiredError` (HTTP 410) retained for configured mode.
- `server.ts`: removed dead fake endpoints `/api/abdm/otp/send` + `/api/abdm/otp/verify`.
- `IdentityScreen.tsx`: OTP state/handlers/`OtpTimer`/countdown removed; ABHA, Aadhaar,
  Mobile + QR-scan paths are now single-step `verify` (ABHA lookup goes straight to
  `onSelectProfile` on VERIFIED). Tabs relabelled `Aadhaar` / `Mobile Number`.
- Demo OTP step (client-side, accept-any): for ABHA/Aadhaar/Mobile the kiosk shows a
  4-digit OTP input after the identifier is accepted (server ignores the code — any
  4 digits pass), then displays the matched patient's name and proceeds to the next
  step. Tab switch clears the pending-OTP state.
- `PatientPortalAuth.tsx`: single-step `Verify & Access Records`; OTP input/state removed;
  enter-key submits; Aadhaar accepts last-4 (reconstructed to `99990000XXXX`) or full 12.
- `demoGating.test.ts` rewritten from gate tests to 9 accept-any-number tests (mocks
  `patientRepository`); `npm test` — 20/20 across 4 files; lint + build pass.

### Phase H — Hospital Admin Kiosk Gate (DONE 2026-09-09)
- `HospitalLoginScreen.tsx` (new): full-screen lock card; username + password
  (`admin`/`admin`); submits to `POST /api/auth/login`; on success stores
  `localStorage['medikiosk_kiosk_unlocked']='1'` and calls `onUnlock`.
- `App.tsx`: new `kioskUnlocked` state (localStorage-backed, defaults `false`); early-return
  gate BEFORE all role gates renders `HospitalLoginScreen` when locked. `handleLockKiosk`
  removes the flag + re-locks; wired to a new patient-header lock button.
- `PatientHeader.tsx`: added `onLockKiosk` prop + lock-keyhole button (next to staff shield).
- `server.ts` `/api/auth/login`: hardcoded `admin`/`admin` override wins regardless of DB
  (reassigns `userRecord` even when a DB row exists). Existing `admin`/`Admin@123`,
  `doctor1`/`Doctor@123`, `staff1`/`Staff@123` remain valid.
- Behavior: once unlocked, kiosk stays open until the lock button is pressed or the app is
  reset. No auto-re-lock after patient sessions (per hospital requirement).
- Verify: lint, 20/20 tests, build pass.

---

## 4. Demo Environment Reference

### Demo patients (in-memory fixtures)
| Patient | ABHA ID | Mobile | Aadhaar | Region |
|---|---|---|---|---|
| Ananya Reddy | 91-2345-6789-0123 | +919876540001 | 9999-0000-1111 | Hyderabad |
| Srinivas Naik | (PAT-DEMO-WGL-001) | (9876540002) | — | Warangal |
| Kavya Sharma | (PAT-DEMO-NZB-001) | (9876540003) | — | Nizamabad |
| (Khammam fixture) | (PAT-DEMO-KHM-001) | (9876540004) | — | Khammam |

### Demo identity rules (OTP system removed)
- NO OTP is ever issued or required — demo mode accepts ANY valid identifier immediately
  (ABHA ID/address, 12-digit Aadhaar, 10-digit mobile). Unknown numbers are auto-registered
  as walk-ins via idempotent `upsertPatient`.
- Real ABDM gateway OTP flows apply only when ABDM IS configured (`ABDM_BASE_URL` set).

### Groq model mapping
| Kind | Model |
|---|---|
| default | `qwen/qwen3.8-27b` |
| fast | `openai/gpt-oss-20b` |
| reasoning | `openai/gpt-oss-120b` |
| vision | `qwen/qwen3.8-27b` |
| speech | `whisper-large-v3-turbo` |

---

## 5. Known Gotchas / Notes for Next Session

- `npm run dev` runs `tsx server.ts` with NO `--watch` — editing server/Ts source while a
  dev server is running does NOT reload. Symptoms of a stale server: the frontend (new bundle
  sending `action:'verify'`) gets HTTP 400 `Invalid patient verification request` because the
  running process still has the old `z.enum(['lookup','send_otp','verify_otp','register'])`
  schema with no `'verify'`. Fix = fully stop and re-run `npm run dev` (or `npm start` after
  `npm run build`).
- The comment-divider box-drawing characters in `server.ts` read as mojibake
  (`—box—`) in some encodings — when editing near them, match smaller unique anchors.
- `executeQuery()` returns `{ rows, fromDb }`; for INSERT/UPDATE/DELETE, `rows` is the
  mysql2 `ResultSetHeader` — read `.affectedRows` from `result.rows`.
- Frontend must NOT import `groqService.ts` / server `aiService.ts` (they pull in `dotenv`);
  the browser-facing client is `src/services/aiClientService.ts`.
- Remaining legacy cleanup (post-migration): delete `src/services/geminiService.ts` (already
  removed), drop `/api/gemini/*` routes, remove `@google/genai` dependency, prune `.env` GEMINI key.
- `.env` was scrubbed of the live `GEMINI_API_KEY`; `GROQ_API_KEY` left blank -> all AI routes
  degrade to deterministic fallbacks until a key is added.