import React, { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, Heart, Thermometer, Wind, Weight, SkipForward } from 'lucide-react';
import { LanguageCode, PatientProfile } from '../types';

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
  labelHi: string;
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
    labelHi: 'रक्तचाप (ऊपरी)',
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
    labelHi: 'रक्तचाप (निचला)',
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
    labelHi: 'हृदय गति / नाड़ी',
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
    labelHi: 'ऑक्सीजन स्तर (SpO₂)',
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
    labelHi: 'शरीर का तापमान',
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
    labelHi: 'शरीर का वजन',
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
  selectedLanguage: _selectedLanguage,
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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span>Step 2b: Vitals Capture / स्वास्थ्य मापांक</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Record Your Vitals</h2>
        <p className="text-slate-600 text-sm mt-1">स्वास्थ्य मापन यंत्र द्वारा दर्ज करें — या अज्ञात होने पर छोड़ें</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {VITAL_FIELDS.map(field => {
          const colors = colorMap[field.color] || colorMap.indigo;
          const val = getDisplayVal(field);
          const isSkipped = skipped.has(field.key);
          return (
            <div key={field.key} className={`p-5 rounded-3xl border-2 shadow-sm transition-all ${
              isSkipped ? 'bg-slate-100 border-slate-200 opacity-60' : `${colors.bg} ${colors.border}`
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl bg-white border ${colors.border} ${colors.text} shadow-xs`}>
                    {field.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">{field.label}</p>
                    <p className="text-[10px] text-slate-500">{field.labelHi}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSkip(field.key)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition shadow-xs"
                  title="Skip this vital"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {isSkipped ? (
                <div className="text-center py-3">
                  <p className="text-xs text-slate-500 font-bold">Skipped / Not Available</p>
                  <button onClick={() => setSkipped(prev => { const s = new Set(prev); s.delete(field.key); return s; })} className="mt-1 text-[10px] text-indigo-600 underline">Re-enter</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <button
                      onClick={() => handleChange(field.key, Math.max(field.min, parseFloat((val - field.step).toFixed(1))))}
                      className={`w-10 h-10 rounded-2xl font-black text-lg ${colors.btn} border ${colors.border} transition active:scale-95 shadow-xs`}
                    >−</button>
                    <div className="text-center">
                      <span className={`text-3xl font-black font-mono ${colors.text}`}>{typeof val === 'number' ? val.toFixed(field.step < 1 ? 1 : 0) : '--'}</span>
                      <span className="text-xs text-slate-500 ml-1 font-medium">{field.unit}</span>
                    </div>
                    <button
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
                  <p className="text-[10px] text-slate-500 text-center mt-1 font-mono">Normal: {field.normalRange}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Identity</span>
        </button>
        <button onClick={handleContinue} className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98">
          <span>Confirm Vitals &amp; Select Complaint</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
