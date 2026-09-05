import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Clock, Stethoscope, UserCheck, Shield } from 'lucide-react';
import { LanguageCode } from '../types';

interface PatientHeaderProps {
  currentStep: string;
  onNavigateToIntake: () => void;
  onNavigateToPortal: () => void;
  onReset: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onOpenStaffLogin: () => void;
  language?: LanguageCode;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  currentStep,
  onNavigateToIntake,
  onNavigateToPortal,
  onReset,
  isAudioMuted,
  onToggleAudio,
  onOpenStaffLogin,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isIntakeActive = currentStep !== 'PATIENT_PORTAL_DASHBOARD';
  const isPortalActive = currentStep === 'PATIENT_PORTAL_DASHBOARD';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* 1. Hospital / System Logo & 2. Current Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1">
                MediKiosk<span className="text-teal-600 font-extrabold">+</span>
              </span>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Ayushman Bharat Digital OPD</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* 2. Live Current Time */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{timeStr || '10:00 AM'}</span>
          </div>
        </div>

        {/* 3. Kiosk Intake & 4. Patient Portal Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={onNavigateToIntake}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isIntakeActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>KIOSK INTAKE</span>
          </button>

          <button
            onClick={onNavigateToPortal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isPortalActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>PATIENT PORTAL</span>
          </button>
        </div>

        {/* 5. Online Status, 6. Audio Toggle, 7. Start Over & Staff Portal Link */}
        <div className="flex items-center gap-2.5">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[11px] tracking-wide">ONLINE</span>
          </div>

          {/* 6. Audio Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-2 rounded-lg border transition-colors ${
              isAudioMuted
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isAudioMuted ? 'Unmute Audio Guidance' : 'Mute Audio Guidance'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* 7. Start Over */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            title="Start New Kiosk Session"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">START OVER</span>
          </button>

          {/* Discreet Hospital Staff Login Gateway */}
          <button
            onClick={onOpenStaffLogin}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
            title="Hospital Staff & Doctor Login"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

