import React, { useState } from 'react';
import { Users, Cigarette, Wine, Briefcase, ArrowLeft, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { FamilyHistory, HistoryObject, LanguageCode, PersonalHistory } from '../types';
import { translate } from '../services/i18n';

interface FamilyPersonalHistoryProps {
  historyObject: HistoryObject;
  patientGender: 'Male' | 'Female' | 'Other';
  onUpdateHistory: (h: HistoryObject) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
  isAudioNarration: boolean;
}

const DEFAULT_FAMILY: FamilyHistory = {
  diabetes: false,
  hypertension: false,
  heartDisease: false,
  cancer: false,
  kidneyDisease: false,
  thyroid: false,
};

const DEFAULT_PERSONAL: PersonalHistory = {
  smokingStatus: 'Non-Smoker',
  alcoholUse: 'None',
};

const FAMILY_CONDITIONS: {
  key: keyof FamilyHistory;
  label: string;
  regionalLabels: Record<LanguageCode, string>;
  emoji: string;
}[] = [
  {
    key: 'diabetes',
    label: 'Diabetes Mellitus',
    regionalLabels: {
      en: 'Diabetes (Blood Sugar)',
      hi: 'मधुमेह (ब्लड शुगर)',
      te: 'మధుమేహం (షుగర్)',
      ta: 'நீரிழிவு நோய் (சர்க்கரை)',
      kn: 'ಮಧುಮೇಹ (ಸಕ್ಕರೆ ಕಾಯಿಲೆ)',
      ml: 'പ്രമേഹം (ഷുഗർ)',
      mr: 'मधुमेह (डायबेटिस)',
    },
    emoji: '🩸',
  },
  {
    key: 'hypertension',
    label: 'Hypertension (High BP)',
    regionalLabels: {
      en: 'High Blood Pressure',
      hi: 'उच्च रक्तचाप (हाई बीपी)',
      te: 'రక్తపోటు (హై బీపీ)',
      ta: 'உயர் இரத்த அழுத்தம்',
      kn: 'ಅಧಿಕ ರಕ್ತದೊತ್ತಡ (ಹೈ ಬಿಪಿ)',
      ml: 'രക്താതിമർദ്ദം (ഹൈ ബിപി)',
      mr: 'उच्च रक्तदाब (हाय बीपी)',
    },
    emoji: '💉',
  },
  {
    key: 'heartDisease',
    label: 'Heart Disease / CAD',
    regionalLabels: {
      en: 'Heart Attack / CAD',
      hi: 'हृदय रोग / दिल का दौरा',
      te: 'గుండె జబ్బులు',
      ta: 'இதய நோய்',
      kn: 'ಹೃದಯ ರೋಗ',
      ml: 'ഹൃദ്രോഗം',
      mr: 'हृदयविकार',
    },
    emoji: '❤️',
  },
  {
    key: 'cancer',
    label: 'Cancer (Any type)',
    regionalLabels: {
      en: 'Cancer History',
      hi: 'कैंसर (कर्क रोग)',
      te: 'క్యాన్సర్',
      ta: 'புற்றுநோய்',
      kn: 'ಕ್ಯಾನ್ಸರ್',
      ml: 'കാൻസർ',
      mr: 'कर्करोग (कॅन्सर)',
    },
    emoji: '🔬',
  },
  {
    key: 'kidneyDisease',
    label: 'Kidney Disease / CKD',
    regionalLabels: {
      en: 'Kidney / Renal Disease',
      hi: 'गुर्दे / किडनी की बीमारी',
      te: 'మూత్రపిండాల వ్యాధి',
      ta: 'சிறுநீரக நோய்',
      kn: 'ಮೂತ್ರಪಿಂಡ ಕಾಯಿಲೆ',
      ml: 'വൃക്കരോഗം',
      mr: 'मूत्रपिंडाचा आजार',
    },
    emoji: '🫘',
  },
  {
    key: 'thyroid',
    label: 'Thyroid Disorder',
    regionalLabels: {
      en: 'Thyroid Disorder',
      hi: 'थायराइड विकार',
      te: 'థైరాయిడ్ సమస్య',
      ta: 'தைராய்டு கோளாறு',
      kn: 'ಥೈರಾಯ್ಡ್ ಸಮಸ್ಯೆ',
      ml: 'തൈറോയ്ഡ് തകരാറ്',
      mr: 'थायरॉईड विकार',
    },
    emoji: '🦋',
  },
];

export const FamilyPersonalHistoryScreen: React.FC<FamilyPersonalHistoryProps> = ({
  historyObject,
  patientGender,
  onUpdateHistory,
  onContinue,
  onBack,
  selectedLanguage,
}) => {
  const [family, setFamily] = useState<FamilyHistory>(historyObject.familyHistory || DEFAULT_FAMILY);
  const [personal, setPersonal] = useState<PersonalHistory>(historyObject.personalHistory || DEFAULT_PERSONAL);
  const [obstetrics, setObstetrics] = useState({ pregnancies: 0, deliveries: 0, miscarriages: 0 });
  const [occupation, setOccupation] = useState(personal.occupation || '');
  const [noneFamily, setNoneFamily] = useState(Boolean(historyObject.familyHistory?.noSignificantFamilyHistory));

  const toggleFamily = (key: keyof FamilyHistory) => {
    setNoneFamily(false);
    setFamily(prev => ({
      ...prev,
      [key]: !prev[key],
      noSignificantFamilyHistory: false,
    }));
  };

  const handleNoneFamily = () => {
    const nextVal = !noneFamily;
    setNoneFamily(nextVal);
    if (nextVal) {
      // Deselect all other disease cases immediately
      setFamily({
        diabetes: false,
        hypertension: false,
        heartDisease: false,
        cancer: false,
        kidneyDisease: false,
        thyroid: false,
        other: '',
        noSignificantFamilyHistory: true,
      });
    } else {
      setFamily(prev => ({ ...prev, noSignificantFamilyHistory: false }));
    }
  };

  const handleContinue = () => {
    onUpdateHistory({
      ...historyObject,
      familyHistory: family,
      personalHistory: {
        ...personal,
        occupation,
        obstetricsHistory: patientGender === 'Female' ? obstetrics : undefined,
      },
    });
    onContinue();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Step 4: {translate('history', selectedLanguage)}</span>
          {selectedLanguage !== 'en' && <span className="text-[10px] opacity-75">(Family & Personal History)</span>}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          {translate('familyHistory', selectedLanguage)}
        </h2>
        {selectedLanguage !== 'en' && (
          <p className="text-sm font-semibold text-indigo-700 mt-0.5">
            {translate('familyHistory', 'en')}
          </p>
        )}
        <p className="text-slate-600 text-sm mt-1.5">
          {translate('familyHistorySub', selectedLanguage)}
        </p>
        {selectedLanguage !== 'en' && (
          <p className="text-xs text-slate-400 mt-0.5">
            {translate('familyHistorySub', 'en')}
          </p>
        )}
      </div>

      {/* Family History */}
      <div className="stitch-card p-6 mb-5">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>{translate('familyHistory', selectedLanguage)}</span>
          {selectedLanguage !== 'en' && (
            <span className="text-xs font-normal text-slate-500 lowercase">
              ({translate('familyHistory', 'en')})
            </span>
          )}
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <p className="text-xs text-slate-500">
            {translate('familyHistorySub', selectedLanguage)}
          </p>
          <button
            type="button"
            onClick={handleNoneFamily}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-xs ${
              noneFamily
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700'
            }`}
          >
            {noneFamily ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-400" />}
            <span>
              {translate('noFamilyHistory', selectedLanguage)}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {FAMILY_CONDITIONS.map(fc => {
            const isOn = family[fc.key] as boolean;
            const primaryName = selectedLanguage !== 'en'
              ? (fc.regionalLabels[selectedLanguage] || fc.regionalLabels.en)
              : fc.label;
            const englishSubtitle = selectedLanguage !== 'en' ? fc.label : undefined;

            return (
              <div
                key={fc.key}
                onClick={() => toggleFamily(fc.key)}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  isOn
                    ? 'stitch-card-active'
                    : 'stitch-card hover:border-indigo-400'
                }`}
              >
                <span className="text-lg shrink-0">{fc.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-snug truncate">{primaryName}</p>
                  {englishSubtitle && (
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{englishSubtitle}</p>
                  )}
                </div>
                <div className="ml-auto shrink-0">
                  {isOn ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal / Social History */}
      <div className="stitch-card p-6 mb-5">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">
          {selectedLanguage === 'ta' ? 'தனிப்பட்ட / சமூக வரலாறு' : selectedLanguage === 'te' ? 'వ్యక్తిగత / సామాజిక చరిత్ర' : selectedLanguage === 'kn' ? 'ವೈಯಕ್ತಿಕ / ಸಾಮಾಜಿಕ ಇತಿಹಾಸ' : selectedLanguage === 'ml' ? 'വ്യക്തിഗത / സാമൂഹിക ചരിത്രം' : selectedLanguage === 'mr' ? 'वैयक्तिक / सामाजिक इतिहास' : 'Personal / Social History'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Smoking */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Cigarette className="w-3.5 h-3.5 text-amber-600" /> Smoking Status</p>
            {(['Non-Smoker', 'Ex-Smoker', 'Current Smoker'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setPersonal(p => ({ ...p, smokingStatus: opt }))}
                className={`w-full mb-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-left transition border ${
                  personal.smokingStatus === opt ? 'bg-amber-50 border-amber-300 text-amber-900 font-extrabold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >{opt === 'Non-Smoker' ? '🚭 ' : opt === 'Ex-Smoker' ? '✅ ' : '🚬 '}{opt}</button>
            ))}
          </div>
          {/* Alcohol */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Wine className="w-3.5 h-3.5 text-rose-600" /> Alcohol Use</p>
            {(['None', 'Occasional', 'Regular'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setPersonal(p => ({ ...p, alcoholUse: opt }))}
                className={`w-full mb-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-left transition border ${
                  personal.alcoholUse === opt ? 'bg-rose-50 border-rose-300 text-rose-900 font-extrabold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >{opt === 'None' ? '✅ ' : opt === 'Occasional' ? '🍻 ' : '🍷 '}{opt}</button>
            ))}
          </div>
          {/* Occupation */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-violet-600" /> Occupation (optional)</p>
            <input
              type="text"
              value={occupation}
              onChange={e => setOccupation(e.target.value)}
              placeholder="e.g. Farmer, Teacher, Office work"
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Obstetrics (Female only) */}
      {patientGender === 'Female' && (
        <div className="stitch-card p-5 mb-5">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Obstetric History (Women Only)</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['pregnancies', 'deliveries', 'miscarriages'] as const).map(k => (
              <div key={k} className="text-center">
                <p className="text-[10px] text-slate-500 capitalize mb-2">{k}</p>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => setObstetrics(o => ({ ...o, [k]: Math.max(0, o[k] - 1) }))} className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50 transition shadow-xs">−</button>
                  <span className="text-xl font-black text-slate-900 w-8 text-center font-mono">{obstetrics[k]}</span>
                  <button onClick={() => setObstetrics(o => ({ ...o, [k]: o[k] + 1 }))} className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50 transition shadow-xs">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="py-2.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm">
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <div className="text-left">
            <span>{translate('back', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] text-slate-400 font-medium">Back to Symptoms</span>
            )}
          </div>
        </button>
        <button onClick={handleContinue} className="py-3 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98">
          <div className="text-left">
            <span>{translate('continue', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[11px] font-normal opacity-85">Save & Proceed to Documents</span>
            )}
          </div>
          <ArrowRight className="w-5 h-5 stroke-[2.5] shrink-0" />
        </button>
      </div>
    </div>
  );
};
