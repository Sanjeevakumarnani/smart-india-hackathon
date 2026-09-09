import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Clock, Shield, Eye, Type, Hand, LockKeyhole } from 'lucide-react';
import { KioskStep, LanguageCode, OpdType } from '../types';
import { ProgressStepper } from './ProgressStepper';

interface PatientHeaderProps {
  currentStep: string;
  onNavigateToIntake: () => void;
  onNavigateToPortal: () => void;
  onReset: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onOpenStaffLogin: () => void;
  onLockKiosk: () => void;
  language?: LanguageCode;
  opdType: OpdType;
  onNavigateStep: (step: KioskStep) => void;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
  isLargeFont?: boolean;
  onToggleLargeFont?: () => void;
  isSignAvatar?: boolean;
  onToggleSignAvatar?: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  currentStep,
  onNavigateToIntake,
  onNavigateToPortal,
  onReset,
  isAudioMuted,
  onToggleAudio,
  onOpenStaffLogin,
  onLockKiosk,
  language,
  opdType,
  onNavigateStep,
  isHighContrast,
  onToggleHighContrast,
  isLargeFont,
  onToggleLargeFont,
  isSignAvatar,
  onToggleSignAvatar,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-sm px-4 lg:px-7">
      <div className="max-w-[1680px] mx-auto py-2 flex items-center justify-between gap-4">
        {/* 1. Hospital / System Logo & 2. Current Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30">
              <span className="text-xl font-semibold leading-none">+</span>
            </div>
            <div>
                <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1 leading-none">
                MediKiosk<span className="text-teal-600 font-extrabold">+</span>
              </span>
              <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Ayushman Bharat Digital OPD</p>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200/80 w-max mt-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{timeStr || '10:00 AM'}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="hidden xl:block flex-1">
          {[
            'LANGUAGE',
            'CONSENT',
            'IDENTITY',
            'VITALS',
            'COMPLAINT_SELECT',
            'CONVERSATION',
            'FAMILY_HISTORY',
            'AYUSH_PARIKSHA',
            'DOC_SCAN',
            'SESSION_PURGE',
            'SUMMARY_REVIEW',
          ].includes(currentStep) && (
            <ProgressStepper currentStep={currentStep as KioskStep} opdType={opdType} language={language || 'en'} onStepClick={onNavigateStep} />
          )}
        </div>

        {/* 3. Kiosk Intake & 4. Patient Portal Navigation */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-semibold shrink-0">
          <button
            onClick={onNavigateToIntake}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              isIntakeActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>KIOSK</span>
          </button>

          <button
            onClick={onNavigateToPortal}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              isPortalActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
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

          {/* Accessibility: High Contrast Toggle */}
          {onToggleHighContrast && (
            <button
              onClick={onToggleHighContrast}
              className={`p-2 rounded-lg border transition-colors ${
                isHighContrast
                  ? 'bg-slate-900 border-slate-900 text-white font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title={isHighContrast ? 'Disable High Contrast' : 'Enable High Contrast (WCAG AAA)'}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Accessibility: Large Font Toggle */}
          {onToggleLargeFont && (
            <button
              onClick={onToggleLargeFont}
              className={`p-2 rounded-lg border transition-colors ${
                isLargeFont
                  ? 'bg-teal-50 border-teal-300 text-teal-700 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title={isLargeFont ? 'Normal Font Size' : 'Large Touch Font Size (A+)'}
            >
              <Type className="w-4 h-4" />
            </button>
          )}

          {/* Accessibility: Indian Sign Language Avatar Toggle */}
          {onToggleSignAvatar && (
            <button
              onClick={onToggleSignAvatar}
              className={`p-2 rounded-lg border transition-colors flex items-center gap-1 ${
                isSignAvatar
                  ? 'bg-teal-600 border-teal-600 text-white font-bold shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title={isSignAvatar ? 'Hide Sign Language Avatar' : 'Show Indian Sign Language (ISL) Avatar'}
            >
              <Hand className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase hidden sm:inline">ISL</span>
            </button>
          )}

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
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

          {/* Lock Kiosk (Hospital Admin) */}
          <button
            onClick={onLockKiosk}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
            title="Lock Kiosk"
          >
            <LockKeyhole className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

