import React, { useState, useEffect } from 'react';
import { ShieldCheck, Volume2, Lock, ArrowRight, ArrowLeft, CheckSquare, Square, Info } from 'lucide-react';
import { ConsentSettings, LanguageCode } from '../types';
import { speechService } from '../services/speechService';
import { translate } from '../services/i18n';

interface ConsentScreenProps {
  consent: ConsentSettings;
  onUpdateConsent: (consent: ConsentSettings) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
  isAudioNarration: boolean;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({
  consent,
  onUpdateConsent,
  onContinue,
  onBack,
  selectedLanguage,
  isAudioNarration,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const consentPromptText =
    selectedLanguage === 'te'
      ? 'మెడికియోస్క్ మీ ఆరోగ్య చరిత్ర మరియు లక్షణాలను సేకరిస్తుంది. మీ డేటా సురక్షితంగా ఉంది.'
      : selectedLanguage === 'ta'
      ? 'மெடிகியோஸ்க் உங்கள் மருத்துவ வரலாறு மற்றும் அறிகுறிகளை சேகரிக்கிறது. உங்கள் தரவு பாதுகாப்பாக உள்ளது.'
      : selectedLanguage === 'kn'
      ? 'ಮೆಡಿಕಿಯೋಸ್ಕ್ ನಿಮ್ಮ ಆರೋಗ್ಯ ಇತಿಹಾಸ ಮತ್ತು ರೋಗಲಕ್ಷಣಗಳನ್ನು ಸಂಗ್ರಹಿಸುತ್ತದೆ. ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.'
      : selectedLanguage === 'ml'
      ? 'മെഡികിയോസ്ക് നിങ്ങളുടെ ആരോഗ്യ ചരിത്രവും ലക്ഷണങ്ങളും ശേഖരിക്കുന്നു. നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമാണ്.'
      : selectedLanguage === 'mr'
      ? 'मेडीकियोस्क तुमचा वैद्यकीय इतिहास आणि लक्षणे संकलित करतो. तुमचा डेटा सुरक्षित आहे.'
      : 'MediKiosk collects your medical history, symptoms, and scanned prescriptions to assist the doctor with your OPD triage. Your health records are encrypted and protected under ABDM guidelines.';

  useEffect(() => {
    if (isAudioNarration) {
      speechService.speak(consentPromptText, selectedLanguage);
    }
  }, [isAudioNarration, consentPromptText, selectedLanguage]);

  const handlePlayAudio = () => {
    if (isPlayingAudio) {
      speechService.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      speechService.speak(
        consentPromptText,
        selectedLanguage,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false)
      );
    }
  };

  const toggleItem = (key: keyof ConsentSettings) => {
    if (typeof consent[key] === 'boolean') {
      onUpdateConsent({
        ...consent,
        [key]: !consent[key],
      });
    }
  };

  const handleSelectAll = () => {
    onUpdateConsent({
      ...consent,
      demographics: true,
      medicalHistory: true,
      documentOcr: true,
      abdmLinking: true,
      voiceRecording: true,
    });
  };

  const canProceed = consent.demographics && consent.medicalHistory;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Step 1b: DPDP Patient Consent</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          {selectedLanguage === 'ta'
            ? 'தரவு தனியுரிமை மற்றும் மருத்துவ ஒப்புதல்'
            : selectedLanguage === 'te'
            ? 'డేటా గోప్యత మరియు వైద్య సమ్మతి'
            : selectedLanguage === 'kn'
            ? 'ಡೇಟಾ ಗೌಪ್ಯತೆ ಮತ್ತು ವೈದ್ಯಕೀಯ ಒಪ್ಪಿಗೆ'
            : selectedLanguage === 'ml'
            ? 'ഡാറ്റ സ്വകാര്യതയും മെഡിക്കൽ സമ്മതവും'
            : selectedLanguage === 'mr'
            ? 'डेटा गोपनीयता आणि वैद्यकीय संमती'
            : 'Data Privacy & Medical Consent'}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-1">
          {selectedLanguage === 'ta'
            ? 'டிஜிட்டல் தனிநபர் தரவு பாதுகாப்பு (DPDP) சட்டம் மற்றும் ABDM வழிகாட்டுதல்களின் கீழ் ஒப்புதல்'
            : selectedLanguage === 'te'
            ? 'డిజిటల్ పర్సనల్ డేటా ప్రొటెక్షన్ (DPDP) చట్టం మరియు ABDM మార్గదర్శకాల ప్రకారం సమ్మతి'
            : selectedLanguage === 'kn'
            ? 'ಡಿಜಿಟಲ್ ವೈಯಕ್ತಿಕ ಡೇಟಾ ರಕ್ಷಣೆ (DPDP) ಕಾಯ್ದೆ ಮತ್ತು ABDM ಮಾರ್ಗಸೂಚಿಗಳ ಅಡಿಯಲ್ಲಿ ಒಪ್ಪಿಗೆ'
            : selectedLanguage === 'ml'
            ? 'ഡിജിറ്റൽ വ്യക്തിഗത ഡാറ്റാ പരിരക്ഷ (DPDP) നിയമത്തിന്റെയും ABDM മാർഗ്ഗനിർദ്ദേശങ്ങളുടെയും കീഴിലുള്ള സമ്മതം'
            : selectedLanguage === 'mr'
            ? 'डिजिटल वैयक्तिक डेटा संरक्षण (DPDP) कायदा आणि ABDM मार्गदर्शक तत्त्वांतर्गत संमती'
            : 'Consent in compliance with Digital Personal Data Protection (DPDP) Act 2023 & ABDM'}
        </p>
      </div>

      {/* Main Consent Card */}
      <div className="stitch-card p-6 sm:p-8 mb-6">
        {/* Audio Prompt Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50/80 border border-indigo-200/80 mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>DPDP Act 2023 Compliant: Data deleted from kiosk upon token issue</span>
          </div>
          <button
            onClick={handlePlayAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isPlayingAudio ? translate('pauseVoice', selectedLanguage) : `${translate('listen', selectedLanguage)} Consent`}</span>
          </button>
        </div>

        {/* DPDP Legal Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-xs text-slate-700 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            In compliance with the <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> and{' '}
            <strong>Ayushman Bharat Digital Mission (ABDM)</strong>, you maintain complete ownership over your clinical records.
          </p>
        </div>

        {/* Consent Options List */}
        <div className="space-y-3.5">
          {/* 1. Demographics */}
          <div
            role="checkbox"
            aria-checked={consent.demographics}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleItem('demographics'); } }}
            onClick={() => toggleItem('demographics')}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
              consent.demographics
                ? 'stitch-card-active'
                : 'stitch-card hover:border-indigo-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {consent.demographics ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Demographic & Identity Verification (ABHA / Aadhaar)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows verifying your name, age, gender, and contact for hospital OPD registration.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-violet-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold uppercase shrink-0">
              Required
            </span>
          </div>

          {/* 2. Medical History & SOCRATES Interview */}
          <div
            role="checkbox"
            aria-checked={consent.medicalHistory}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleItem('medicalHistory'); } }}
            onClick={() => toggleItem('medicalHistory')}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
              consent.medicalHistory
                ? 'stitch-card-active'
                : 'stitch-card hover:border-indigo-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {consent.medicalHistory ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Symptom History & Clinical SOCRATES Assessment
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows capturing your current chief complaints, pain scores, and medical background for doctor review.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-violet-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold uppercase shrink-0">
              Required
            </span>
          </div>

          {/* 3. Document OCR */}
          <div
            role="checkbox"
            aria-checked={consent.documentOcr}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleItem('documentOcr'); } }}
            onClick={() => toggleItem('documentOcr')}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
              consent.documentOcr
                ? 'stitch-card-active'
                : 'stitch-card hover:border-indigo-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {consent.documentOcr ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Prescription & Lab Report AI OCR Digitization
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows scanning past paper prescriptions and extracting test values & medications automatically.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-mono font-bold uppercase shrink-0">
              Optional
            </span>
          </div>

          {/* 4. ABDM / FHIR Interoperability */}
          <div
            role="checkbox"
            aria-checked={consent.abdmLinking}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleItem('abdmLinking'); } }}
            onClick={() => toggleItem('abdmLinking')}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
              consent.abdmLinking
                ? 'stitch-card-active'
                : 'stitch-card hover:border-indigo-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {consent.abdmLinking ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Link with Ayushman Bharat Health Account (ABDM / FHIR R4)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permits pushing verified consultation summary into your personal ABHA digital health locker.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-mono font-bold uppercase shrink-0">
              Optional
            </span>
          </div>
        </div>

        {/* Quick Accept All button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSelectAll}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
          >
            Select All Terms (सभी चुनें)
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Language</span>
        </button>

        <button
          id="consent-confirm-btn"
          disabled={!canProceed}
          onClick={onContinue}
          className={`py-4 px-8 rounded-2xl font-black text-base flex items-center gap-3 transition-all ${
            canProceed
              ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-600/25 active:scale-98'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>I Agree & Proceed (सहमति देकर आगे बढ़ें)</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
