import { LanguageCode } from '../types';

type TranslationKey =
  | 'stepIdentify'
  | 'stepConverse'
  | 'stepHistory'
  | 'stepScanDocs'
  | 'stepPrivacy'
  | 'stepSummary'
  | 'back'
  | 'continue'
  | 'next'
  | 'retry'
  | 'loading'
  | 'listen'
  | 'pauseVoice'
  | 'required'
  | 'optional'
  | 'language'
  | 'identity'
  | 'vitals'
  | 'complaint'
  | 'history'
  | 'documents'
  | 'privacy'
  | 'summary'
  | 'selectLanguage'
  | 'recordVitals'
  | 'selectComplaint'
  | 'familyHistory'
  | 'scanDocuments'
  | 'dataProtected'
  | 'backToIdentity'
  | 'confirmVitals'
  | 'startInterview'
  | 'voiceListening'
  | 'voiceError';

const translations: Record<LanguageCode, Partial<Record<TranslationKey, string>>> = {
  en: {
    stepIdentify: '1. Identify', stepConverse: '2. Converse', stepHistory: '3. History', stepScanDocs: '4. Scan Docs', stepPrivacy: '5. Privacy', stepSummary: '6. Summary',
    back: 'Back', continue: 'Continue', next: 'Next', retry: 'Retry', loading: 'Loading...', listen: 'Listen', pauseVoice: 'Pause Voice', required: 'Required', optional: 'Optional', language: 'Language', identity: 'Patient Identification', vitals: 'Record Your Vitals', complaint: 'Primary Complaint', history: 'Family & Social History', documents: 'Scan Documents', privacy: 'Your Data is Protected', summary: 'Summary', selectLanguage: 'Choose your language', recordVitals: 'Record Your Vitals', selectComplaint: 'Select OPD Category & Primary Complaint', familyHistory: 'Family & Social History', scanDocuments: 'Digitize your medical documents', dataProtected: 'Your Data is Protected', backToIdentity: 'Back to Identity', confirmVitals: 'Confirm Vitals & Select Complaint', startInterview: 'Start Clinical Interview', voiceListening: 'Listening. Please speak clearly.', voiceError: 'Voice recognition failed. Please try again.',
  },
  te: {
    stepIdentify: '1. గుర్తింపు', stepConverse: '2. సంభాషణ', stepHistory: '3. చరిత్ర', stepScanDocs: '4. పత్రాలు', stepPrivacy: '5. గోప్యత', stepSummary: '6. సారాంశం',
    back: 'వెనుకకు', continue: 'కొనసాగించు', next: 'తర్వాత', retry: 'మళ్లీ ప్రయత్నించు', loading: 'లోడ్ అవుతోంది...', listen: 'వినండి', pauseVoice: 'వాయిస్ ఆపు', required: 'అవసరం', optional: 'ఐచ్ఛికం', language: 'భాష', identity: 'రోగి గుర్తింపు', vitals: 'మీ ఆరోగ్య కొలతలను నమోదు చేయండి', complaint: 'ప్రధాన సమస్య', history: 'కుటుంబ మరియు వ్యక్తిగత చరిత్ర', documents: 'పత్రాలను స్కాన్ చేయండి', privacy: 'మీ డేటా రక్షించబడింది', summary: 'సారాంశం', selectLanguage: 'మీ భాషను ఎంచుకోండి', recordVitals: 'ఆరోగ్య కొలతలను నమోదు చేయండి', selectComplaint: 'OPD విభాగం మరియు ప్రధాన సమస్యను ఎంచుకోండి', familyHistory: 'కుటుంబ మరియు సామాజిక చరిత్ర', scanDocuments: 'వైద్య పత్రాలను డిజిటల్ చేయండి', dataProtected: 'మీ డేటా సురక్షితంగా ఉంది', backToIdentity: 'గుర్తింపుకు తిరిగి వెళ్ళండి', confirmVitals: 'కొలతలను నిర్ధారించి సమస్యను ఎంచుకోండి', startInterview: 'క్లినికల్ ఇంటర్వ్యూ ప్రారంభించండి', voiceListening: 'వింటున్నాము. స్పష్టంగా మాట్లాడండి.', voiceError: 'వాయిస్ గుర్తింపు విఫలమైంది.',
  },
  ta: {
    stepIdentify: '1. அடையாளம்', stepConverse: '2. உரையாடல்', stepHistory: '3. வரலாறு', stepScanDocs: '4. ஆவணங்கள்', stepPrivacy: '5. தனியுரிமை', stepSummary: '6. சுருக்கம்',
    back: 'பின்செல்', continue: 'தொடர்க', next: 'அடுத்து', retry: 'மீண்டும் முயற்சி', loading: 'ஏற்றுகிறது...', listen: 'கேளுங்கள்', pauseVoice: 'குரலை நிறுத்து', required: 'தேவை', optional: 'விருப்பம்', language: 'மொழி', identity: 'நோயாளி அடையாளம்', vitals: 'உங்கள் உடல்நல அளவுகளை பதிவு செய்யவும்', complaint: 'முக்கிய புகார்', history: 'குடும்ப மற்றும் தனிப்பட்ட வரலாறு', documents: 'ஆவணங்களை ஸ்கேன் செய்க', privacy: 'உங்கள் தரவு பாதுகாக்கப்படுகிறது', summary: 'சுருக்கம்', selectLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்', recordVitals: 'உடல்நல அளவுகளை பதிவு செய்க', selectComplaint: 'OPD பிரிவு மற்றும் முக்கிய புகாரைத் தேர்ந்தெடுக்கவும்', familyHistory: 'குடும்ப மற்றும் சமூக வரலாறு', scanDocuments: 'மருத்துவ ஆவணங்களை டிஜிட்டல் செய்யவும்', dataProtected: 'உங்கள் தரவு பாதுகாப்பாக உள்ளது', backToIdentity: 'அடையாளத்திற்குத் திரும்பு', confirmVitals: 'அளவுகளை உறுதிசெய்து புகாரைத் தேர்ந்தெடுக்கவும்', startInterview: 'மருத்துவ நேர்காணலைத் தொடங்கு', voiceListening: 'கேட்கிறோம். தெளிவாகப் பேசவும்.', voiceError: 'குரல் அங்கீகாரம் தோல்வியடைந்தது.',
  },
  kn: {
    stepIdentify: '1. ಗುರುತು', stepConverse: '2. ಸಂಭಾಷಣೆ', stepHistory: '3. ಇತಿಹಾಸ', stepScanDocs: '4. ದಾಖಲೆಗಳು', stepPrivacy: '5. ಗೌಪ್ಯತೆ', stepSummary: '6. ಸಾರಾಂಶ',
    back: 'ಹಿಂದೆ', continue: 'ಮುಂದುವರಿಸಿ', next: 'ಮುಂದೆ', retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...', listen: 'ಕೇಳಿ', pauseVoice: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ', required: 'ಅಗತ್ಯ', optional: 'ಐಚ್ಛಿಕ', language: 'ಭಾಷೆ', identity: 'ರೋಗಿಯ ಗುರುತು', vitals: 'ಆರೋಗ್ಯ ಅಳತೆಗಳನ್ನು ದಾಖಲಿಸಿ', complaint: 'ಮುಖ್ಯ ದೂರು', history: 'ಕುಟುಂಬ ಮತ್ತು ವೈಯಕ್ತಿಕ ಇತಿಹಾಸ', documents: 'ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ', privacy: 'ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ', summary: 'ಸಾರಾಂಶ', selectLanguage: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ', recordVitals: 'ಆರೋಗ್ಯ ಅಳತೆಗಳನ್ನು ದಾಖಲಿಸಿ', selectComplaint: 'OPD ವಿಭಾಗ ಮತ್ತು ಮುಖ್ಯ ದೂರು ಆಯ್ಕೆಮಾಡಿ', familyHistory: 'ಕುಟುಂಬ ಮತ್ತು ಸಾಮಾಜಿಕ ಇತಿಹಾಸ', scanDocuments: 'ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ಡಿಜಿಟಲ್ ಮಾಡಿ', dataProtected: 'ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ', backToIdentity: 'ಗುರುತಿಗೆ ಹಿಂತಿರುಗಿ', confirmVitals: 'ಅಳತೆಗಳನ್ನು ದೃಢೀಕರಿಸಿ ದೂರು ಆಯ್ಕೆಮಾಡಿ', startInterview: 'ವೈದ್ಯಕೀಯ ಸಂದರ್ಶನ ಪ್ರಾರಂಭಿಸಿ', voiceListening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ. ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ.', voiceError: 'ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ವಿಫಲವಾಗಿದೆ.',
  },
  ml: {
    stepIdentify: '1. തിരിച്ചറിയൽ', stepConverse: '2. സംഭാഷണം', stepHistory: '3. ചരിത്രം', stepScanDocs: '4. രേഖകൾ', stepPrivacy: '5. സ്വകാര്യത', stepSummary: '6. സംഗ്രഹം',
    back: 'തിരികെ', continue: 'തുടരുക', next: 'അടുത്തത്', retry: 'വീണ്ടും ശ്രമിക്കുക', loading: 'ലോഡ് ചെയ്യുന്നു...', listen: 'കേൾക്കുക', pauseVoice: 'ശബ്ദം നിർത്തുക', required: 'ആവശ്യമാണ്', optional: 'ഓപ്ഷണൽ', language: 'ഭാഷ', identity: 'രോഗിയുടെ തിരിച്ചറിയൽ', vitals: 'ആരോഗ്യ അളവുകൾ രേഖപ്പെടുത്തുക', complaint: 'പ്രധാന പരാതി', history: 'കുടുംബ, വ്യക്തിഗത ചരിത്രം', documents: 'രേഖകൾ സ്കാൻ ചെയ്യുക', privacy: 'നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമാണ്', summary: 'സംഗ്രഹം', selectLanguage: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക', recordVitals: 'ആരോഗ്യ അളവുകൾ രേഖപ്പെടുത്തുക', selectComplaint: 'OPD വിഭാഗവും പ്രധാന പരാതിയും തിരഞ്ഞെടുക്കുക', familyHistory: 'കുടുംബ, സാമൂഹിക ചരിത്രം', scanDocuments: 'മെഡിക്കൽ രേഖകൾ ഡിജിറ്റൈസ് ചെയ്യുക', dataProtected: 'നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമാണ്', backToIdentity: 'തിരിച്ചറിയലിലേക്ക് മടങ്ങുക', confirmVitals: 'അളവുകൾ സ്ഥിരീകരിച്ച് പരാതി തിരഞ്ഞെടുക്കുക', startInterview: 'ക്ലിനിക്കൽ അഭിമുഖം ആരംഭിക്കുക', voiceListening: 'കേൾക്കുന്നു. വ്യക്തമായി സംസാരിക്കുക.', voiceError: 'ശബ്ദ തിരിച്ചറിയൽ പരാജയപ്പെട്ടു.',
  },
  mr: {
    stepIdentify: '१. ओळख', stepConverse: '२. संवाद', stepHistory: '३. इतिहास', stepScanDocs: '४. कागदपत्रे', stepPrivacy: '५. गोपनीयता', stepSummary: '६. सारांश',
    back: 'मागे', continue: 'पुढे चला', next: 'पुढील', retry: 'पुन्हा प्रयत्न करा', loading: 'लोड होत आहे...', listen: 'ऐका', pauseVoice: 'आवाज थांबवा', required: 'आवश्यक', optional: 'पर्यायी', language: 'भाषा', identity: 'रुग्णाची ओळख', vitals: 'आरोग्य मोजमाप नोंदवा', complaint: 'मुख्य तक्रार', history: 'कौटुंबिक व वैयक्तिक इतिहास', documents: 'कागदपत्रे स्कॅन करा', privacy: 'तुमचा डेटा सुरक्षित आहे', summary: 'सारांश', selectLanguage: 'आपली भाषा निवडा', recordVitals: 'आरोग्य मोजमाप नोंदवा', selectComplaint: 'OPD विभाग आणि मुख्य तक्रार निवडा', familyHistory: 'कौटुंबिक व सामाजिक इतिहास', scanDocuments: 'वैद्यकीय कागदपत्रे डिजिटल करा', dataProtected: 'तुमचा डेटा सुरक्षित आहे', backToIdentity: 'ओळखीकडे परत जा', confirmVitals: 'मोजमाप निश्चित करून तक्रार निवडा', startInterview: 'क्लिनिकल मुलाखत सुरू करा', voiceListening: 'ऐकत आहोत. स्पष्ट बोला.', voiceError: 'आवाज ओळखता आला नाही.',
  },
};

export function translate(key: TranslationKey, language: LanguageCode, fallback?: string): string {
  return translations[language]?.[key] || translations.en[key] || fallback || key;
}

export function getVoicePrompt(language: LanguageCode, key: 'voiceListening' | 'voiceError'): string {
  return translate(key, language);
}
