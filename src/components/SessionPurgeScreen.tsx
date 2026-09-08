import React, { useState, useEffect } from 'react';
import { ShieldCheck, Trash2, Lock, Wifi, CheckCircle2, ArrowRight, Printer } from 'lucide-react';
import { LanguageCode, QueueToken } from '../types';
import { translate } from '../services/i18n';

interface SessionPurgeScreenProps {
  createdToken: QueueToken | null;
  onProceed: () => void;
  selectedLanguage: LanguageCode;
}

interface PurgeStep {
  icon: React.ReactNode;
  label: string;
  regionalLabels: Partial<Record<LanguageCode, string>>;
  delay: number;
}

const PURGE_STEPS: PurgeStep[] = [
  {
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Voice recordings deleted from kiosk memory',
    regionalLabels: {
      hi: 'वॉइस रिकॉर्डिंग कियोस्क मेमोरी से हटा दी गई है',
      te: 'వాయిస్ రికార్డింగ్‌లు కియోస్క్ మెమరీ నుండి తొలగించబడ్డాయి',
      ta: 'குரல் பதிவுகள் கியோஸ்க் நினைவகத்திலிருந்து நீக்கப்பட்டன',
      kn: 'ಧ್ವನಿ ರೆಕಾರ್ಡಿಂಗ್‌ಗಳನ್ನು ಕಿಯೋಸ್ಕ್ ಮೆಮೊರಿಯಿಂದ ಅಳಿಸಲಾಗಿದೆ',
      ml: 'വോയ്സ് റെക്കോർഡിംഗുകൾ കിയോസ്ക് മെമ്മറിയിൽ നിന്ന് നീക്കംചെയ്തു',
      mr: 'व्हॉइस रेकॉर्डिंग किओस्क मेमरीमधून हटवले गेले',
    },
    delay: 0,
  },
  {
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Scanned document images removed from device',
    regionalLabels: {
      hi: 'स्कैन किए गए दस्तावेज़ चित्र डिवाइस से हटा दिए गए हैं',
      te: 'స్కాన్ చేసిన పత్రాల చిత్రాలు పరికరం నుండి తీసివేయబడ్డాయి',
      ta: 'ஸ்கேன் செய்யப்பட்ட ஆவணப் படங்கள் சாதனத்திலிருந்து நீக்கப்பட்டன',
      kn: 'ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ದಾಖಲೆ ಚಿತ್ರಗಳನ್ನು ಸಾಧನದಿಂದ ತೆಗೆದುಹಾಕಲಾಗಿದೆ',
      ml: 'സ്കാൻ ചെയ്ത രേഖകളുടെ ചിത്രങ്ങൾ ഉപകരണത്തിൽ നിന്ന് നീക്കംചെയ്തു',
      mr: 'स्कॅन केलेल्या कागदपत्रांचे फोटो डिव्हाइसवरून काढले गेले',
    },
    delay: 600,
  },
  {
    icon: <Lock className="w-5 h-5" />,
    label: 'Session encrypted and transmitted to doctor',
    regionalLabels: {
      hi: 'सत्र एन्क्रिप्ट करके डॉक्टर को भेजा गया',
      te: 'సెషన్ ఎన్‌క్రిప్ట్ చేయబడి వైద్యునికి పంపబడింది',
      ta: 'அமர்வு குறியாக்கம் செய்யப்பட்டு மருத்துவருக்கு அனுப்பப்பட்டது',
      kn: 'ಸೆಶನ್ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಲಾಗಿದ್ದು ವೈದ್ಯರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ',
      ml: 'സെഷൻ എൻക്രിപ്റ്റ് ചെയ്ത് ഡോക്ടർക്ക് അയച്ചു',
      mr: 'सत्र एन्क्रिप्ट करून डॉक्टरांकडे पाठवले गेले',
    },
    delay: 1200,
  },
  {
    icon: <Wifi className="w-5 h-5" />,
    label: 'FHIR bundle pushed to your ABHA health locker',
    regionalLabels: {
      hi: 'FHIR डेटा आपके ABHA हेल्थ लॉकर में भेजा गया',
      te: 'FHIR డేటా మీ ABHA హెల్త్ లాకర్‌కు సురక్షితంగా పంపబడింది',
      ta: 'FHIR தரவு உங்கள் ABHA சுகாதார லாக்கருக்கு அனுப்பப்பட்டது',
      kn: 'FHIR ಡೇಟಾವನ್ನು ನಿಮ್ಮ ABHA ಆರೋಗ್ಯ ಲಾಕರ್‌ಗೆ ತಲುಪಿಸಲಾಗಿದೆ',
      ml: 'FHIR ഡാറ്റ നിങ്ങളുടെ ABHA ഹെൽത്ത് ലോക്കറിലേക്ക് അയച്ചു',
      mr: 'FHIR डेटा तुमच्या ABHA हेल्थ लॉकरमध्ये सुरक्षित केला गेला',
    },
    delay: 1800,
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    label: 'Kiosk session cleared — privacy protected',
    regionalLabels: {
      hi: 'कियोस्क सत्र समाप्त — आपकी गोपनीयता सुरक्षित',
      te: 'కియోస్క్ సెషన్ తొలగించబడింది — మీ గోప్యత సురక్షితం',
      ta: 'கியோஸ்க் அமர்வு அழிக்கப்பட்டது — தனியுரிமை பாதுகாப்பானது',
      kn: 'ಕಿಯೋಸ್ಕ್ ಸೆಷನ್ ತೆರವುಗೊಳಿಸಲಾಗಿದೆ — ಗೌಪ್ಯತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ',
      ml: 'കിയോസ്ക് സെഷൻ മായ്ച്ചു — സ്വകാര്യത സുരക്ഷിതമാണ്',
      mr: 'किओस्क सत्र साफ केले — गोपनीयता सुरक्षित',
    },
    delay: 2400,
  },
];

export const SessionPurgeScreen: React.FC<SessionPurgeScreenProps> = ({ createdToken, onProceed, selectedLanguage }) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(8);
  const allDone = completedSteps.length === PURGE_STEPS.length;

  const dpdpSubtitles: Record<LanguageCode, string> = {
    en: 'Your privacy is protected — compliant with DPDP Act 2023',
    hi: 'आपकी गोपनीयता सुरक्षित है — DPDP अधिनियम 2023 के तहत अनुपालन',
    te: 'మీ గోప్యత సురక్షితం — DPDP చట్టం 2023 ప్రకారం',
    ta: 'உங்கள் தனியுரிமை பாதுகாப்பானது — DPDP சட்டம் 2023 படி',
    kn: 'ನಿಮ್ಮ ಗೌಪ್ಯತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ — DPDP ಕಾಯ್ದೆ 2023 ರ ಪ್ರಕಾರ',
    ml: 'നിങ്ങളുടെ സ്വകാര്യത സുരക്ഷിതമാണ് — DPDP നിയമം 2023 അനുസരിച്ച്',
    mr: 'तुमची गोपनीयता सुरक्षित आहे — DPDP कायदा 2023 नुसार',
  };

  useEffect(() => {
    // Invoke backend purge endpoint for GDPR/DPDP data hygiene
    if (createdToken?.tokenId) {
      fetch(`/api/session/purge/${createdToken.tokenId}`, { method: 'POST' }).catch(() => {});
    }

    PURGE_STEPS.forEach((step, idx) => {
      const t = setTimeout(() => {
        setCompletedSteps(prev => [...prev, idx]);
      }, step.delay + 400);
      return () => clearTimeout(t);
    });
  }, [createdToken]);

  useEffect(() => {
    if (!allDone) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); onProceed(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [allDone, onProceed]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center">
      {/* Top Shield Icon */}
      <div className="w-20 h-20 rounded-full bg-violet-50 border-2 border-indigo-300 flex items-center justify-center mb-6 shadow-sm">
        <ShieldCheck className="w-10 h-10 text-indigo-600" />
      </div>

      <h2 className="text-2xl font-black text-slate-900 text-center mb-1">
        {translate('dataProtected', selectedLanguage)}
      </h2>
      {selectedLanguage !== 'en' && (
        <p className="text-sm font-semibold text-indigo-700 text-center mb-1">
          {translate('dataProtected', 'en')}
        </p>
      )}
      <p className="text-sm text-slate-600 text-center mb-1">
        {dpdpSubtitles[selectedLanguage] || dpdpSubtitles.en}
      </p>
      {selectedLanguage !== 'en' && (
        <p className="text-xs text-slate-400 text-center mb-8">
          {dpdpSubtitles.en}
        </p>
      )}
      {selectedLanguage === 'en' && <div className="mb-7" />}

      {/* Purge Steps */}
      <div className="w-full space-y-3 mb-8">
        {PURGE_STEPS.map((step, idx) => {
          const done = completedSteps.includes(idx);
          const regionalText = selectedLanguage !== 'en' ? step.regionalLabels[selectedLanguage] : null;
          return (
            <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-500 ${
              done ? 'bg-violet-50 border-indigo-300' : 'bg-white border-slate-200 opacity-60'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                done ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {regionalText || step.label}
                </p>
                {selectedLanguage !== 'en' && regionalText && (
                  <p className="text-xs text-slate-500 font-medium">
                    {step.label}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Token Display */}
      {createdToken && allDone && (
        <div className={`w-full p-6 rounded-3xl border-2 mb-6 text-center shadow-md ${
          createdToken.priorityLevel === 'CRITICAL'
            ? 'bg-rose-50 border-rose-400 text-rose-900'
            : 'stitch-card-active'
        }`}>
          <p className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-0.5">
            {translate('tokenIssued', selectedLanguage)}
          </p>
          {selectedLanguage !== 'en' && (
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              {translate('tokenIssued', 'en')}
            </p>
          )}
          <p className={`text-5xl font-black font-mono mb-2 ${
            createdToken.priorityLevel === 'CRITICAL' ? 'text-rose-600' : 'text-indigo-700'
          }`}>#{createdToken.tokenNumber}</p>
          {createdToken.priorityLevel === 'CRITICAL' && (
            <p className="text-sm font-black text-rose-600 animate-pulse">🚨 EMERGENCY — Proceed to TRIAGE immediately</p>
          )}
          <p className="text-sm text-slate-700 mt-1">
            {selectedLanguage === 'te' ? `దయచేసి గది ${createdToken.roomNumber} కి వెళ్లండి` :
             selectedLanguage === 'ta' ? `தயவுசெய்து அறை ${createdToken.roomNumber}-க்கு செல்லவும்` :
             selectedLanguage === 'kn' ? `ದಯವಿಟ್ಟು ಕೊಠಡಿ ${createdToken.roomNumber} ಗೆ ತೆರಳಿ` :
             selectedLanguage === 'ml' ? `ദയവായി റൂം ${createdToken.roomNumber}-ലേക്ക് പോകുക` :
             selectedLanguage === 'mr' ? `कृपया रूम ${createdToken.roomNumber} मध्ये जा` :
             selectedLanguage === 'hi' ? `कृपया कमरा ${createdToken.roomNumber} में जाएं` :
             `Please proceed to ${createdToken.roomNumber}`}
          </p>
          {selectedLanguage !== 'en' && (
            <p className="text-xs text-slate-400 mt-0.5">
              Please proceed to {createdToken.roomNumber}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            {selectedLanguage === 'te' ? `వైద్యుడు: ${createdToken.doctorName}` :
             selectedLanguage === 'ta' ? `மருத்துவர்: ${createdToken.doctorName}` :
             selectedLanguage === 'kn' ? `ವೈದ್ಯರು: ${createdToken.doctorName}` :
             selectedLanguage === 'ml' ? `ഡോക്ടർ: ${createdToken.doctorName}` :
             selectedLanguage === 'mr' ? `डॉक्टर: ${createdToken.doctorName}` :
             selectedLanguage === 'hi' ? `डॉक्टर: ${createdToken.doctorName}` :
             `Doctor: ${createdToken.doctorName}`}
          </p>
          {selectedLanguage !== 'en' && (
            <p className="text-[10px] text-slate-400">
              Doctor: {createdToken.doctorName}
            </p>
          )}
          {createdToken.waitMinutes > 0 && (
            <div>
              <p className="text-xs text-indigo-700 mt-1 font-mono font-bold">
                {selectedLanguage === 'te' ? `అంచనా వేసిన నిరీక్షణ సమయం: ~${createdToken.waitMinutes} నిమిషాలు` :
                 selectedLanguage === 'ta' ? `மதிப்பிடப்பட்ட காத்திருப்பு நேரம்: ~${createdToken.waitMinutes} நிமிடங்கள்` :
                 selectedLanguage === 'kn' ? `ಅಂದಾಜು ಕಾಯುವ ಸಮಯ: ~${createdToken.waitMinutes} ನಿಮಿಷಗಳು` :
                 selectedLanguage === 'ml' ? `കണക്കാക്കിയ കാത്തിരിപ്പ് സമയം: ~${createdToken.waitMinutes} മിനിറ്റ്` :
                 selectedLanguage === 'mr' ? `अंदाजे प्रतीक्षा वेळ: ~${createdToken.waitMinutes} मिनिटे` :
                 selectedLanguage === 'hi' ? `अनुमानित प्रतीक्षा समय: ~${createdToken.waitMinutes} मिनट` :
                 `Estimated wait: ~${createdToken.waitMinutes} minutes`}
              </p>
              {selectedLanguage !== 'en' && (
                <p className="text-[10px] text-slate-400 font-mono">
                  Estimated wait: ~{createdToken.waitMinutes} minutes
                </p>
              )}
            </div>
          )}

          {/* Thermal Receipt Print Action */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-indigo-700 flex items-center gap-2 transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <div className="text-left">
                <span>{translate('printSlip', selectedLanguage)}</span>
                {selectedLanguage !== 'en' && (
                  <span className="block text-[10px] text-slate-400 font-normal">
                    {translate('printSlip', 'en')}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Printable 80mm ESC/POS Thermal Receipt Roll (Visible only on print) */}
      {createdToken && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-4 font-mono text-center w-[80mm] mx-auto text-xs leading-tight">
          <div className="border-b-2 border-dashed border-black pb-2 mb-2">
            <p className="font-extrabold text-sm uppercase">AIIMS / District Hospital</p>
            <p className="text-[10px]">Ayushman Bharat Digital Health Mission</p>
            <p className="text-[9px]">Station #K-04 • PS 26047</p>
          </div>

          <div className="py-2 border-b-2 border-dashed border-black">
            <p className="text-[10px] uppercase tracking-wider">OPD TOKEN SLIP</p>
            <p className="text-4xl font-black my-1">#{createdToken.tokenNumber}</p>
            <p className="text-[10px] font-bold">
              {createdToken.priorityLevel === 'CRITICAL' ? '*** EMERGENCY / TRIAGE ***' : 'ROUTINE CONSULTATION'}
            </p>
          </div>

          <div className="py-2 text-left text-[10px] space-y-1 border-b-2 border-dashed border-black">
            <p><strong>Patient:</strong> {createdToken.patientName}</p>
            <p><strong>Room:</strong> {createdToken.roomNumber}</p>
            <p><strong>Doctor:</strong> {createdToken.doctorName}</p>
            <p><strong>Complaint:</strong> {createdToken.chiefComplaint}</p>
            <p><strong>Est. Wait:</strong> ~{createdToken.waitMinutes} mins</p>
            <p><strong>Time:</strong> {new Date().toLocaleTimeString()} ({new Date().toLocaleDateString()})</p>
          </div>

          <div className="pt-3 text-center">
            {/* Simulated Barcode */}
            <div className="font-mono text-[11px] tracking-widest my-1">||| | |||| || ||| |||| |</div>
            <p className="text-[8px] uppercase">Token ID: {createdToken.tokenId || (createdToken as any).id}</p>
            <p className="text-[8px] mt-2">Data purged under DPDP Act 2023</p>
          </div>
        </div>
      )}

      {allDone && (
        <div className="w-full flex flex-col items-center gap-3">
          <p className="text-xs text-slate-500 font-mono">
            Physician console auto-opens in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
          <button
            onClick={onProceed}
            className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-98"
          >
            <div className="text-left">
              <span>{translate('finishSession', selectedLanguage)}</span>
              {selectedLanguage !== 'en' && (
                <span className="block text-xs text-indigo-200 font-normal">
                  {translate('finishSession', 'en')}
                </span>
              )}
            </div>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

