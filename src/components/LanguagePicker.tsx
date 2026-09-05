import React, { useState, useEffect } from 'react';
import { Volume2, Check, ArrowRight, Languages, Loader2 } from 'lucide-react';
import { LanguageCode } from '../types';
import { speechService } from '../services/speechService';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  bcp47: string;
  flagEmoji?: string;
  sortOrder?: number;
  audioPrompt?: string;
}

interface LanguagePickerProps {
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onContinue: () => void;
  isAudioNarration: boolean;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  selectedLanguage,
  onSelectLanguage,
  onContinue,
  isAudioNarration,
}) => {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/languages')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch languages');
        return res.json();
      })
      .then((data: any[]) => {
        const NATIVE_PROMPTS: Record<string, string> = {
          hi: 'नमस्ते! कृपया अपनी पसंदीदा भाषा चुनें और आगे बढ़ें।',
          en: 'Welcome. Please select your preferred language to proceed.',
          ta: 'வணக்கம்! தொடர உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.',
          te: 'స్వాగతం! దయచేసి మీ ప్రాధాన్యత గల భాషను ఎంచుకోండి.',
          bn: 'নমস্কার! এগিয়ে যেতে আপনার পছন্দের ভাষা নির্বাচন করুন।',
          mr: 'नमस्कार! कृपया पुढे जाण्यासाठी आपली भाषा निवडा.',
          gu: 'નમસ્તે! ચાલુ રાખવા માટે કૃપા કરીને તમારી ભાષા પસંદ કરો.',
          kn: 'ನಮಸ್ಕಾರ! ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
          pa: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਅੱਗੇ ਵਧਣ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ।',
          ml: 'സ്വാഗതം! തുടരാൻ നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക.',
          or: 'ନମସ୍କାର! ଆଗକୁ ବଢ଼ିବା ପାଇଁ ଦୟାକରି ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ।',
          as: 'নমস্কাৰ! অনুগ্ৰহ কৰি আগবাঢ়িবলৈ আপোনাৰ ভাষা বাছক।',
        };

        const mapped = data.map((lang) => ({
          code: lang.code as LanguageCode,
          name: lang.name,
          nativeName: lang.native_name,
          bcp47: lang.bcp47,
          flagEmoji: lang.flag_emoji,
          sortOrder: lang.sort_order,
          audioPrompt: NATIVE_PROMPTS[lang.code] || `Please select ${lang.name}`,
        }));
        setLanguages(mapped.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  const handlePreviewAudio = (e: React.MouseEvent, lang: LanguageOption) => {
    e.stopPropagation();
    speechService.speak(lang.audioPrompt || '', lang.code);
  };

  const handleCardClick = (lang: LanguageOption) => {
    onSelectLanguage(lang.code);
    if (isAudioNarration) {
      speechService.speak(lang.audioPrompt || '', lang.code);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600">Loading languages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-500 mb-4">Error loading languages: {error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col items-center">
      <div className="w-full stitch-card p-6 sm:p-8 mb-8 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex-1 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-4 shadow-xs">
            <Languages className="w-4 h-4 text-indigo-600" />
            <span>Step 1: Choose Your Language / भाषा चुनें</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Welcome to <span className="text-indigo-600">MediKiosk</span>
            <span className="text-amber-500 font-extrabold">+</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mt-3 font-normal max-w-xl leading-relaxed">
            Smart, multilingual OPD intake terminal with instant voice triage, ABHA digital health records, and AI-assisted clinical interviews.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              id="hero-get-started-btn"
              onClick={onContinue}
              className="py-3.5 px-7 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-2.5 shadow-lg shadow-indigo-600/25 transition-all transform active:scale-98"
            >
              <span>Get Started (शुरू करें)</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Selected: {languages.find((l) => l.code === selectedLanguage)?.name} ({selectedLanguage.toUpperCase()})</span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 460 340" className="w-full max-w-[320px] sm:max-w-[380px] h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="230" cy="160" r="130" fill="#f5f3ff" />
            <rect x="320" y="30" width="60" height="60" rx="16" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 5" />
            <circle cx="70" cy="90" r="26" fill="#ede9fe" />
            <circle cx="390" cy="200" r="16" fill="#fde68a" />
            <polygon points="100,240 122,205 144,240" fill="#fbbf24" opacity="0.8" />

            <g stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4">
              <line x1="50" y1="170" x2="140" y2="170" />
              <line x1="50" y1="188" x2="120" y2="188" />
              <line x1="310" y1="260" x2="400" y2="260" />
            </g>

            <g transform="translate(50, 45)" filter="drop-shadow(0 4px 10px rgba(99, 102, 241, 0.12))">
              <rect width="105" height="60" rx="12" fill="#ffffff" stroke="#e0e7ff" strokeWidth="1.5" />
              <circle cx="18" cy="20" r="7" fill="#e0e7ff" />
              <path d="M15 20h6M18 17v6" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="32" y="17" width="50" height="7" rx="3.5" fill="#6366f1" />
              <rect x="14" y="36" width="75" height="5" rx="2.5" fill="#cbd5e1" />
              <rect x="14" y="45" width="45" height="4" rx="2" fill="#f1f5f9" />
            </g>

            <g transform="translate(310, 130)" filter="drop-shadow(0 4px 10px rgba(245, 158, 11, 0.15))">
              <rect width="110" height="65" rx="12" fill="#ffffff" stroke="#fde68a" strokeWidth="1.5" />
              <rect x="12" y="14" width="28" height="10" rx="3" fill="#f59e0b" />
              <rect x="46" y="16" width="50" height="6" rx="3" fill="#e2e8f0" />
              <line x1="12" y1="36" x2="98" y2="36" stroke="#f1f5f9" strokeWidth="2" />
              <circle cx="18" cy="48" r="4.5" fill="#10b981" />
              <rect x="28" y="46" width="55" height="5" rx="2.5" fill="#cbd5e1" />
            </g>

            <rect x="80" y="270" width="290" height="7" rx="3.5" fill="#e2e8f0" />

            <path d="M175 275v-58c0-12 10-20 20-20h50c11 0 20 8 20 20v58" fill="#4f46e5" />
            <path d="M210 197l15 18 15-18h-30z" fill="#ffffff" />
            <circle cx="225" cy="155" r="23" fill="#fcd34d" />
            <path d="M202 155c0-14 10-25 23-25 13 0 23 11 23 25 0 4-1 7-3 10-2-11-9-16-20-16s-19 5-20 16c-2-3-3-6-3-10z" fill="#1e293b" />

            <path d="M175 220l32 28" stroke="#4f46e5" strokeWidth="12" strokeLinecap="round" />
            <path d="M265 220l-22 28" stroke="#4f46e5" strokeWidth="12" strokeLinecap="round" />
            <circle cx="207" cy="248" r="6" fill="#fcd34d" />
            <circle cx="243" cy="248" r="6" fill="#fcd34d" />

            <rect x="184" y="202" width="76" height="48" rx="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
            <rect x="188" y="206" width="68" height="40" rx="3" fill="#1e1b4b" />
            <line x1="194" y1="215" x2="220" y2="215" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <line x1="194" y1="222" x2="238" y2="222" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
            <line x1="194" y1="229" x2="212" y2="229" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            <circle cx="242" cy="233" r="6" fill="#f59e0b" opacity="0.9" />

            <path d="M166 254h112l-10 16h-92l-10-16z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
            <rect x="208" y="260" width="28" height="3" rx="1.5" fill="#d97706" />

            <path d="M345 85l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5 2.5-6z" fill="#f59e0b" />
            <path d="M115 130l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2 2-4.5z" fill="#6366f1" />
            <circle cx="185" cy="110" r="3.5" fill="#f59e0b" />
          </svg>
        </div>
      </div>

      <div className="w-full mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700 uppercase tracking-wider font-mono">
          Available Kiosk Languages ({languages.length})
        </p>
        <p className="text-xs text-slate-500 font-medium">
          Touch any card to switch interface language
        </p>
      </div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
        {languages.map((lang) => {
          const isSelected = selectedLanguage === lang.code;

          return (
            <div
              key={lang.code}
              id={`lang-card-${lang.code}`}
              onClick={() => handleCardClick(lang)}
              className={`relative p-5 rounded-3xl cursor-pointer transition-all duration-200 border-2 flex flex-col justify-between group active:scale-98 ${
                isSelected
                  ? 'stitch-card-active scale-[1.02]'
                  : 'stitch-card hover:border-indigo-400'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-wide">
                  {lang.nativeName}
                </p>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  {lang.name}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => handlePreviewAudio(e, lang)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold border border-slate-200 transition"
                  title="Listen pronunciation"
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Audio</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono font-bold">
                  {lang.code.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        id="lang-continue-btn"
        onClick={onContinue}
        className="w-full max-w-md py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/25 transition-all transform active:scale-98"
      >
        <span>Get Started • Proceed to Consent (आगे बढ़ें)</span>
        <ArrowRight className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
