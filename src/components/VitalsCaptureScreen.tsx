import React, { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, Heart, Thermometer, Wind, Weight, SkipForward } from 'lucide-react';
import { LanguageCode, PatientProfile } from '../types';
import { translate } from '../services/i18n';

interface VitalsCaptureScreenProps {
  patientProfile: PatientProfile | null;
  onUpdateProfile: (profile: PatientProfile) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
  isAudioNarration: boolean;
}

type VitalField = {
  key: keyof PatientProfile['vitals'] & string;
  label: string;
  regionalLabels: Record<LanguageCode, string>;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
  normalRange: string;
  icon: React.ReactNode;
  color: string;
};

const VITAL_FIELDS: VitalField[] = [
  {
    key: 'bpSystolic',
    label: 'Blood Pressure (Systolic)',
    regionalLabels: {
      en: 'Blood Pressure (Upper)',
      hi: 'रक्तचाप (ऊपरी)',
      te: 'రక్తపోటు (పై భాగం)',
      ta: 'இரத்த அழுத்தம் (மேல்)',
      kn: 'ರಕ್ತದೊತ್ತಡ (ಮೇಲ್ಭಾಗ)',
      ml: 'രക്തസമ്മർദ്ദം (മുകൾ)',
      mr: 'रक्तदाब (सिस्टोलिक)',
    },
    unit: 'mmHg',
    min: 70,
    max: 200,
    step: 1,
    defaultVal: 120,
    normalRange: '90 – 140 mmHg',
    icon: <Heart className="w-5 h-5" />,
    color: 'rose',
  },
  {
    key: 'bpDiastolic',
    label: 'Blood Pressure (Diastolic)',
    regionalLabels: {
      en: 'Blood Pressure (Lower)',
      hi: 'रक्तचाप (निचला)',
      te: 'రక్తపోటు (కింది భాగం)',
      ta: 'இரத்த அழுத்தம் (கீழ்)',
      kn: 'ರಕ್ತದೊತ್ತಡ (ಕೆಳಭಾಗ)',
      ml: 'രಕ್ತസമ്മർദ്ദം (താഴത്തെ)',
      mr: 'रक्तदाब (डायस्टोलिक)',
    },
    unit: 'mmHg',
    min: 40,
    max: 130,
    step: 1,
    defaultVal: 80,
    normalRange: '60 – 90 mmHg',
    icon: <Heart className="w-5 h-5" />,
    color: 'rose',
  },
  {
    key: 'heartRate',
    label: 'Heart Rate / Pulse',
    regionalLabels: {
      en: 'Heart Rate / Pulse',
      hi: 'हृदय गति / नाड़ी',
      te: 'గుండె వేగం / నాడి',
      ta: 'இதய துடிப்பு / நாடி',
      kn: 'ಹೃದಯ ಬಡಿತ / ನಾಡಿ',
      ml: 'ഹൃദയമിടിപ്പ് / നാഡി',
      mr: 'हृदयाचे ठोके / नाडी',
    },
    unit: 'bpm',
    min: 40,
    max: 180,
    step: 1,
    defaultVal: 72,
    normalRange: '60 – 100 bpm',
    icon: <Activity className="w-5 h-5" />,
    color: 'cyan',
  },
  {
    key: 'spO2',
    label: 'Oxygen Saturation (SpO₂)',
    regionalLabels: {
      en: 'Oxygen Saturation',
      hi: 'ऑक्सीजन संतृप्ति (SpO₂)',
      te: 'ఆక్సిజన్ స్థాయి (SpO₂)',
      ta: 'ஆக்ஸிஜன் அளவு (SpO₂)',
      kn: 'ಆಮ್ಲಜನಕ ಮಟ್ಟ (SpO₂)',
      ml: 'ഓക്സിജൻ അളവ് (SpO₂)',
      mr: 'ऑक्सिजन पातळी (SpO₂)',
    },
    unit: '%',
    min: 70,
    max: 100,
    step: 1,
    defaultVal: 98,
    normalRange: '95 – 100%',
    icon: <Wind className="w-5 h-5" />,
    color: 'emerald',
  },
  {
    key: 'temperature',
    label: 'Body Temperature',
    regionalLabels: {
      en: 'Body Temperature',
      hi: 'शरीर का तापमान',
      te: 'శరీర ఉష్ణోగ్రత',
      ta: 'உடல் வெப்பநிலை',
      kn: 'ದೇಹದ ಉಷ್ಣತೆ',
      ml: 'ശരീര താപനില',
      mr: 'शरीराचे तापमान',
    },
    unit: '°F',
    min: 95,
    max: 108,
    step: 0.1,
    defaultVal: 98.6,
    normalRange: '97 – 99°F',
    icon: <Thermometer className="w-5 h-5" />,
    color: 'amber',
  },
  {
    key: 'weight',
    label: 'Body Weight',
    regionalLabels: {
      en: 'Body Weight',
      hi: 'शरीर का वजन',
      te: 'శరీర బరువు',
      ta: 'உடல் எடை',
      kn: 'ದೇಹದ ತೂಕ',
      ml: 'ശരീരഭാരം',
      mr: 'शरीराचे वजन',
    },
    unit: 'kg',
    min: 10,
    max: 200,
    step: 0.5,
    defaultVal: 65,
    normalRange: 'Reference BMI: 18.5 – 24.9',
    icon: <Weight className="w-5 h-5" />,
    color: 'indigo',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; btn: string }> = {
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', btn: 'bg-rose-100 hover:bg-rose-200 text-rose-800' },
  cyan: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', btn: 'bg-violet-100 hover:bg-violet-200 text-violet-800' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', btn: 'bg-amber-100 hover:bg-amber-200 text-amber-800' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', btn: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800' },
};

export const VitalsCaptureScreen: React.FC<VitalsCaptureScreenProps> = ({
  patientProfile,
  onUpdateProfile,
  onContinue,
  onBack,
  selectedLanguage,
  isAudioNarration: _isAudioNarration,
}) => {
  const initVitals = patientProfile?.vitals || {};
  const [vitals, setVitals] = useState<Record<string, number | undefined>>({
    bpSystolic: initVitals.bpSystolic,
    bpDiastolic: initVitals.bpDiastolic,
    heartRate: initVitals.heartRate,
    spO2: initVitals.spO2,
    temperature: initVitals.temperature,
    weight: initVitals.weight,
  });
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const handleChange = (key: string, val: number) => {
    setVitals(prev => ({ ...prev, [key]: val }));
    setSkipped(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  const handleSkip = (key: string) => {
    setVitals(prev => ({ ...prev, [key]: undefined }));
    setSkipped(prev => new Set([...prev, key]));
  };

  const handleContinue = () => {
    if (patientProfile) {
      onUpdateProfile({ ...patientProfile, vitals: { ...patientProfile.vitals, ...vitals } });
    }
    onContinue();
  };

  const getDisplayVal = (field: VitalField) => {
    const v = vitals[field.key];
    if (v === undefined) return field.defaultVal;
    return v;
  };

  const getVitalAlerts = () => {
    const alerts: string[] = [];
    const sys = vitals.bpSystolic;
    const dia = vitals.bpDiastolic;
    if (sys !== undefined && dia !== undefined) {
      if (sys >= 180 || dia >= 120) {
        alerts.push(`HYPERTENSIVE CRISIS: BP ${sys}/${dia} mmHg — Immediate emergency triage needed`);
      } else if (sys >= 140 || dia >= 90) {
        alerts.push(`Stage 2 Hypertension: BP ${sys}/${dia} mmHg`);
      }
    }
    const spo2 = vitals.spO2;
    if (spo2 !== undefined) {
      if (spo2 < 90) {
        alerts.push(`CRITICAL HYPOXEMIA: SpO₂ ${spo2}% — Urgent oxygen intervention required`);
      } else if (spo2 < 94) {
        alerts.push(`Low Oxygen Saturation: SpO₂ ${spo2}% — Close observation indicated`);
      }
    }
    const hr = vitals.heartRate;
    if (hr !== undefined) {
      if (hr > 140) {
        alerts.push(`SEVERE TACHYCARDIA: Pulse ${hr} bpm — Rapid evaluation needed`);
      } else if (hr < 50) {
        alerts.push(`SEVERE BRADYCARDIA: Pulse ${hr} bpm — Immediate evaluation needed`);
      }
    }
    const temp = vitals.temperature;
    if (temp !== undefined && temp > 103) {
      alerts.push(`HYPERPYREXIA: Temperature ${temp}°F — Critical high fever`);
    }
    return alerts;
  };

  const vitalAlerts = getVitalAlerts();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 select-none">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span>Step 2: Patient Vitals &amp; Biomarkers</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          {translate('recordVitals', selectedLanguage)}
        </h2>
        {selectedLanguage !== 'en' && (
          <p className="text-sm font-semibold text-indigo-700 mt-0.5">
            {translate('recordVitals', 'en')}
          </p>
        )}
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          {translate('recordVitalsSub', selectedLanguage)}
        </p>
        {selectedLanguage !== 'en' && (
          <p className="text-xs text-slate-400 mt-0.5">
            {translate('recordVitalsSub', 'en')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {VITAL_FIELDS.map(field => {
          const isSkipped = skipped.has(field.key);
          const val = getDisplayVal(field);
          const colors = colorMap[field.color];
          const regLabel = field.regionalLabels[selectedLanguage] || field.label;

          return (
            <div
              key={field.key}
              className={`p-4 rounded-2xl border transition ${
                isSkipped
                  ? 'bg-slate-100/60 border-slate-200 opacity-60'
                  : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${colors.bg} ${colors.text}`}>
                    {field.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{regLabel}</p>
                    <p className="text-[10px] text-slate-500">{field.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => isSkipped ? handleChange(field.key, field.defaultVal) : handleSkip(field.key)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                    isSkipped
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {isSkipped ? 'Include' : 'Skip'}
                </button>
              </div>

              {isSkipped ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">Skipped (Not measured)</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      type="button"
                      onClick={() => handleChange(field.key, Math.max(field.min, parseFloat((val - field.step).toFixed(1))))}
                      className={`w-10 h-10 rounded-2xl font-black text-lg ${colors.btn} border ${colors.border} transition active:scale-95 shadow-xs`}
                    >−</button>
                    <div className="text-center">
                      <span className="text-2xl font-black text-slate-900 tracking-tight">{val}</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">{field.unit}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange(field.key, Math.min(field.max, parseFloat((val + field.step).toFixed(1))))}
                      className={`w-10 h-10 rounded-2xl font-black text-lg ${colors.btn} border ${colors.border} transition active:scale-95 shadow-xs`}
                    >+</button>
                  </div>
                  <input
                    type="range" min={field.min} max={field.max} step={field.step}
                    value={val}
                    onChange={e => handleChange(field.key, parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Critical Vital Red-Flag Alert Banner */}
      {vitalAlerts.length > 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🚨</span>
            <p className="text-xs font-black uppercase tracking-wider text-rose-800">
              Clinical Alert: Critical Biomarkers Detected
            </p>
          </div>
          <div className="space-y-1 mt-1">
            {vitalAlerts.map((alert, idx) => (
              <p key={idx} className="text-xs font-bold text-rose-800">• {alert}</p>
            ))}
          </div>
          <p className="text-[11px] text-rose-700 mt-1 font-medium">
            This patient encounter will be automatically escalated to HIGH PRIORITY emergency triage.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="py-2.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm">
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <div className="text-left">
            <span>{translate('backToIdentity', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] text-slate-400 font-medium">Back to Identity</span>
            )}
          </div>
        </button>
        <button onClick={handleContinue} className="py-3 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98">
          <div className="text-left">
            <span>{translate('confirmVitals', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[11px] font-normal opacity-85">Confirm Vitals & Select Complaint</span>
            )}
          </div>
          <ArrowRight className="w-5 h-5 stroke-[2.5] shrink-0" />
        </button>
      </div>
    </div>
  );
};
