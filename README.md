# MediKiosk+

Multilingual, AI-powered patient intake and OPD triage kiosk (PS 26047).

MediKiosk+ provides a kiosk-fronted intake for patients with multilingual speech support, structured clinical questioning (SOCRATES/AYUSH), document OCR, physician summaries, ABDM QR identity support, FHIR push, and a doctor console with live queue and analytics. The project is implemented as a TypeScript monorepo and includes backend, frontend, and database packages.

Key features

- Multilingual speech: Hindi, Tamil, Telugu, Kannada, Marathi, Malayalam (speech-to-text and TTS)
- AI-assisted case-taking and physician summaries
- Support for ABDM QR identity and FHIR push
- Document OCR for scanned/photographed documents
- Doctor console with live queue, patient notes, and analytics
- Resilient backend with in-memory fallback when DB is unavailable

Repository layout

```
medikiosk+/
├── backend/     Express API (Render)  — default port 3000
├── frontend/    React + Vite PWA (Vercel) — default port 5173
└── database/    schema.sql + MySQL migration/import scripts
```

Tech stack

- TypeScript (primary)
- Node 22+ runtime
- Express (backend)
- React 19 + Vite 6 (frontend PWA)
- MySQL 8 (database)

Quick start (local development)

Prerequisites

- Node 22+
- (Optional) MySQL 8 running locally. The backend can fall back to an in-memory datastore for quick testing, but that fallback is not persistent.

Install dependencies

```bash
# from repository root
npm run install:all
```

Run the backend and frontend locally

1. Backend

- Copy `backend/.env.example` to `backend/.env` and set required env vars (see Backend configuration below).

```bash
npm run dev:backend   # starts the Express API on http://localhost:3000
```

2. Frontend

- Optionally copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_API_URL` if you want a different backend origin.

```bash
npm run dev:frontend  # starts the Vite dev server on http://localhost:5173
```

Open http://localhost:5173 in your browser. By default, the frontend expects the API at http://localhost:3000.

API health check

```
GET /api/health
```

Returns a JSON object such as:

```json
{ "status": "ok", "aiConfigured": false, "sarvamConfigured": false, "databaseConnected": true }
```

Backend (backend/)

The backend is a standalone Express API and does not render HTML. Common commands:

- `npm run dev` — run the backend in development (tsx src/app.ts)
- `npm run build` — build single-file bundle (esbuild → dist/server.cjs)
- `npm start` — run production bundle (node dist/server.cjs)
- `npm run lint` — type-check only (tsc --noEmit)
- `npm test` — run unit tests (vitest)

Configuration

Copy `backend/.env.example` to `backend/.env` and set the following key variables:

- `PORT` — server port (default 3000)
- `FRONTEND_URL` — comma-separated CORS allow-list for frontend origins
- `JWT_SECRET` — signing secret (required in production)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — MySQL connection
- `DB_SSL`, `DB_SSL_CA`, `DB_SSL_REJECT_UNAUTHORIZED` — TLS settings for managed MySQL
- Optional integrations: `SARVAM_API_KEY`, `GROQ_API_KEY`, `ABDM_*`, `BHASHINI_*`, `TWILIO_*`
- Demo controls: `DEMO_MODE`, `DEMO_LOG_OTP`, `DEMO_ALLOW_REGISTRATION` (defaults: false)

Frontend (frontend/)

The frontend is a React 19 + Vite 6 Progressive Web App (PWA) with an auto-updating service worker. Common commands:

- `npm run dev` — start Vite dev server (default :5173)
- `npm run build` — build production static assets (dist/)
- `npm run typecheck` — `tsc --noEmit`

API communication is centralized in `src/config/api.ts` and uses the `VITE_API_URL` environment variable to determine the backend origin. Locally this defaults to `http://localhost:3000`.

Database (database/)

- `schema.sql` is the source-of-truth for the database schema and includes seed data for languages, chief complaints, AYUSH card decks, kiosk stations, and default users.
- Seed users (created by schema.sql / setup_db):

```
admin   / Admin@123
doctor1 / Doctor@123
staff1  / Staff@123
```

Local interactive setup

```bash
npm run setup:db --prefix database         # creates DB, runs schema.sql, seeds users
```

Managed / cloud MySQL

If you use a managed provider (PlanetScale, Aiven, Railway, DigitalOcean, etc.), import the schema non-interactively:

```bash
DB_HOST=... DB_PORT=3306 DB_USER=... DB_PASSWORD=... DB_NAME=medikiosk \
DB_SSL=true DB_SSL_CA=/path/to/ca.pem \
npm run import:schema --prefix database
```

Notes:
- Most managed providers require TLS (`DB_SSL=true`). Set `DB_SSL_CA` if the provider supplies a CA bundle. Only set `DB_SSL_REJECT_UNAUTHORIZED` when required by the provider.

Migrations

```bash
npm run migrate:rbac --prefix database           # RBAC + management tables
npm run migrate:patient-abdm --prefix database   # add patient abdm columns
```

Deploying

Frontend → Vercel

1. Import the repo into Vercel.
2. Root Directory: `frontend`
3. Framework preset: Vite. Build command: `npm run build`, Output Directory: `dist`
4. Set env var `VITE_API_URL=https://<your-backend>.onrender.com`

Backend → Render (Web Service)

1. Root Directory: `backend`
2. Build command: `npm run build`
3. Start command: `node dist/server.cjs`
4. Runtime: Node 22
5. Add env vars from `backend/.env.example` (including `JWT_SECRET`, `FRONTEND_URL`, and `DB_*` credentials)

Database → Managed MySQL

Import schema using `npm run import:schema --prefix database` and attach DB connection details to your Render service.

Repository notes

- `mockData.ts` is backend-only; the frontend fetches endpoints such as `/api/languages`, `/api/chief-complaints`, `/api/ayush/cards`, and `/api/kiosk/config`.
- The backend is resilient to database outages and provides an in-memory fallback — see `backend/src/db.ts`.
- Dead or duplicate Express routes were removed when the monorepo was split.
- `corrections.jsonl` (written by the physician-correction flow) is ignored by git.

Contributing

Contributions, issues, and feature requests are welcome. Please open issues or pull requests in this repository and follow standard GitHub contribution practices.

License

Specify the project license here (e.g., MIT). If there's an existing LICENSE file, keep that license. If you want me to add a license, tell me which one.

Contact

For questions or help running the project locally, open an issue or contact the maintainers.
