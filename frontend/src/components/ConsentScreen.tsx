import { apiFetch, apiUrl } from '../config/api';
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

  const speakItemConsent = (key: keyof ConsentSettings, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const itemPrompts: Record<string, Record<string, string>> = {
      demographics: {
        en: 'Identity verification consent: Allows verifying your name, age, gender, and contact for hospital OPD registration.',
        hi: 'पहचान सत्यापन संमती: अस्पताल ओपीडी पंजीकरण के लिए आपका नाम, आयु और संपर्क जानकारी सत्यापित करने की अनुमति देता है।',
        te: 'గుర్తింపు ధృవీకరణ సమ్మతి: ఆసుపత్రి OPD నమోదు కోసం మీ పేరు మరియు వివరాలను ధృవీకరించడానికి అనుమతిస్తుంది.',
      },
      medicalHistory: {
        en: 'Clinical history consent: Allows capturing your symptoms, pain scores, and medical background for doctor review.',
        hi: 'नैदानिक इतिहास संमती: डॉक्टर की समीक्षा के लिए आपके लक्षण और स्वास्थ्य विवरण दर्ज करने की अनुमति देता है।',
        te: 'వైద్య చరిత్ర సమ్మతి: డాక్టర్ పరిశీలన కోసం మీ లక్షణాలు నమోదు చేయడానికి అనుమతిస్తుంది.',
      },
      documentOcr: {
        en: 'Document digitization consent: Scans and extracts medications and laboratory reports from your past records.',
        hi: 'दस्तावेज़ डिजिटलीकरण संमती: आपके पुराने पर्चे और लैब रिपोर्ट को स्कैन करके डिजिटल बनाता है।',
        te: 'పత్రాల డిజిటలైజేషన్ సమ్మతి: మీ పాత వైద్య నివేదికలను స్కాన్ చేస్తుంది.',
      },
      abdmLinking: {
        en: 'ABHA Health Account linking consent: Permits pushing consultation summary into your personal digital health locker.',
        hi: 'आभा हेल्थ खाता लिंकिंग संमती: आपके परामर्श सारांश को आपके डिजिटल हेल्थ लॉकर में भेजने की अनुमति देता है।',
        te: 'ABHA హెల్త్ లింకింగ్ సమ్మతి: మీ ఆరోగ్య రికార్డును డిజిటల్ లాకర్‌కు లింక్ చేస్తుంది.',
      },
      voiceRecording: {
        en: 'Voice intake consent: Records speech to assist symptom intake. Audio is purged immediately after consultation.',
        hi: 'आवाज़ रिकॉर्डिंग संमती: केवल लक्षण समझने के लिए उपयोग की जाती है और परामर्श के बाद तुरंत हटा दी जाती है।',
        te: 'వాయిస్ రికార్డింగ్ సమ్మతి: లక్షణాల నమోదు తర్వాత ఆడియో తొలగించబడుతుంది.',
      },
    };
    const lang = (selectedLanguage in (itemPrompts.demographics || {})) ? selectedLanguage : 'en';
    const text = itemPrompts[key]?.[lang] || itemPrompts[key]?.en || '';
    if (text) {
      speechService.speak(text, selectedLanguage);
    }
  };

  const toggleItem = (key: keyof ConsentSettings) => {
    if (typeof consent[key] === 'boolean') {
      const nextVal = !consent[key];
      onUpdateConsent({
        ...consent,
        [key]: nextVal,
      });
      if (isAudioNarration) {
        speakItemConsent(key);
      }
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
    if (isAudioNarration) {
      speechService.speak(
        selectedLanguage === 'hi'
          ? 'सभी शर्तों को स्वीकार कर लिया गया है।'
          : selectedLanguage === 'te'
          ? 'అన్ని నిబంధనలు ఆమోదించబడ్డాయి.'
          : 'All consent terms selected. Data will be purged post-consultation.',
        selectedLanguage
      );
    }
  };

  const handleProceedWithLedger = async () => {
    try {
      // Record immutable consent ledger entry per DPDP 2023
      ['demographics', 'medicalHistory', 'documentOcr', 'abdmLinking', 'voiceRecording'].forEach((item) => {
        apiFetch('/api/consent/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            langCode: selectedLanguage,
            consentType: item,
            consentVersion: 'DPDP-2023-v1',
            isGranted: Boolean(consent[item as keyof ConsentSettings]),
          }),
        }).catch(() => {});
      });
    } catch {
      // Non-blocking
    }
    onContinue();
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
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          {translate('dpdpConsentTitle', selectedLanguage)}
        </h2>
        {selectedLanguage !== 'en' && (
          <p className="text-sm font-semibold text-indigo-700 mt-0.5">
            {translate('dpdpConsentTitle', 'en')}
          </p>
        )}
        <p className="text-slate-600 text-sm sm:text-base mt-1.5 leading-relaxed">
          {translate('dpdpConsentSub', selectedLanguage)}
        </p>
        {selectedLanguage !== 'en' && (
          <p className="text-xs text-slate-400 mt-0.5">
            {translate('dpdpConsentSub', 'en')}
          </p>
        )}
      </div>

      {/* Main Consent Card */}
      <div className="stitch-card p-6 sm:p-8 mb-6">
        {/* Audio Prompt Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50/80 border border-indigo-200/80 mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span>{translate('dpdpAudioNotice', selectedLanguage)}</span>
              {selectedLanguage !== 'en' && (
                <span className="block text-[10px] text-indigo-700/80 font-normal">
                  {translate('dpdpAudioNotice', 'en')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handlePlayAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm shrink-0"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isPlayingAudio ? translate('pauseVoice', selectedLanguage) : `${translate('listen', selectedLanguage)} Consent`}</span>
          </button>
        </div>

        {/* DPDP Legal Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-xs text-slate-700 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p>
              In compliance with the <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> and{' '}
              <strong>Ayushman Bharat Digital Mission (ABDM)</strong>, you maintain complete ownership over your clinical records.
            </p>
          </div>
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
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {translate('consentDemographics', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {translate('consentDemographics', 'en')}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {translate('consentDemographicsSub', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {translate('consentDemographicsSub', 'en')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2 py-0.5 rounded-lg bg-violet-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold uppercase">
                {translate('required', selectedLanguage)}
              </span>
              {selectedLanguage !== 'en' && (
                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                  Required
                </span>
              )}
            </div>
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
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {translate('consentMedical', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {translate('consentMedical', 'en')}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {translate('consentMedicalSub', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {translate('consentMedicalSub', 'en')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2 py-0.5 rounded-lg bg-violet-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold uppercase">
                {translate('required', selectedLanguage)}
              </span>
              {selectedLanguage !== 'en' && (
                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                  Required
                </span>
              )}
            </div>
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
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {translate('consentOcr', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {translate('consentOcr', 'en')}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {translate('consentOcrSub', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {translate('consentOcrSub', 'en')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-mono font-bold uppercase">
                {translate('optional', selectedLanguage)}
              </span>
              {selectedLanguage !== 'en' && (
                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                  Optional
                </span>
              )}
            </div>
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
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {translate('consentAbdm', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {translate('consentAbdm', 'en')}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {translate('consentAbdmSub', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {translate('consentAbdmSub', 'en')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-mono font-bold uppercase">
                {translate('optional', selectedLanguage)}
              </span>
              {selectedLanguage !== 'en' && (
                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                  Optional
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Accept All button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSelectAll}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4 flex flex-col items-end"
          >
            <span>{translate('selectAllTerms', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="text-[10px] font-normal text-slate-400">
                {translate('selectAllTerms', 'en')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center justify-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <div className="text-left">
            <span>{translate('changeLanguage', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] text-slate-400 font-medium">
                {translate('changeLanguage', 'en')}
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            id="consent-confirm-btn"
            disabled={!canProceed}
            onClick={handleProceedWithLedger}
            className={`py-3.5 px-8 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all ${
              canProceed
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-600/25 active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <div className="text-left">
              <span>{translate('agreeAndProceed', selectedLanguage)}</span>
              {selectedLanguage !== 'en' && (
                <span className="block text-[11px] font-normal opacity-85">
                  {translate('agreeAndProceed', 'en')}
                </span>
              )}
            </div>
            <ArrowRight className="w-5 h-5 stroke-[2.5] shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
