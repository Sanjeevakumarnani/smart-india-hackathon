# MediKiosk+ 🏥

> **AI-Assisted Multilingual Patient Case-Taking & Clinical Triage Kiosk**  
> *Smart India Hackathon (SIH) — Problem Statement ID: 26047 | Ministry of Ayush / All India Institute of Ayurveda (AIIA)*  
> AYUSH Dashavidha Pariksha · SOCRATES Interview Engine · On-Demand ABHA/QR Scanner · FHIR R4 · Real-time OPD Queue

---

## 📌 Executive Summary

In Indian tertiary hospitals and public health centres, Outpatient Departments (OPDs) manage **4,000 to 10,000 patients daily**, compressing consultation times to an unsustainable **2 to 5 minutes** per patient. Under this severe time constraint, thorough clinical history-taking is invariably compromised.

**MediKiosk+** transforms hospital intake into an automated, multilingual, patient-facing digital workflow. It captures demographics, chief complaints, structured clinical histories, past medical records via OCR, and AYUSH-specific systemic evaluations before the patient steps into the doctor's chamber. The physician receives a pre-compiled, structured clinical brief and FHIR R4-compliant record, restoring quality consultation time to patient care.

---

## ✨ Key Capabilities

### 1. 🌐 Zero-Scroll Single-Screen Multilingual UI
- Tailored for high-throughput kiosks with an instant **3-up, 3-down** clean grid layout:
  - 🇬🇧 **English**
  - 🇮🇳 **Telugu (తెలుగు)**
  - 🇮🇳 **Tamil (தமிழ்)**
  - 🇮🇳 **Kannada (ಕನ್ನಡ)**
  - 🇮🇳 **Malayalam (മലയാളം)**
  - 🇮🇳 **Marathi (मराठी)**
- **Instant Progression**: Automatically navigates to patient intake upon selection without requiring unnecessary confirmation clicks.
- Built-in Voice Narration (Text-to-Speech) and Speech-to-Text in regional dialects.

### 2. 🆔 Unified ABDM Multi-Channel Intake
- **Merged ABHA & QR Scanner**: ABHA ID input and live QR camera scanner in a single interface.
- **Privacy-Preserving On-Demand Camera**: Camera hardware is activated **only when the user taps "Scan QR"**, eliminating unnecessary camera usage, battery drain, and privacy concerns.
- **Aadhaar & Mobile OTP Channels**: Direct mobile OTP and Aadhaar authentication with encrypted payload transport.
- **New Patient Registration**: Seamless capture of demographic details with immediate OPD queue token issuance.

### 3. 🩺 Dual Clinical Intelligence Engine
- **Modern Clinical Intake (SOCRATES Framework)**: Elicits **S**ite, **O**nset, **C**haracter, **R**adiation, **A**ssociations, **T**iming, **E**xacerbating/Relieving factors, and **S**everity.
- **AYUSH Dashavidha Pariksha**: Comprehensive Ayurvedic systemic assessment:
  - *Prakriti* (Constitution), *Vikriti* (Pathological imbalance), *Sara* (Tissue vitality), *Samhanana* (Body build), *Pramana* (Anthropometry), *Satmya* (Habituation), *Satwa* (Mental resilience), *Ahara-shakti* (Digestive capacity), *Vyayama-shakti* (Physical endurance), and *Vaya* (Age stage).
- **Document OCR Intelligence**: Analyzes uploaded photos or scans of past prescriptions, diagnostic reports, and discharge summaries via Gemini AI.
- **Deterministic Offline Fallback**: Fully functional clinical triage rule engine if internet connectivity or API quota is unavailable.

### 4. 🚨 Red Flag & Emergency Triage
- Automated detection of critical clinical indicators (severe chest pain, dyspnea, acute neurological signs, abnormal vitals).
- Real-time cross-tab alerts via `BroadcastChannel` immediately notifying triage staff and doctor stations.

### 5. 📋 Live Doctor OPD Dashboard & FHIR Interoperability
- Real-time queue tracker with triage priority tags (Emergency, High, Routine).
- In-depth clinical brief viewer with one-click **Download PDF Case Summary**.
- Standards-compliant **HL7 FHIR R4 Bundle** generation for seamless integration with Hospital Information Systems (HIS) and ABDM health records.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Motion |
| **Backend** | Node.js, Express, TSX |
| **Database** | MySQL (22 structured relational tables for patients, visits, OPD queue, audit logs) |
| **AI / OCR** | Google GenAI SDK (`@google/genai` Gemini 2.0 Flash / Pro) + Clinical Fallback Engine |
| **Standards** | HL7 FHIR R4 JSON Bundle, ABDM v3 Specifications |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **MySQL Server** (e.g., MySQL Community Server or XAMPP / MariaDB)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Sanjeevakumarnani/smart-india-hackathon.git
cd smart-india-hackathon
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Configure your `.env` settings:
```env
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=medikiosk

# Gemini AI (Optional — app operates with fallback engine if omitted)
GEMINI_API_KEY="your-gemini-api-key"

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

### 3. Initialize Database & Run Migrations
```bash
# Create database tables and initial seed data
npm run setup:db

# Run patient ABDM migration
npm run migrate:patient-abdm
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs backend Express server with Vite HMR on port 3000 |
| `npm run build` | Builds frontend production assets and bundles backend |
| `npm run start` | Runs production bundle from `dist/server.cjs` |
| `npm run setup:db` | Initializes MySQL database schema (`schema.sql`) |
| `npm run migrate:patient-abdm`| Applies ABDM patient columns and schema updates |
| `npm run lint` | TypeScript static type checking (`tsc --noEmit`) |

---

## 📁 Repository Structure

```
medikiosk+/
├── src/
│   ├── components/            # UI components (Kiosk, Intake, SOCRATES, AYUSH, Dashboard)
│   │   ├── LanguageSelection.tsx # 6-language 3x2 responsive grid with auto-advance
│   │   ├── AbhaVerification.tsx  # Unified ABHA & QR scanner (on-demand camera toggle)
│   │   ├── AadhaarVerification.tsx
│   │   ├── MobileVerification.tsx
│   │   ├── SocratesAssessment.tsx
│   │   ├── AyushAssessment.tsx
│   │   └── DoctorDashboard.tsx
│   ├── services/              # Client services (Gemini, Speech, FHIR, BroadcastChannel)
│   ├── data/                  # Mock data, translations, clinical vocabularies
│   ├── types.ts               # Shared TypeScript schemas and data interfaces
│   └── App.tsx                # Main state machine & navigation router
├── server.ts                  # Express backend & API gateway
├── schema.sql                 # MySQL schema definitions
├── setup_db.cjs               # Database bootstrap script
├── migrate_patient_abdm.cjs   # Patient ABDM migration script
└── package.json               # Project manifest and dependencies
```

---

## ⚖️ License & Acknowledgements
Developed for the **Smart India Hackathon** under the auspices of the **Ministry of Ayush** and **All India Institute of Ayurveda (AIIA)**.
