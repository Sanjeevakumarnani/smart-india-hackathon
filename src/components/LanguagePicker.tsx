import React, { useState, useEffect } from 'react';
import { Volume2, Check, ArrowRight, Languages, Loader2, Activity, ShieldCheck, Mic } from 'lucide-react';
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
    const ALLOWED_LANGUAGE_CODES: LanguageCode[] = ['en', 'te', 'ta', 'kn', 'ml', 'mr'];

    fetch('/api/languages')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch languages');
        return res.json();
      })
      .then((data: any[]) => {
        const NATIVE_PROMPTS: Record<string, string> = {
          en: 'Welcome. Please select your preferred language to proceed.',
          te: 'స్వాగతం! దయచేసి మీ ప్రాధాన్యత గల భాషను ఎంచుకోండి.',
          ta: 'வணக்கம்! தொடர உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.',
          kn: 'ನಮಸ್ಕಾರ! ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
          ml: 'സ്വാഗതം! തുടരാൻ നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക.',
          mr: 'नमस्कार! कृपया पुढे जाण्यासाठी आपली भाषा निवडा.',
        };

        const filtered = (Array.isArray(data) ? data : []).filter((lang: any) =>
          ALLOWED_LANGUAGE_CODES.includes(lang.code as LanguageCode)
        );

        const mapped = filtered.map((lang) => ({
          code: lang.code as LanguageCode,
          name: lang.name,
          nativeName: lang.native_name || lang.nativeName || lang.name,
          bcp47: lang.bcp47,
          flagEmoji: lang.flag_emoji || lang.flagEmoji || '🇮🇳',
          sortOrder: lang.sort_order ?? lang.sortOrder ?? 0,
          audioPrompt: NATIVE_PROMPTS[lang.code] || `Please select ${lang.name}`,
        }));
        setLanguages(mapped.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('API language fetch error, falling back to static config:', err);
        const NATIVE_PROMPTS: Record<string, string> = {
          en: 'Welcome. Please select your preferred language to proceed.',
          te: 'స్వాగతం! దయచేసి మీ ప్రాధాన్యత గల భాషను ఎంచుకోండి.',
          ta: 'வணக்கம்! தொடர உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.',
          kn: 'ನಮಸ್ಕಾರ! ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
          ml: 'സ്വാഗതം! തുടരാൻ നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക.',
          mr: 'नमस्कार! कृपया पुढे जाण्यासाठी आपली भाषा निवडा.',
        };
        setLanguages([
          { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-IN', flagEmoji: '🇬🇧', sortOrder: 1, audioPrompt: NATIVE_PROMPTS.en },
          { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN', flagEmoji: '🇮🇳', sortOrder: 2, audioPrompt: NATIVE_PROMPTS.te },
          { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN', flagEmoji: '🇮🇳', sortOrder: 3, audioPrompt: NATIVE_PROMPTS.ta },
          { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN', flagEmoji: '🇮🇳', sortOrder: 4, audioPrompt: NATIVE_PROMPTS.kn },
          { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN', flagEmoji: '🇮🇳', sortOrder: 5, audioPrompt: NATIVE_PROMPTS.ml },
          { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN', flagEmoji: '🇮🇳', sortOrder: 6, audioPrompt: NATIVE_PROMPTS.mr },
        ]);
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
    // Automatically advance to the next step immediately
    onContinue();
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Loading languages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-500 mb-4 font-medium">Error loading languages: {error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-3 sm:py-5 flex flex-col justify-center items-center min-h-[calc(100vh-90px)] select-none">
      {/* Compact Header Banner */}
      <div className="text-center mb-3 sm:mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-bold tracking-wide mb-1.5 shadow-xs">
          <Languages className="w-3.5 h-3.5 text-indigo-600" />
          <span>Step 1 of 6 • Select Your Language</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Choose Your Language
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Touch your preferred language to begin OPD intake instantly
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50/90 text-indigo-700 text-[11px] font-semibold border border-indigo-100">
            <Activity className="w-3 h-3 text-indigo-600" />
            Express Intake
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50/90 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            ABDM Compliant
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50/90 text-purple-700 text-[11px] font-semibold border border-purple-100">
            <Mic className="w-3 h-3 text-purple-600" />
            Voice Guided
          </span>
        </div>
      </div>

      {/* 3 Up and 3 Down Grid (Exactly 3 columns, 2 rows for 6 languages) */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 my-2">
        {languages.map((lang) => {
          const isSelected = selectedLanguage === lang.code;

          return (
            <div
              key={lang.code}
              id={`lang-card-${lang.code}`}
              onClick={() => handleCardClick(lang)}
              className={`relative p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-150 border flex flex-col justify-between group active:scale-[0.97] h-[115px] sm:h-[125px] ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-50 to-purple-50/40 border-indigo-600 ring-2 ring-indigo-500/25 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200/90 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              {/* Selected Check Badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base leading-none">{lang.flagEmoji || '🇮🇳'}</span>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {lang.code.toUpperCase()}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                  {lang.nativeName}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {lang.name}
                </p>
              </div>

              {/* Bottom Card Controls */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => handlePreviewAudio(e, lang)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-700 font-bold transition py-0.5"
                  title={`Listen pronunciation for ${lang.name}`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span>Audio</span>
                </button>

                <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>Select</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Touchscreen UX Hint */}
      <p className="text-center text-xs text-slate-400 font-medium mt-2">
        Touch any language card above to instantly proceed to consent
      </p>
    </div>
  );
};
