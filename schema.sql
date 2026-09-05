-- ==========================================================
-- MediKiosk+ Production Database Schema
-- Database: MySQL 8.0+
-- Ready for direct execution in MySQL Workbench
-- ==========================================================

CREATE DATABASE IF NOT EXISTS medikiosk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medikiosk;

-- Disable foreign key checks during schema creation/resets
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. Patients Master Table
-- ----------------------------------------------------------
DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
  id VARCHAR(36) PRIMARY KEY,
  abha_id VARCHAR(30) UNIQUE,
  aadhaar_last4 CHAR(4),
  full_name VARCHAR(255) NOT NULL,
  age INT,
  gender ENUM('Male', 'Female', 'Other', 'Prefer not to say') DEFAULT 'Prefer not to say',
  dob DATE,
  blood_group VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patients_abha (abha_id),
  INDEX idx_patients_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. Kiosk Stations
-- ----------------------------------------------------------
DROP TABLE IF EXISTS kiosk_stations;
CREATE TABLE kiosk_stations (
  id VARCHAR(36) PRIMARY KEY,
  station_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  hospital_name VARCHAR(255) NOT NULL,
  department VARCHAR(100) DEFAULT 'OPD Triage',
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Supported Languages
-- ----------------------------------------------------------
DROP TABLE IF EXISTS supported_languages;
CREATE TABLE supported_languages (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  bcp47 VARCHAR(20) NOT NULL,
  flag_emoji VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Chief Complaints Master
-- ----------------------------------------------------------
DROP TABLE IF EXISTS chief_complaints;
CREATE TABLE chief_complaints (
  id VARCHAR(36) PRIMARY KEY,
  complaint_key VARCHAR(100) UNIQUE NOT NULL,
  display_name_en VARCHAR(255) NOT NULL,
  display_name_hi VARCHAR(255),
  display_name_ta VARCHAR(255),
  display_name_te VARCHAR(255),
  display_name_ml VARCHAR(255),
  icon VARCHAR(50),
  color_class VARCHAR(100),
  opd_type ENUM('allopathic', 'ayurveda', 'both') DEFAULT 'both',
  is_red_flag_trigger BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. Encounters / Triage Visits
-- ----------------------------------------------------------
DROP TABLE IF EXISTS encounters;
CREATE TABLE encounters (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  kiosk_station_id VARCHAR(36),
  opd_type ENUM('allopathic', 'ayurveda') NOT NULL,
  chief_complaint_id VARCHAR(100),
  chief_complaint_text VARCHAR(500),
  language_code VARCHAR(10) DEFAULT 'en',
  consent_given BOOLEAN DEFAULT FALSE,
  consent_abha BOOLEAN DEFAULT FALSE,
  consent_data_processing BOOLEAN DEFAULT FALSE,
  consent_anonymous_research BOOLEAN DEFAULT FALSE,
  status ENUM('in_progress', 'awaiting_doctor', 'with_doctor', 'complete', 'abandoned') DEFAULT 'in_progress',
  arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_time TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_encounters_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_encounters_kiosk FOREIGN KEY (kiosk_station_id) REFERENCES kiosk_stations(id) ON DELETE SET NULL,
  INDEX idx_encounters_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. Queue Tokens
-- ----------------------------------------------------------
DROP TABLE IF EXISTS queue_tokens;
CREATE TABLE queue_tokens (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  token_number INT NOT NULL,
  priority_level ENUM('CRITICAL', 'HIGH', 'NORMAL', 'LOW') DEFAULT 'NORMAL',
  is_red_flag BOOLEAN DEFAULT FALSE,
  red_flag_reason VARCHAR(500),
  room_number VARCHAR(100),
  doctor_name VARCHAR(255),
  estimated_wait_minutes INT DEFAULT 15,
  status ENUM('WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED') DEFAULT 'WAITING',
  called_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tokens_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  INDEX idx_tokens_status_priority (status, priority_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. Patient Vitals
-- ----------------------------------------------------------
DROP TABLE IF EXISTS vitals;
CREATE TABLE vitals (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  systolic_bp INT,
  diastolic_bp INT,
  heart_rate INT,
  spo2 DECIMAL(5,2),
  temperature DECIMAL(5,2),
  weight DECIMAL(6,2),
  height DECIMAL(6,2),
  bmi DECIMAL(5,2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vitals_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. SOCRATES Clinical Assessments
-- ----------------------------------------------------------
DROP TABLE IF EXISTS socrates_assessments;
CREATE TABLE socrates_assessments (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  site TEXT,
  onset TEXT,
  character_pain TEXT,
  radiation TEXT,
  associations TEXT,
  timing TEXT,
  exacerbating_factors TEXT,
  severity INT CHECK (severity BETWEEN 0 AND 10),
  raw_responses JSON,
  red_flags_triggered JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_socrates_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. Clinical History (Family, Personal, Obstetric)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS clinical_history;
CREATE TABLE clinical_history (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  family_history JSON,
  personal_history JSON,
  social_history JSON,
  obstetric_history JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10. AYUSH Assessments
-- ----------------------------------------------------------
DROP TABLE IF EXISTS ayush_assessments;
CREATE TABLE ayush_assessments (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  prakriti VARCHAR(100),
  agni VARCHAR(50),
  koshtha VARCHAR(50),
  vata_score INT DEFAULT 0,
  pitta_score INT DEFAULT 0,
  kapha_score INT DEFAULT 0,
  dosha_imbalance VARCHAR(255),
  chikitsa_guidance TEXT,
  nadi_image_url VARCHAR(500),
  tongue_image_url VARCHAR(500),
  card_responses JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ayush_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 11. Digitized Documents
-- ----------------------------------------------------------
DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36) NOT NULL,
  document_type ENUM('prescription', 'lab_report', 'discharge_summary', 'other') DEFAULT 'prescription',
  hospital_or_clinic VARCHAR(255),
  doctor_name VARCHAR(255),
  document_date DATE,
  raw_ocr_text LONGTEXT,
  parsed_data JSON,
  storage_url VARCHAR(500),
  ocr_confidence DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_docs_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  CONSTRAINT fk_docs_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 12. Clinical Summaries
-- ----------------------------------------------------------
DROP TABLE IF EXISTS clinical_summaries;
CREATE TABLE clinical_summaries (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  hpi LONGTEXT,
  hpi_hindi LONGTEXT,
  differential_diagnosis JSON,
  provisional_plan TEXT,
  red_flags JSON,
  drug_interactions JSON,
  fhir_bundle_id VARCHAR(255),
  fhir_push_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  abdm_transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_summaries_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 13. Physician Corrections Audit Trail
-- ----------------------------------------------------------
DROP TABLE IF EXISTS physician_corrections;
CREATE TABLE physician_corrections (
  id VARCHAR(36) PRIMARY KEY,
  encounter_id VARCHAR(36) NOT NULL,
  physician_id VARCHAR(100) NOT NULL,
  section VARCHAR(100) NOT NULL,
  original_value LONGTEXT,
  corrected_value LONGTEXT,
  correction_notes TEXT,
  corrected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_corrections_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 14. Session Telemetry & Analytics
-- ----------------------------------------------------------
DROP TABLE IF EXISTS session_telemetry;
CREATE TABLE session_telemetry (
  id VARCHAR(36) PRIMARY KEY,
  kiosk_station_id VARCHAR(36),
  encounter_id VARCHAR(36),
  event_type VARCHAR(100) NOT NULL,
  event_data JSON,
  session_duration_seconds INT DEFAULT 0,
  step_reached VARCHAR(50),
  abandoned BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_telemetry_event (event_type, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 15. ABHA Registrations & OTP Records
-- ----------------------------------------------------------
DROP TABLE IF EXISTS abha_registrations;
CREATE TABLE abha_registrations (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  aadhaar_last4 CHAR(4),
  mobile_number VARCHAR(20),
  otp_sent_at TIMESTAMP NULL,
  otp_verified BOOLEAN DEFAULT FALSE,
  abha_id VARCHAR(30),
  abha_address VARCHAR(255),
  abdm_transaction_id VARCHAR(255),
  status ENUM('otp_sent', 'verified', 'failed') DEFAULT 'otp_sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED INITIAL DATA
-- ==========================================================

INSERT INTO kiosk_stations (id, station_code, display_name, hospital_name, department, location)
VALUES ('stn-001', 'PS-26047', 'Station #K-04 (OPD Triage)', 'AIIMS OPD Health Desk', 'General & AYUSH OPD', 'Ground Floor, Block B')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

INSERT INTO supported_languages (id, code, name, native_name, bcp47, flag_emoji, sort_order) VALUES
('lang-en', 'en', 'English', 'English', 'en-IN', '🇬🇧', 1),
('lang-hi', 'hi', 'Hindi', 'हिन्दी', 'hi-IN', '🇮🇳', 2),
('lang-ta', 'ta', 'Tamil', 'தமிழ்', 'ta-IN', '🇮🇳', 3),
('lang-te', 'te', 'Telugu', 'తెలుగు', 'te-IN', '🇮🇳', 4),
('lang-kn', 'kn', 'Kannada', 'ಕನ್ನಡ', 'kn-IN', '🇮🇳', 5),
('lang-ml', 'ml', 'Malayalam', 'മലയാളം', 'ml-IN', '🇮🇳', 6),
('lang-mr', 'mr', 'Marathi', 'मराठी', 'mr-IN', '🇮🇳', 7),
('lang-bn', 'bn', 'Bengali', 'বাংলা', 'bn-IN', '🇮🇳', 8),
('lang-gu', 'gu', 'Gujarati', 'ગુજરાતી', 'gu-IN', '🇮🇳', 9),
('lang-pa', 'pa', 'Punjabi', 'ਪੰਜਾਬੀ', 'pa-IN', '🇮🇳', 10),
('lang-or', 'or', 'Odia', 'ଓଡ଼ିଆ', 'or-IN', '🇮🇳', 11),
('lang-as', 'as', 'Assamese', 'অসমীয়া', 'as-IN', '🇮🇳', 12)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO chief_complaints (id, complaint_key, display_name_en, display_name_hi, icon, color_class, opd_type, is_red_flag_trigger, sort_order) VALUES
('cmp-01', 'chest_pain', 'Chest Pain / Discomfort', 'सीने में दर्द या भारीपन', 'Activity', 'text-rose-600 bg-rose-50 border-rose-200', 'both', TRUE, 1),
('cmp-02', 'breathlessness', 'Shortness of Breath', 'सांस लेने में तकलीफ', 'Wind', 'text-amber-600 bg-amber-50 border-amber-200', 'both', TRUE, 2),
('cmp-03', 'abdominal_pain', 'Abdominal Pain / Acidity', 'पेट दर्द या गैस/एसिडिटी', 'ShieldAlert', 'text-orange-600 bg-orange-50 border-orange-200', 'both', FALSE, 3),
('cmp-04', 'joint_pain', 'Joint / Knee Pain (Sandhivata)', 'जोड़ों का दर्द / गठिया', 'Bone', 'text-blue-600 bg-blue-50 border-blue-200', 'ayurveda', FALSE, 4),
('cmp-05', 'fever_chills', 'Fever & Chills', 'बुखार और ठंड लगना', 'Thermometer', 'text-red-500 bg-red-50 border-red-200', 'allopathic', FALSE, 5),
('cmp-06', 'headache_dizzy', 'Severe Headache or Dizziness', 'गंभीर सिरदर्द या चक्कर', 'Zap', 'text-purple-600 bg-purple-50 border-purple-200', 'both', FALSE, 6),
('cmp-07', 'skin_rash', 'Skin Rash / Itching (Kushtha)', 'त्वचा रोग / खुजली', 'Sparkles', 'text-emerald-600 bg-emerald-50 border-emerald-200', 'ayurveda', FALSE, 7),
('cmp-08', 'digestive_issues', 'Indigestion / Constipation (Agni Mandya)', 'अपच या कब्ज', 'Apple', 'text-teal-600 bg-teal-50 border-teal-200', 'ayurveda', FALSE, 8)
ON DUPLICATE KEY UPDATE display_name_en=VALUES(display_name_en);

-- ----------------------------------------------------------
-- 16. Staff / Doctor / Admin Users
-- ----------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id            VARCHAR(36)   PRIMARY KEY,
  username      VARCHAR(100)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin','doctor','staff') NOT NULL DEFAULT 'staff',
  full_name     VARCHAR(255)  NOT NULL,
  employee_id   VARCHAR(50)   UNIQUE,
  department    VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 17. User Sessions (JWT token management / audit)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
  id            VARCHAR(36)   PRIMARY KEY,
  user_id       VARCHAR(36)   NOT NULL,
  token_hash    VARCHAR(512)  NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  expires_at    DATETIME      NOT NULL,
  revoked       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 18. Queue Reprioritisations (doctor priority override audit)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS queue_reprioritizations;
CREATE TABLE queue_reprioritizations (
  id               VARCHAR(36)  PRIMARY KEY,
  token_id         VARCHAR(36)  NOT NULL,
  old_position     INT          NOT NULL,
  new_position     INT          NOT NULL,
  reason           VARCHAR(500),
  performed_by     VARCHAR(36),
  performed_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 19. System Health Logs
-- ----------------------------------------------------------
DROP TABLE IF EXISTS system_health_logs;
CREATE TABLE system_health_logs (
  id              VARCHAR(36)   PRIMARY KEY,
  service_name    VARCHAR(100)  NOT NULL,
  status          ENUM('healthy','degraded','down') NOT NULL DEFAULT 'healthy',
  response_ms     INT,
  detail          TEXT,
  checked_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 20. Content Questions (admin-managed SOCRATES & intake)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS content_questions;
CREATE TABLE content_questions (
  id              VARCHAR(36)   PRIMARY KEY,
  complaint_key   VARCHAR(100)  NOT NULL,
  question_key    VARCHAR(100)  NOT NULL,
  stage           ENUM('SOCRATES','AYUSH','HISTORY','INTAKE') NOT NULL DEFAULT 'SOCRATES',
  question_en     TEXT          NOT NULL,
  question_hi     TEXT,
  question_ta     TEXT,
  question_te     TEXT,
  question_bn     TEXT,
  question_mr     TEXT,
  question_gu     TEXT,
  question_kn     TEXT,
  question_pa     TEXT,
  question_ml     TEXT,
  question_or     TEXT,
  question_as     TEXT,
  answer_type     ENUM('text','options','scale','boolean','multi') NOT NULL DEFAULT 'text',
  options_json    JSON,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order      INT           NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_complaint_key (complaint_key, question_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 21. Consent Texts (admin-managed per language)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS consent_texts;
CREATE TABLE consent_texts (
  id              VARCHAR(36)   PRIMARY KEY,
  lang_code       VARCHAR(10)   NOT NULL,
  section_key     VARCHAR(100)  NOT NULL,
  content_text    TEXT          NOT NULL,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lang_section (lang_code, section_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 22. Staff Actions Audit Log
-- ----------------------------------------------------------
DROP TABLE IF EXISTS staff_actions;
CREATE TABLE staff_actions (
  id              VARCHAR(36)   PRIMARY KEY,
  user_id         VARCHAR(36)   NOT NULL,
  action_type     VARCHAR(100)  NOT NULL,
  entity_type     VARCHAR(100),
  entity_id       VARCHAR(36),
  description     TEXT,
  ip_address      VARCHAR(45),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Default User Seeds
-- ----------------------------------------------------------
INSERT INTO users (id, username, password_hash, role, full_name, employee_id, department) VALUES
  ('usr-admin-001', 'admin', '$2b$10$3zM9W51W4L67sJ88O1e4h.gM947dKiq91mN2Kq7K9b9Nq0M1u2Zvy', 'admin', 'System Administrator', 'EMP-001', 'IT Administration'),
  ('usr-doc-001',   'doctor1', '$2b$10$3zM9W51W4L67sJ88O1e4h.gM947dKiq91mN2Kq7K9b9Nq0M1u2Zvy', 'doctor', 'Dr. Priya Sharma (MD)', 'DOC-001', 'General Medicine'),
  ('usr-staff-001', 'staff1', '$2b$10$3zM9W51W4L67sJ88O1e4h.gM947dKiq91mN2Kq7K9b9Nq0M1u2Zvy', 'staff',  'Sister Anita Rao (Staff Nurse)', 'STF-001', 'Triage & OPD')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

SET FOREIGN_KEY_CHECKS = 1;


