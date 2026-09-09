import { apiFetch, apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  Type,
  Users,
  Stethoscope,
  BarChart3,
  Wifi,
  WifiOff,
  Hand,
  Clock,
  Sparkles,
} from 'lucide-react';
import { KioskStep, LanguageCode } from '../types';

import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentStep: KioskStep;
  onNavigate: (step: KioskStep) => void;
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
  isLargeFont: boolean;
  onToggleLargeFont: () => void;
  isAudioNarration: boolean;
  onToggleAudioNarration: () => void;
  isSignAvatar: boolean;
  onToggleSignAvatar: () => void;
  isOfflineSimulated: boolean;
  onToggleOfflineSimulated: () => void;
  onResetKiosk: () => void;
  hasRedFlag: boolean;
  activeTokenCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onNavigate,
  selectedLanguage,
  onSelectLanguage: _onSelectLanguage,
  isHighContrast,
  onToggleHighContrast,
  isLargeFont,
  onToggleLargeFont,
  isAudioNarration,
  onToggleAudioNarration,
  isSignAvatar,
  onToggleSignAvatar,
  isOfflineSimulated,
  onToggleOfflineSimulated,
  onResetKiosk,
  hasRedFlag,
  activeTokenCount,
}) => {
  const [timeString, setTimeString] = useState('');
  const [stationConfig, setStationConfig] = useState({ station_code: '...', display_name: 'Loading...' });
  const [languages, setLanguages] = useState<{code: string; nativeName: string}[]>([]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    apiFetch('/api/kiosk/config')
      .then(res => res.json())
      .then(data => setStationConfig(data))
      .catch(err => console.error('Failed to fetch kiosk config', err));
      
    const ALLOWED_CODES = ['en', 'te', 'ta', 'kn', 'ml', 'mr'];
    apiFetch('/api/languages')
      .then(res => res.json())
      .then((data: any[]) => {
         const list = (Array.isArray(data) ? data : []).filter(l => ALLOWED_CODES.includes(l.code));
         setLanguages(list.map(l => ({ code: l.code, nativeName: l.native_name || l.nativeName })));
      })
      .catch(err => console.error('Failed to fetch languages', err));
  }, []);

  const currentLangObj = languages.find((l) => l.code === selectedLanguage) || { nativeName: selectedLanguage.toUpperCase() };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 border-b border-slate-200 backdrop-blur-xl px-4 py-2.5 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Kiosk Station Identity */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate('LANGUAGE')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <span className="text-xl leading-none font-mono">M+</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                  MediKiosk<span className="text-indigo-600 font-black">+</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-lg bg-violet-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono font-bold tracking-wider">
                  {stationConfig.station_code || 'PS 26047'}
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                  {currentLangObj.nativeName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <span>{stationConfig.display_name || 'Station #K-04 (OPD Triage)'}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-slate-600 font-mono">{timeString}</span>
              </p>
            </div>
          </div>

          {/* Red-Flag Alert Badge on Header if Active */}
          {hasRedFlag && (
            <div
              onClick={() => onNavigate('QUEUE_DISPLAY')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold animate-pulse cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>CRITICAL RED-FLAG TRIAGED</span>
            </div>
          )}
        </div>

        {/* Center: Quick Mode Switchers for Hackathon Demo Flow */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button
            id="nav-kiosk-mode"
            onClick={() => onNavigate('LANGUAGE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              ['LANGUAGE', 'CONSENT', 'IDENTITY', 'VITALS', 'COMPLAINT_SELECT', 'CONVERSATION', 'FAMILY_HISTORY', 'AYUSH_PARIKSHA', 'DOC_SCAN', 'SESSION_PURGE'].includes(
                currentStep
              )
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kiosk Intake</span>
          </button>

          <button
            id="nav-physician-summary"
            onClick={() => onNavigate('PHYSICIAN_CONSOLE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentStep === 'PHYSICIAN_CONSOLE' || currentStep === 'SUMMARY_REVIEW'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor Console</span>
          </button>

          <button
            id="nav-live-queue"
            onClick={() => onNavigate('QUEUE_DISPLAY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentStep === 'QUEUE_DISPLAY'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>OPD Queue ({activeTokenCount})</span>
          </button>

          <button
            id="nav-patient-portal"
            onClick={() => onNavigate('PATIENT_PORTAL_AUTH')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentStep === 'PATIENT_PORTAL_AUTH' || currentStep === 'PATIENT_PORTAL_DASHBOARD'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Patient Portal</span>
          </button>

          <button
            id="nav-analytics-dashboard"
            onClick={() => onNavigate('ANALYTICS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentStep === 'ANALYTICS'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Right Accessibility & Controls Toolbar */}
        <div className="flex items-center gap-2">
          {/* PWA Install */}
          <PWAInstallButton />

          {/* Offline Simulator Switch */}
          <button
            id="toggle-offline-btn"
            onClick={onToggleOfflineSimulated}
            className={`p-2 rounded-xl text-xs font-bold border transition ${
              isOfflineSimulated
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-slate-50 shadow-sm'
            }`}
            title={isOfflineSimulated ? 'Simulated Offline (Click to go Online)' : 'Click to simulate offline mode'}
          >
            {isOfflineSimulated ? (
              <div className="flex items-center gap-1 text-[11px]">
                <WifiOff className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px]">
                <Wifi className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Online</span>
              </div>
            )}
          </button>

          {/* High Contrast Mode Toggle */}
          <button
            id="toggle-contrast-btn"
            onClick={onToggleHighContrast}
            className={`p-2 rounded-xl border transition ${
              isHighContrast
                ? 'bg-slate-900 text-white border-slate-900 font-extrabold'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-slate-50 shadow-sm'
            }`}
            title="Toggle High Contrast (WCAG AAA)"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Large Font Size Toggle */}
          <button
            id="toggle-font-size-btn"
            onClick={onToggleLargeFont}
            className={`p-2 rounded-xl border transition ${
              isLargeFont
                ? 'bg-violet-100 border-indigo-400 text-indigo-900'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-slate-50 shadow-sm'
            }`}
            title="Toggle Large Touch Kiosk Font Size"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Audio TTS Narration Toggle */}
          <button
            id="toggle-tts-btn"
            onClick={onToggleAudioNarration}
            className={`p-2 rounded-xl border transition ${
              isAudioNarration
                ? 'bg-violet-100 border-indigo-400 text-indigo-900'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-slate-50 shadow-sm'
            }`}
            title="Voice Narration Read-Aloud"
          >
            {isAudioNarration ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Indian Sign Language Avatar Assistant Toggle */}
          <button
            id="toggle-sign-avatar-btn"
            onClick={onToggleSignAvatar}
            className={`p-2 rounded-xl border transition ${
              isSignAvatar
                ? 'bg-violet-100 border-indigo-400 text-indigo-900'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-slate-50 shadow-sm'
            }`}
            title="Toggle Indian Sign Language Avatar Assistant"
          >
            <Hand className="w-4 h-4" />
          </button>

          {/* Big Start Over / Reset Button */}
          <button
            id="reset-kiosk-btn"
            onClick={onResetKiosk}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-rose-950/50"
            title="Reset Kiosk Session for Next Patient"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Start Over</span>
          </button>
        </div>
      </div>
    </header>
  );
};
