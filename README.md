# MediKiosk+

Multilingual, AI-powered patient case-taking and OPD triage kiosk (PS 26047).
Kiosk-fronted intake for patients, SOCRATES/AYUSH questioning, document OCR,
physician summaries, ABDM QR identity, FHIR push, Hindi/Tamil/Telugu/Kannada/
Marathi/Malayalam speech — plus a doctor console with live queue and analytics.

This repository is a monorepo of three independently deployable packages:

```
medikiosk+/
├── backend/     Express API (Render)  — port 3000
├── frontend/    React + Vite PWA (Vercel) — port 5173
└── database/    schema.sql + MySQL migration/import scripts
```

The web app and the API run on separate hosts: the frontend talks to the
backend through an absolute origin configured with `VITE_API_URL`, so no
same-origin proxy is needed in production.

---

## Quick start (local development)

Prerequisites: **Node 22+**, MySQL 8 running locally (optional — see note below).

```bash
npm run install:all          # install backend, frontend, database deps

# 1. Backend — copy backend/.env.example ➜ backend/.env, set DB + JWT_SECRET
npm run dev:backend          # Express API on http://localhost:3000

# 2. Frontend — copy frontend/.env.example ➜ frontend/.env.local if needed
npm run dev:frontend         # Vite dev server on http://localhost:5173
```

Open http://localhost:5173. The default `VITE_API_URL` already points at
`http://localhost:3000`.

> **No MySQL? No problem.** The backend includes a robust in-memory fallback
> datastore (with throttled warning logs) so the kiosk keeps running through
> temporary database outages. Data written while falling back is not persisted.

### Verify the backend

```
GET /api/health
```
returns `{ status: "ok", aiConfigured, sarvamConfigured, databaseConnected }`.

---

## Backend (`backend/`)

Standalone Express API — renders no HTML.

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `npm run dev`    | `tsx src/app.ts` (dev)                                   |
| `npm run build`  | esbuild → `dist/server.cjs` (single-file bundle)         |
| `npm start`      | `node dist/server.cjs` (production; Render start cmd)    |
| `npm run lint`   | `tsc --noEmit`                                           |
| `npm test`       | vitest (unit tests in `src/services/__tests__`)          |

Configured from environment variables — see `backend/.env.example`. Key ones:

| Variable                 | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `PORT`                   | Listen port (Render injects its own). Default `3000`       |
| `FRONTEND_URL`           | Comma-separated CORS allow-list of frontend origins        |
| `JWT_SECRET`             | Signing secret — **required in production** (boot fails if unset) |
| `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` | MySQL connection             |
| `DB_SSL` / `DB_SSL_CA` / `DB_SSL_REJECT_UNAUTHORIZED` | TLS for managed MySQL |
| `SARVAM_API_KEY`, `GROQ_API_KEY` | Speech + LLM providers (optional, degrade gracefully) |
| `ABDM_*`, `BHASHINI_*`, `TWILIO_*` | Optional integrations |
| `DEMO_MODE`, `DEMO_LOG_OTP`, `DEMO_ALLOW_REGISTRATION` | Reserved demo controls (default `false`) |

---

## Frontend (`frontend/`)

React 19 + Vite 6 PWA (auto-updating service worker).

| Command                  | What it does                  |
| ------------------------ | ----------------------------- |
| `npm run dev`            | Vite dev server on :5173      |
| `npm run build`          | `vite build` → `dist/`        |
| `npm run typecheck`      | `tsc --noEmit`                |

All API traffic goes through `src/config/api.ts` (`API_BASE_URL`,
`apiUrl()`, `apiFetch()`). Set the deployed backend origin with
`VITE_API_URL` (see `frontend/.env.example`); locally it defaults to
`http://localhost:3000`.

---

## Database (`database/`)

`schema.sql` is the source of truth for the schema; seed data (languages,
chief complaints, AYUSH card decks, kiosk stations, default users) lives in
`schema.sql` and in the backend's `src/data/mockData.ts`.

Health-check the installed seed users (created by `schema.sql` / `setup_db`):

```
admin   / Admin@123
doctor1 / Doctor@123
staff1  / Staff@123
```

> Provide connection details via `DB_*` env vars (local `.env` or shell).
> The backend hard-fails these hard-coded login fallbacks in production.

### Local MySQL (interactive wizard)

```bash
npm run setup:db --prefix database         # creates DB, runs schema.sql, seeds users
```

### Managed / cloud MySQL (non-interactive)

Use `import:schema` for providers that already allocate the database
(Aiven, PlanetScale, DigitalOcean, Railway, …). It creates the database if
missing, executes `schema.sql`, and prints table/seed verification:

```bash
DB_HOST=... DB_PORT=3306 DB_USER=... DB_PASSWORD=... DB_NAME=medikiosk \
DB_SSL=true DB_SSL_CA=/path/to/ca.pem \
npm run import:schema --prefix database
```

Required on most managed providers: **TLS** (`DB_SSL=true`). Some providers
wrap the CA bundle, in which case also set `DB_SSL_CA`; relax
`DB_SSL_REJECT_UNAUTHORIZED` only if the provider demands it.

### Migrations

```bash
npm run migrate:rbac --prefix database           # RBAC + management tables
npm run migrate:patient-abdm --prefix database   # patients.abha_address, photo_url
```

Migrations are idempotent (use `IF NOT EXISTS` / column-exists checks).

---

## Deploying

### Frontend → Vercel

1. Import the repo. **Root Directory:** `frontend`
2. Framework preset: **Vite**; Build: `npm run build`; Output: `dist`
3. Add env var `VITE_API_URL=https://<your-backend>.onrender.com`

### Backend → Render (Web Service)

1. **Root Directory:** `backend`
2. Build command: `npm run build`  →  Start command: `node dist/server.cjs`
3. Runtime: **Node 22**
4. Add env vars from `backend/.env.example`:
   - `JWT_SECRET` (a long random value — mandatory)
   - `FRONTEND_URL=https://<your-vercel-app>.vercel.app`
   - `DB_*` pointing at your managed MySQL, with `DB_SSL=true`
   - provider keys (`SARVAM_API_KEY`, `GROQ_API_KEY`, …) as required

### Database → managed MySQL

Import via `npm run import:schema --prefix database` (above), then attach the
connection details to the Render service.

---

## Repository notes

- `mockData.ts` is **backend-only**; the frontend fetches it (`/api/languages`,
  `/api/chief-complaints`, `/api/ayush/cards`, `/api/kiosk/config`, …).
- The backend never crashes on a database outage — see `backend/src/db.ts`.
- Dead/duplicate Express routes were pruned during the monorepo split (Express
  only ever executes the first-matching registration).
- `corrections.jsonl` (auto-written by the physician-correction flow) is
  git-ignored.