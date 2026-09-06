# MediKiosk+ 🏥 Comprehensive Technical Audit: Incomplete Works & Technical Debt

> **Document Version**: 1.0.0  
> **Target Project**: MediKiosk+ (`Sanjeevakumarnani/smart-india-hackathon`)  
> **Problem Statement ID**: 26047 (Ministry of Ayush / AIIA)  
> **Generated**: September 2026

---

## 📋 Executive Overview

Following an in-depth, line-by-line architectural and functional audit of the entire MediKiosk+ codebase (frontend React components, state machines, API gateways, database schemas, ABDM services, and localization systems), this document catalogs all **incomplete features**, **architectural bugs**, **localization inconsistencies**, **unconnected UI elements**, and **stubbed/mocked integrations**.

Each item is categorized by priority:
- 🔴 **P0 (Critical / Blocker)**: Core workflows broken, route conflicts, or runtime failure modes.
- 🟡 **P1 (High)**: Incomplete integrations, broken multi-language support, or disconnected features.
- 🔵 **P2 (Medium)**: Mocked external services, missing administrative CRUD, or suboptimal fallbacks.
- 🟢 **P3 (Low / Polish)**: UI refinements, UX inconsistencies, and cleanup.

---

## 📑 Summary Matrix

| ID | Module / Area | Issue Summary | Priority | Affected Files |
| :--- | :--- | :--- | :---: | :--- |
| **IW-01** | Backend Gateway | Duplicate route definition for `/api/abdm/qr/decode` causing crash & dead code | 🔴 P0 | `server.ts`, `abdmQrDecoder.ts` |
| **IW-02** | Doctor Console | Doctor Console does not load clicked patient's clinical records from DB | 🔴 P0 | `DoctorConsolePage.tsx`, `PhysicianSummaryConsole.tsx` |
| **IW-03** | Localization | Hardcoded Hindi text & missing translations across 5 regional languages | 🟡 P1 | `mockData.ts`, `SocratesConversationEngine.tsx`, `ConsentScreen.tsx`, `FamilyPersonalHistoryScreen.tsx`, `VitalsCaptureScreen.tsx`, `AyushParikshaCards.tsx`, `SessionPurgeScreen.tsx` |
| **IW-04** | Accessibility | Indian Sign Language Avatar & Display Accessibility toggles unreachable in UI | 🟡 P1 | `PatientHeader.tsx`, `Header.tsx`, `App.tsx`, `SignLanguageAvatar.tsx` |
| **IW-05** | Database Schema | `chief_complaints` table missing Kannada (`kn`) and Marathi (`mr`) columns | 🟡 P1 | `schema.sql`, `setup_db.cjs`, `server.ts` |
| **IW-06** | Patient Intake | Session reset re-introduces Hindi (`'hi'`) instead of default English (`'en'`) | 🟡 P1 | `App.tsx` |
| **IW-07** | Patient Portal | Archive timeline disconnect & placeholder `window.print()` actions | 🔵 P2 | `PatientPortalDashboard.tsx`, `App.tsx` |
| **IW-08** | External Service | Twilio WhatsApp & SMS integration declared in dependencies but unimplemented in backend | 🔵 P2 | `server.ts`, `WhatsAppContinuityModal.tsx`, `package.json` |
| **IW-09** | AI Engine | Gemini summary prompt schema hardcodes `hindiSummary` instead of regional language | 🔵 P2 | `server.ts`, `geminiService.ts` |
| **IW-10** | Data Persistence | Fire-and-forget sub-table encounter persistence without transactional safety | 🔵 P2 | `App.tsx`, `server.ts` |
| **IW-11** | Admin Panel | "Content Management" tab is a static visual mockup without database binding | 🟢 P3 | `AdminPanelPage.tsx` |
| **IW-12** | UX Polish | Raw `alert()` browser popups in intake and clinical summary error handlers | 🟢 P3 | `App.tsx`, `PhysicianSummaryConsole.tsx` |

---

## 🔴 P0: Critical / Blocker Issues

### IW-01: Duplicate Route Definition for `/api/abdm/qr/decode`
- **Location**: [`server.ts`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/server.ts#L331) (Line 331) & [`server.ts`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/server.ts#L1306) (Line 1306)
- **Problem**:
  `server.ts` defines `app.post('/api/abdm/qr/decode', ...)` twice.
  1. **First route (Line 331)** calls `decodeAbhaQr(imageBase64)`. In `abdmQrDecoder.ts`, this attempts to dynamically import `@zxing/library` and `canvas`, neither of which are installed in `package.json`. When called, it throws a MODULE_NOT_FOUND error and returns HTTP 422.
  2. **Second route (Line 1306)** contains the full dual-mode decoder (handling both raw JSON strings and Gemini Vision OCR fallback). Because Express routes are evaluated first-match, the second route is **100% dead code** and is never reached.
- **Impact**: Real camera frame QR decoding fails in production, and Gemini Vision QR decoding fallback is masked.
- **Action Required**:
  - Consolidate both handlers into a single unified `/api/abdm/qr/decode` route in `server.ts`.
  - Install `@zxing/library` or rely on client-side JS decoding (`html5-qrcode` / `jsQR`) or Gemini Vision fallback.
  - Delete the duplicate handler.

---

### IW-02: Doctor Console Fails to Load Encounter Data for Clicked Patients
- **Location**: [`src/components/DoctorConsolePage.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/DoctorConsolePage.tsx#L393) (Line 393)
- **Problem**:
  When a doctor views the OPD Queue table and clicks "Open Patient Console" for any patient token in the list (`selectedToken`):
  ```tsx
  <PhysicianSummaryConsole
    patientProfile={activePatientProfile}
    historyObject={activeHistory}
    documents={activeDocuments}
    selectedLanguage={selectedLanguage}
    onOpenWhatsApp={onOpenWhatsApp}
    onOpenQueue={() => setActiveTab('queue')}
    createdToken={selectedToken || createdToken}
  />
  ```
  The console receives `activePatientProfile`, `activeHistory`, and `activeDocuments`, which belong strictly to the **ephemeral active kiosk session** currently in memory in `App.tsx`.
- **Impact**: If Doctor clicks on Patient B in the queue, they will see Patient A's clinical notes, symptoms, and documents (or blank state if kiosk was reset). It does not query `/api/encounters/:id/...` from MySQL for the clicked patient's persisted records.
- **Action Required**:
  - Implement a `fetchPatientEncounterDetails(encounterId)` endpoint in `server.ts` or repository.
  - In `DoctorConsolePage.tsx`, when `selectedToken` changes, fetch and populate the target patient's profile, Socrates assessment, AYUSH details, vitals, and documents.

---

## 🟡 P1: High Priority Issues

### IW-03: Localization Gaps & Hardcoded Hindi Subtitles
- **Locations**:
  - [`src/components/SocratesConversationEngine.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/SocratesConversationEngine.tsx#L263) (Line 263): `{currentQ.titleHi && <p>{currentQ.titleHi}</p>}` renders unconditionally.
  - [`src/data/mockData.ts`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/data/mockData.ts): All complaints and SOCRATES questions only have `title` (English) and `titleHi` (Hindi). There are **no Telugu, Tamil, Kannada, Malayalam, or Marathi translations** for questions, subtitle hints, or options.
  - [`src/components/ConsentScreen.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/ConsentScreen.tsx#L88-L94): Header hardcodes `Step 1b: DPDP Patient Consent / सहमति पत्र` and Hindi summary.
  - [`src/components/FamilyPersonalHistoryScreen.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/FamilyPersonalHistoryScreen.tsx#L81-L91): Hardcodes Hindi banners and `labelHi`.
  - [`src/components/VitalsCaptureScreen.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/VitalsCaptureScreen.tsx#L33): Vitals fields provide `labelHi` only.
  - [`src/components/AyushParikshaCards.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/AyushParikshaCards.tsx#L205): Hardcodes Hindi descriptions and Dosha names `(वात)`, `(पित्त)`, `(कफ)`.
  - [`src/components/SessionPurgeScreen.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/SessionPurgeScreen.tsx#L58): Hardcodes Hindi DPDP banner.
- **Problem**: The system was restricted to 6 specific languages (English, Telugu, Tamil, Kannada, Malayalam, Marathi) and Hindi was removed. However, the UI continues to render Hindi text beneath English prompts when regional languages are chosen.
- **Action Required**:
  - Remove all hardcoded Hindi subtitle strings.
  - Add regional translation dictionaries in `i18n.ts` or `mockData.ts` for all 5 regional languages.
  - Update components to dynamically pick `currentQ.translations?.[selectedLanguage] || currentQ.title`.

---

### IW-04: Unreachable Sign Language Avatar & Accessibility Controls
- **Locations**:
  - [`src/components/PatientHeader.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/PatientHeader.tsx)
  - [`src/components/SignLanguageAvatar.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/SignLanguageAvatar.tsx)
  - [`src/App.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/App.tsx#L61-L64)
- **Problem**:
  - In `App.tsx`: `const [isSignAvatar, setIsSignAvatar] = useState(false);`
  - In `App.tsx`: `const [isHighContrast, setIsHighContrast] = useState(false);`
  - In `App.tsx`: `const [isLargeFont, setIsLargeFont] = useState(false);`
  - The `SignLanguageAvatar` component is fully coded with Indian Sign Language (ISL) poses and gloss lines for every step. However, **there is no button or trigger in `PatientHeader` or anywhere in the UI to enable it**.
  - Similarly, high contrast and large font CSS classes exist on the root container, but there are no controls for elderly or visually impaired users to toggle them.
- **Action Required**:
  - Add accessibility buttons to `PatientHeader.tsx`:
    - 🧏 **ISL Avatar** toggle
    - 👁️ **High Contrast** toggle
    - 🔠 **Large Font (A+)** toggle
  - Wire these callbacks directly to `setIsSignAvatar`, `setIsHighContrast`, and `setIsLargeFont` in `App.tsx`.

---

### IW-05: Database Schema Missing Kannada (`kn`) and Marathi (`mr`) Columns
- **Location**: [`schema.sql`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/schema.sql#L74-L89) (Lines 74-89)
- **Problem**:
  The `chief_complaints` table schema is defined as:
  ```sql
  CREATE TABLE chief_complaints (
    id VARCHAR(36) PRIMARY KEY,
    complaint_key VARCHAR(100) UNIQUE NOT NULL,
    display_name_en VARCHAR(255) NOT NULL,
    display_name_hi VARCHAR(255),
    display_name_ta VARCHAR(255),
    display_name_te VARCHAR(255),
    display_name_ml VARCHAR(255),
    ...
  ```
  It contains `display_name_hi`, `display_name_ta`, `display_name_te`, and `display_name_ml`, but **lacks `display_name_kn` (Kannada) and `display_name_mr` (Marathi)**.
- **Action Required**:
  - Add `display_name_kn` and `display_name_mr` columns to `schema.sql`.
  - Create a migration script (or update `setup_db.cjs`) to alter existing tables and populate Kannada and Marathi complaint names.

---

### IW-06: Session Reset Re-introduces Hindi Language State
- **Location**: [`src/App.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/App.tsx#L268) (Line 268)
- **Problem**:
  In `handleResetKiosk()`:
  ```typescript
  const handleResetKiosk = () => {
    setCurrentStep('LANGUAGE');
    setSelectedLanguage('hi'); // <-- Bug: Resets to Hindi
    ...
  ```
  When a patient finishes or taps "START OVER", the app resets `selectedLanguage` to `'hi'`, which is no longer a supported kiosk language.
- **Action Required**: Change default reset language to `'en'`.

---

## 🔵 P2: Medium Priority Issues

### IW-07: Patient Portal Archive Disconnect & Placeholder Print
- **Location**: [`src/components/PatientPortalDashboard.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/PatientPortalDashboard.tsx#L13) & Lines 206, 214
- **Problem**:
  1. `PatientPortalDashboard.tsx` reads records from `localStorage.getItem('medikiosk_fhir_archive')`. However, neither `App.tsx` nor `PhysicianSummaryConsole.tsx` saves completed encounter bundles to that key. As a result, the portal always displays "No Digitized Records Yet" unless manually seeded.
  2. The buttons "Print / View Full Record" and "Download PDF" both execute `window.print()` instead of generating a targeted patient clinical summary or PDF discharge record.
- **Action Required**:
  - Write FHIR bundles or encounter records to `medikiosk_fhir_archive` in `localStorage` upon intake completion.
  - Implement a dedicated printable modal or use `jspdf` (already in `package.json`) to generate a clean downloadable Patient OPD Summary slip.

---

### IW-08: Twilio WhatsApp & SMS Integration Missing in Backend
- **Locations**:
  - `server.ts`
  - [`src/components/WhatsAppContinuityModal.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/WhatsAppContinuityModal.tsx)
  - `package.json` (defines `"twilio": "^6.1.0"`)
  - `.env.example` (defines `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`)
- **Problem**:
  Although `twilio` is installed in `dependencies` and environment variable hooks are documented, there are **no Express endpoints** in `server.ts` to trigger WhatsApp messages or SMS. `WhatsAppContinuityModal.tsx` is an isolated UI simulation with local state (`setExtraMessages`).
- **Action Required**:
  - Add `POST /api/notifications/whatsapp` and `POST /api/notifications/sms` endpoints in `server.ts`.
  - Use the Twilio SDK when credentials exist, and fallback to simulation when credentials are blank.
  - Wire `WhatsAppContinuityModal` to call this endpoint when the user sends a message or requests prescription dispatch.

---

### IW-09: AI Summary Prompt Schema Hardcodes `hindiSummary`
- **Location**: [`server.ts`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/server.ts#L980) (Line 980 & Line 1017)
- **Problem**:
  The Gemini clinical summarizer prompt in `/api/gemini/summarize` specifies:
  ```json
  "hindiSummary": string
  ```
  Similarly, the fallback note returns `hindiSummary: 'रोगी ... के लक्षणों के साथ उपस्थित हुआ है।'`.
  The summary should be in the patient's selected regional language (`regionalSummary`) rather than fixed to Hindi.
- **Action Required**:
  - Update schema key from `hindiSummary` to `regionalSummary` or `patientLanguageSummary`.
  - Update the prompt to ask Gemini to generate the summary in `${language}`.

---

### IW-10: Fire-and-Forget Encounter Sub-Table Persistence
- **Location**: [`src/App.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/App.tsx#L174-L216) (Lines 174-216)
- **Problem**:
  In `triggerRedFlagQueueElevate()`, after creating the queue token, the app fires five separate asynchronous fetch calls (`/vitals`, `/socrates`, `/ayush`, `/history`, `/documents`) with empty `.catch(() => {})` handlers.
  If network hiccups or server restarts occur midway:
  - The token exists in `queue_tokens`, but related records (e.g. vitals or SOCRATES responses) may be missing in MySQL without error surfacing.
- **Action Required**:
  - Create a single atomic transaction endpoint: `POST /api/encounters/complete` that inserts encounter, vitals, socrates, ayush, history, and token within a single MySQL transaction (`START TRANSACTION ... COMMIT`).

---

## 🟢 P3: Low Priority / Polish

### IW-11: Admin Panel "Content Management" Tab Is a Static Visual Mockup
- **Location**: [`src/components/AdminPanelPage.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/AdminPanelPage.tsx#L513-L572) (Lines 513-572)
- **Problem**:
  The "Content Management" tab in the Admin Panel shows hardcoded cards stating "12 Languages" and listing static SOCRATES complaints. There is no CRUD interface or backend API to add/edit/disable chief complaints or languages.
- **Action Required**:
  - Connect the tab to `/api/chief-complaints` and `/api/languages` to allow administrators to toggle active complaints and edit display text.

---

### IW-12: Raw Browser `alert()` Calls in Error Handlers
- **Locations**:
  - [`src/App.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/App.tsx#L262): `alert("Failed to create token. Please try again.");`
  - [`src/components/PhysicianSummaryConsole.tsx`](file:///c:/Users/Nanda%20Kishore/OneDrive/Desktop/SSK/medikiosk+/src/components/PhysicianSummaryConsole.tsx#L87): `alert("Failed to generate clinical summary. Please try again.");`
- **Problem**:
  The rest of the application follows a modern kiosk design principle using inline dismissible banners. These raw browser `alert()` modals freeze the touch interface on physical kiosk touchscreens.
- **Action Required**:
  - Replace `alert()` calls with inline error banners or toast notifications.

---

## 🎯 Recommended Remediation Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Critical Fixes
        A1[IW-01: Unify QR Decode Route] --> A2[IW-02: Doctor Console Patient DB Lookup]
        A2 --> A3[IW-06: Fix Language Reset to English]
    end

    subgraph Phase 2: Localization & Accessibility
        B1[IW-03: Regional 6-Language Content & Purge Hindi Hardcodes]
        B2[IW-05: Add Kannada & Marathi DB Schema Columns]
        B3[IW-04: Wire ISL Avatar, High Contrast & Large Font Toggles]
    end

    subgraph Phase 3: Architecture & Integrity
        C1[IW-10: Atomic Encounter Persistence Endpoint]
        C2[IW-07: Patient Portal Archive Sync & Real PDF Download]
        C3[IW-09: Dynamic Regional AI Summary in Gemini]
        C4[IW-08: Twilio Notification Backend Service]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

---

*This document is maintained as the authoritative register of pending technical work for MediKiosk+.*
