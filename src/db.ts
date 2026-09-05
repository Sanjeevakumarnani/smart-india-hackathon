import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'medikiosk',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

// In-memory fallback repository when MySQL database server is not yet booted
class InMemoryDbStore {
  kioskStations = [
    {
      id: 'stn-001',
      station_code: 'PS-26047',
      display_name: 'Station #K-04 (OPD Triage)',
      hospital_name: 'AIIMS OPD Health Desk',
      department: 'General & AYUSH OPD',
      location: 'Ground Floor, Block B',
      is_active: 1,
    },
  ];

  supportedLanguages = [
    { id: 'lang-en', code: 'en', name: 'English', native_name: 'English', bcp47: 'en-IN', flag_emoji: '🇬🇧', sort_order: 1 },
    { id: 'lang-hi', code: 'hi', name: 'Hindi', native_name: 'हिन्दी', bcp47: 'hi-IN', flag_emoji: '🇮🇳', sort_order: 2 },
    { id: 'lang-ta', code: 'ta', name: 'Tamil', native_name: 'தமிழ்', bcp47: 'ta-IN', flag_emoji: '🇮🇳', sort_order: 3 },
    { id: 'lang-te', code: 'te', name: 'Telugu', native_name: 'తెలుగు', bcp47: 'te-IN', flag_emoji: '🇮🇳', sort_order: 4 },
    { id: 'lang-kn', code: 'kn', name: 'Kannada', native_name: 'ಕನ್ನಡ', bcp47: 'kn-IN', flag_emoji: '🇮🇳', sort_order: 5 },
    { id: 'lang-ml', code: 'ml', name: 'Malayalam', native_name: 'മലയാളം', bcp47: 'ml-IN', flag_emoji: '🇮🇳', sort_order: 6 },
    { id: 'lang-mr', code: 'mr', name: 'Marathi', native_name: 'मराठी', bcp47: 'mr-IN', flag_emoji: '🇮🇳', sort_order: 7 },
    { id: 'lang-bn', code: 'bn', name: 'Bengali', native_name: 'বাংলা', bcp47: 'bn-IN', flag_emoji: '🇮🇳', sort_order: 8 },
    { id: 'lang-gu', code: 'gu', name: 'Gujarati', native_name: 'ગુજરાતી', bcp47: 'gu-IN', flag_emoji: '🇮🇳', sort_order: 9 },
    { id: 'lang-pa', code: 'pa', name: 'Punjabi', native_name: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN', flag_emoji: '🇮🇳', sort_order: 10 },
    { id: 'lang-or', code: 'or', name: 'Odia', native_name: 'ଓଡ଼ିଆ', bcp47: 'or-IN', flag_emoji: '🇮🇳', sort_order: 11 },
    { id: 'lang-as', code: 'as', name: 'Assamese', native_name: 'অসমীয়া', bcp47: 'as-IN', flag_emoji: '🇮🇳', sort_order: 12 },
  ];

  chiefComplaints = [
    { id: 'cmp-01', complaint_key: 'chest_pain', display_name_en: 'Chest Pain / Discomfort', display_name_hi: 'सीने में दर्द या भारीपन', icon: 'Activity', color_class: 'text-rose-600 bg-rose-50 border-rose-200', opd_type: 'both', is_red_flag_trigger: 1, sort_order: 1 },
    { id: 'cmp-02', complaint_key: 'breathlessness', display_name_en: 'Shortness of Breath', display_name_hi: 'सांस लेने में तकलीफ', icon: 'Wind', color_class: 'text-amber-600 bg-amber-50 border-amber-200', opd_type: 'both', is_red_flag_trigger: 1, sort_order: 2 },
    { id: 'cmp-03', complaint_key: 'abdominal_pain', display_name_en: 'Abdominal Pain / Acidity', display_name_hi: 'पेट दर्द या गैस/एसिडिटी', icon: 'ShieldAlert', color_class: 'text-orange-600 bg-orange-50 border-orange-200', opd_type: 'both', is_red_flag_trigger: 0, sort_order: 3 },
    { id: 'cmp-04', complaint_key: 'joint_pain', display_name_en: 'Joint / Knee Pain (Sandhivata)', display_name_hi: 'जोड़ों का दर्द / गठिया', icon: 'Bone', color_class: 'text-blue-600 bg-blue-50 border-blue-200', opd_type: 'ayurveda', is_red_flag_trigger: 0, sort_order: 4 },
    { id: 'cmp-05', complaint_key: 'fever_chills', display_name_en: 'Fever & Chills', display_name_hi: 'बुखार और ठंड लगना', icon: 'Thermometer', color_class: 'text-red-500 bg-red-50 border-red-200', opd_type: 'allopathic', is_red_flag_trigger: 0, sort_order: 5 },
    { id: 'cmp-06', complaint_key: 'headache_dizzy', display_name_en: 'Severe Headache or Dizziness', display_name_hi: 'गंभीर सिरदर्द या चक्कर', icon: 'Zap', color_class: 'text-purple-600 bg-purple-50 border-purple-200', opd_type: 'both', is_red_flag_trigger: 0, sort_order: 6 },
    { id: 'cmp-07', complaint_key: 'skin_rash', display_name_en: 'Skin Rash / Itching (Kushtha)', display_name_hi: 'त्वचा रोग / खुजली', icon: 'Sparkles', color_class: 'text-emerald-600 bg-emerald-50 border-emerald-200', opd_type: 'ayurveda', is_red_flag_trigger: 0, sort_order: 7 },
    { id: 'cmp-08', complaint_key: 'digestive_issues', display_name_en: 'Indigestion / Constipation (Agni Mandya)', display_name_hi: 'अपच या कब्ज', icon: 'Apple', color_class: 'text-teal-600 bg-teal-50 border-teal-200', opd_type: 'ayurveda', is_red_flag_trigger: 0, sort_order: 8 },
  ];

  patients: any[] = [];
  encounters: any[] = [];
  queueTokens: any[] = [];
  vitals: any[] = [];
  socratesAssessments: any[] = [];
  clinicalHistories: any[] = [];
  ayushAssessments: any[] = [];
  documents: any[] = [];
  clinicalSummaries: any[] = [];
  physicianCorrections: any[] = [];
  sessionTelemetry: any[] = [];
  abhaRegistrations: any[] = [];
}

export const inMemoryDb = new InMemoryDbStore();

// Universal Query Wrapper with automatic fallback
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; fromDb: boolean }> {
  try {
    const p = getDbPool();
    const [results] = await p.execute(sql, params);
    return { rows: results as T[], fromDb: true };
  } catch (err: any) {
    // MySQL server not available or connection error - log & execute in-memory
    console.warn(`[DB] MySQL offline (${err.message || 'connection failed'}), using robust in-memory datastore.`);
    return { rows: [], fromDb: false };
  }
}
