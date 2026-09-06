# MediKiosk+ 🏥

> Multilingual AI-Assisted Patient Case-Taking & Clinical Triage Kiosk  
> AYUSH Dashavidha Pariksha · SOCRATES Interview Engine · Document OCR · FHIR R4 · Live OPD Queue

---

## ⚡ 1-Click Windows Setup (New Laptop / Transfer)

If you are transferring this project to another Windows laptop:
1. Copy the folder to your other laptop (you can skip `node_modules` to transfer quickly).
2. Simply double-click **`setup_and_launch.bat`**.
3. It will automatically check Node.js, install dependencies, create the database & 22 tables, seed initial data, and open the site in your browser at `http://localhost:3000`!

See [TRANSFER_AND_SETUP_GUIDE.md](file:///c:/SIH/medikiosk+/TRANSFER_AND_SETUP_GUIDE.md) for full transfer details.

---

## Manual Local Development Setup

### Prerequisites
- **Node.js** v18+ (or [Bun](https://bun.sh/))
- A Gemini API key *(optional — app works offline with fallback engine)*

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Configure Environment

```bash
# Copy the example env file
copy .env.example .env
```

Open `.env` and optionally add your Gemini API key:
```env
GEMINI_API_KEY="your-key-here"
APP_URL="http://localhost:3000"
```

> **No key?** The app runs fully with a built-in deterministic clinical fallback engine.

### 3. Start the Dev Server

```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

### ABDM Patient Verification Integration

The unified endpoint is available at `POST /api/patient/verify-and-register` and supports:

- `path: "abha"` with `action: "lookup"` for ABHA IDs, ABHA addresses, or scanned demographic payloads.
- `path: "aadhaar"` with `action: "send_otp"` and `action: "verify_otp"`.
- `path: "mobile"` with `action: "send_otp"` and `action: "verify_otp"`; unknown mobile users receive `202 REGISTRATION_REQUIRED` with the required demographic fields.

ABDM credentials and URLs are intentionally blank environment hooks:

```env
ABDM_BASE_URL=""
ABDM_CLIENT_ID=""
ABDM_CLIENT_SECRET=""
ABDM_FACILITY_ID=""
ABDM_TIMEOUT_MS="10000"
```

The workflow checks MySQL first, encrypts Aadhaar/mobile values with the ABDM public certificate before transmission, and maintains a token refresh hook for `/v3/sessions`. Run `npm run migrate:patient-abdm` once on an existing database to add ABHA address and profile photo columns.

---

## Architecture

```
medikiosk+/
├── server.ts          # Express backend — Gemini API proxy & FHIR endpoints
├── src/
│   ├── App.tsx        # Root kiosk state machine & step router
│   ├── components/    # All screen components (Language, Consent, SOCRATES, etc.)
│   ├── services/
│   │   ├── geminiService.ts   # Calls backend Gemini endpoints
│   │   ├── fhirGenerator.ts   # FHIR R4 bundle builder
│   │   ├── speechService.ts   # Web Speech API (TTS/STT)
│   │   └── broadcastChannel.ts# Cross-tab red-flag notifications
│   ├── data/mockData.ts       # Demo patient personas & sample documents
│   └── types.ts               # Shared TypeScript types
└── vite.config.ts     # Vite + Tailwind + PWA config
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Express + Vite HMR) on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | TypeScript type check |

## Making It Publicly Accessible (ngrok)

To share the kiosk over the internet temporarily:

```bash
# Install ngrok (one-time)
npm install -g ngrok

# In a second terminal after starting npm run dev
ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL — share it with anyone!

---

## Features

- 🌐 **Multilingual** — Hindi, English, Tamil, Marathi, Bengali, Telugu
- 🤖 **Gemini AI** — Clinical summarization, document OCR, NLP symptom parsing
- 🌿 **AYUSH** — Dashavidha Pariksha for Ayurveda OPD
- 🔴 **Red Flag Detection** — Auto-triage to Emergency with cross-tab broadcast
- 📄 **FHIR R4** — ABDM-compatible clinical data export
- 📱 **PWA** — Installable, offline-capable
- ♿ **Accessibility** — ISL avatar, high-contrast, large font, audio narration
