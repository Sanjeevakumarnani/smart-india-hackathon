import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
import { DEMO_PATIENTS } from './data/demoPatients';

dotenv.config();

let pool: mysql.Pool | null = null;

// Managed cloud providers (Aiven, PlanetScale, DigitalOcean, Render agents, …)
// frequently require TLS. Enable with DB_SSL=true; optionally pin the CA cert
// via DB_SSL_CA and relax certificate validation with
// DB_SSL_REJECT_UNAUTHORIZED=false only when the provider requires it.
function buildSslConfig(): mysql.ConnectionOptions['ssl'] | undefined {
  if (process.env.DB_SSL !== 'true') return undefined;
  const caValue = process.env.DB_SSL_CA;
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  if (caValue) {
    try {
      // DB_SSL_CA may be a PEM certificate passed inline through an env var
      // (cloud deploy) or a file path (local deploy).
      const ca = caValue.startsWith('-----BEGIN') ? caValue : fs.readFileSync(caValue);
      return { ca, rejectUnauthorized };
    } catch (err: any) {
      throw new Error(`DB_SSL_CA is not readable (${caValue.slice(0, 30)}…): ${err?.message}`);
    }
  }
  return { rejectUnauthorized };
}

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
      connectTimeout: 10000,
      ...(buildSslConfig() ? { ssl: buildSslConfig() } : {}),
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
    { id: 'lang-ta', code: 'ta', name: 'Tamil', native_name: 'தமிழ்', bcp47: 'ta-IN', flag_emoji: '🇮🇳', sort_order: 2 },
    { id: 'lang-te', code: 'te', name: 'Telugu', native_name: 'తెలుగు', bcp47: 'te-IN', flag_emoji: '🇮🇳', sort_order: 3 },
    { id: 'lang-ml', code: 'ml', name: 'Malayalam', native_name: 'മലയാളം', bcp47: 'ml-IN', flag_emoji: '🇮🇳', sort_order: 4 },
    { id: 'lang-mr', code: 'mr', name: 'Marathi', native_name: 'मराठी', bcp47: 'mr-IN', flag_emoji: '🇮🇳', sort_order: 5 },
    { id: 'lang-kn', code: 'kn', name: 'Kannada', native_name: 'ಕನ್ನಡ', bcp47: 'kn-IN', flag_emoji: '🇮🇳', sort_order: 6 },
  ];

  chiefComplaints = [
    { id: 'cmp-01', complaint_key: 'chest_pain', display_name_en: 'Chest Pain / Discomfort', display_name_hi: 'सीने में दर्द या भारीपन', display_name_te: 'ఛాతీ నొప్పి / అసౌకర్యం', display_name_ta: 'மார்பு வலி / அசௌகரியம்', display_name_kn: 'ಎದೆ ನೋವು / ಅಸ್ವಸ್ಥತೆ', display_name_ml: 'നെഞ്ചുവേദന / അസ്വസ്ഥത', display_name_mr: 'छातीत दुखणे / अस्वस्थता', icon: 'Activity', color_class: 'text-rose-600 bg-rose-50 border-rose-200', opd_type: 'both', is_red_flag_trigger: 1, sort_order: 1, is_active: 1 },
    { id: 'cmp-02', complaint_key: 'breathlessness', display_name_en: 'Shortness of Breath', display_name_hi: 'सांस लेने में तकलीफ', display_name_te: 'శ్వాస ఆడకపోవడం', display_name_ta: 'மூச்சுத்திணறல்', display_name_kn: 'ಉಸಿರಾಟದ ತೊಂದರೆ', display_name_ml: 'ശ്വാസമെടുക്കാൻ ബുദ്ധിമുട്ട്', display_name_mr: 'श्वास घेण्यास त्रास', icon: 'Wind', color_class: 'text-amber-600 bg-amber-50 border-amber-200', opd_type: 'both', is_red_flag_trigger: 1, sort_order: 2, is_active: 1 },
    { id: 'cmp-03', complaint_key: 'abdominal_pain', display_name_en: 'Abdominal Pain / Acidity', display_name_hi: 'पेट दर्द या गैस/एसिडिटी', display_name_te: 'కడుపు నొప్పి / ఎసిడిటీ', display_name_ta: 'வயிற்று வலி / அசிடிட்டி', display_name_kn: 'ಹೊಟ್ಟೆ ನೋವು / ಆಮ್ಲೀಯತೆ', display_name_ml: 'വയറുവേദന / അസിഡിറ്റി', display_name_mr: 'पोटदुखी / ॲसिडिटी', icon: 'ShieldAlert', color_class: 'text-orange-600 bg-orange-50 border-orange-200', opd_type: 'both', is_red_flag_trigger: 0, sort_order: 3, is_active: 1 },
    { id: 'cmp-04', complaint_key: 'joint_pain', display_name_en: 'Joint / Knee Pain (Sandhivata)', display_name_hi: 'जोड़ों का दर्द / गठिया', display_name_te: 'కీళ్ల / మోకాలి నొప్పి', display_name_ta: 'மூட்டு / முழங்கால் வலி', display_name_kn: 'ಕೀಲು / ಮೊಣಕಾಲು ನೋವು', display_name_ml: 'സന്ധി / കാൽമുട്ട് വേദന', display_name_mr: 'सांधेदुखी / गुडघेदुखी', icon: 'Bone', color_class: 'text-blue-600 bg-blue-50 border-blue-200', opd_type: 'ayurveda', is_red_flag_trigger: 0, sort_order: 4, is_active: 1 },
    { id: 'cmp-05', complaint_key: 'fever_chills', display_name_en: 'Fever & Chills', display_name_hi: 'बुखार और ठंड लगना', display_name_te: 'జ్వరం మరియు చలి', display_name_ta: 'காய்ச்சல் மற்றும் குளிர்', display_name_kn: 'ಜ್ವರ ಮತ್ತು ಚಳಿ', display_name_ml: 'പനിയും വിറയലും', display_name_mr: 'ताप आणि थंडी', icon: 'Thermometer', color_class: 'text-red-500 bg-red-50 border-red-200', opd_type: 'allopathic', is_red_flag_trigger: 0, sort_order: 5, is_active: 1 },
    { id: 'cmp-06', complaint_key: 'headache_dizzy', display_name_en: 'Severe Headache or Dizziness', display_name_hi: 'गंभीर सिरदर्द या चक्कर', display_name_te: 'తీవ్రమైన తలనొప్పి లేదా మైకం', display_name_ta: 'கடுமையான தலைவலி அல்லது தலைச்சுற்றல்', display_name_kn: 'ತೀವ್ರ ತಲೆನೋವು ಅಥವಾ ತಲೆತಿರುಗುವಿಕೆ', display_name_ml: 'കഠിനമായ തലവേദന അല്ലെങ്കിൽ തലകറക്കം', display_name_mr: 'तीव्र डोकेदुखी किंवा चक्कर', icon: 'Zap', color_class: 'text-purple-600 bg-purple-50 border-purple-200', opd_type: 'both', is_red_flag_trigger: 0, sort_order: 6, is_active: 1 },
    { id: 'cmp-07', complaint_key: 'skin_rash', display_name_en: 'Skin Rash / Itching (Kushtha)', display_name_hi: 'त्वचा रोग / खुजली', display_name_te: 'చర్మంపై దద్దుర్లు / దురద', display_name_ta: 'தோல் வெடிப்பு / அரிப்பு', display_name_kn: 'ಚರ್ಮದ ದದ್ದು / ತುರಿಕೆ', display_name_ml: 'ത്വക്ക് തിണർപ്പ് / ചൊറിച്ചിൽ', display_name_mr: 'त्वचेवर पुरळ / खाज', icon: 'Sparkles', color_class: 'text-emerald-600 bg-emerald-50 border-emerald-200', opd_type: 'ayurveda', is_red_flag_trigger: 0, sort_order: 7, is_active: 1 },
    { id: 'cmp-08', complaint_key: 'digestive_issues', display_name_en: 'Indigestion / Constipation (Agni Mandya)', display_name_hi: 'अपच या कब्ज', display_name_te: 'అజీర్ణం / మలబద్ధకం', display_name_ta: 'செரிமானமின்மை / மலச்சிக்கல்', display_name_kn: 'ಅಜೀರ್ಣ / ಮಲಬದ್ಧತೆ', display_name_ml: 'ദഹനക്കേട് / മലബന്ധം', display_name_mr: 'अपचन / बद्धकोष्ठता', icon: 'Apple', color_class: 'text-teal-600 bg-teal-50 border-teal-200', opd_type: 'ayurveda', is_red_flag_trigger: 0, sort_order: 8, is_active: 1 },
    { id: 'cmp-09', complaint_key: 'other_disease', display_name_en: 'Other Disease / Condition', display_name_hi: 'अन्य बीमारी / समस्या', display_name_te: 'ఇతర వ్యాధి / సమస్య', display_name_ta: 'மற்ற நோய் / பிரச்சனை', display_name_kn: 'ಇತರ ರೋಗ / ಸಮಸ್ಯೆ', display_name_ml: 'മറ്റ് രോഗം / പ്രശ്നം', display_name_mr: 'इतर आजार / समस्या', icon: 'HelpCircle', color_class: 'text-indigo-600 bg-indigo-50 border-indigo-200', opd_type: 'both', is_red_flag_trigger: 0, sort_order: 9, is_active: 1 },
  ];

  patients: any[] = DEMO_PATIENTS.map((patient) => ({ ...patient }));
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
let dbWarned = false;
let lastDbWarnAt = 0;
const DB_WARN_THROTTLE_MS = 30_000;

export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; fromDb: boolean }> {
  try {
    const p = getDbPool();
    const [results] = await p.execute(sql, params);
    if (dbWarned) {
      dbWarned = false;
      console.log('[DB] MySQL connection restored — switching back to the database.');
    }
    return { rows: results as T[], fromDb: true };
  } catch (err: any) {
    // MySQL server not available or connection error - fall back to the
    // in-memory datastore WITHOUT crashing. Throttle the warning so a fully
    // offline database does not spam the logs on every request.
    const now = Date.now();
    if (now - lastDbWarnAt > DB_WARN_THROTTLE_MS) {
      lastDbWarnAt = now;
      dbWarned = true;
      console.warn(`[DB] MySQL offline (${err.message || 'connection failed'}), using robust in-memory datastore.`);
    }
    return { rows: [], fromDb: false };
  }
}
