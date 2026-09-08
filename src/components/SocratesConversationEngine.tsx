import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Send,
  CheckCircle2,
  Brain,
  Loader2,
  HelpCircle,
  Stethoscope,
  Leaf,
  AlertCircle,
  RefreshCw,
  Clock,
  Pill,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { HistoryObject, LanguageCode, SocratesData, OpdType } from '../types';
import { speechService } from '../services/speechService';
import { translate } from '../services/i18n';

interface SocratesConversationEngineProps {
  complaintId: string;
  historyObject: HistoryObject;
  onUpdateHistory: (history: HistoryObject) => void;
  onComplete: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
  isAudioNarration: boolean;
}

export interface GuidanceKeyword {
  id: string;
  question: string;
  questionRegional: string;
  isCovered: boolean;
  extractedDetail: string | null;
}

export const KEYWORD_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  problem: {
    en: 'What is the problem? (Location of pain / discomfort)',
    hi: 'आपकी समस्या क्या है? (दर्द या तकलीफ कहाँ है?)',
    te: 'మీ సమస్య ఏమిటి? (నొప్పి లేదా బాధ ఎక్కడ ఉంది?)',
    ta: 'உங்கள் பிரச்சனை என்ன? (வலி எங்கு உள்ளது?)',
    kn: 'ನಿಮ್ಮ ಸಮಸ್ಯೆ ಏನು? (ನೋವು ಅಥವಾ ತೊಂದರೆ ಎಲ್ಲಿದೆ?)',
    ml: 'നിങ്ങളുടെ പ്രശ്നം എന്താണ്? (വേദന എവിടെയാണ്?)',
    mr: 'तुमची समस्या काय आहे? (वेदना कुठे होत आहे?)',
  },
  duration: {
    en: 'From how long have you been experiencing symptoms?',
    hi: 'यह लक्षण कितने समय से हैं?',
    te: 'ఈ లక్షణాలు ఎంత కాలం నుండి ఉన్నాయి?',
    ta: 'இந்த அறிகுறிகள் எவ்வளவு காலமாக உள்ளன?',
    kn: 'ಈ ರೋಗಲಕ್ಷಣಗಳು ಎಷ್ಟು ಸಮಯದಿಂದ ಇವೆ?',
    ml: 'ഈ ലക്ഷണങ്ങൾ എത്ര കാലമായി ഉണ്ട്?',
    mr: 'ही लक्षणे किती काळापासून आहेत?',
  },
  medications: {
    en: 'Have you taken any previous medications?',
    hi: 'क्या आपने पहले कोई दवाई ली है?',
    te: 'గతంలో లేదా ఇటీవల ఏవైనా మందులు తీసుకున్నారా?',
    ta: 'இதற்கு முன் ஏதேனும் மருந்துகள் எடுத்தீர்களா?',
    kn: 'ಹಿಂದೆ ಅಥವಾ ಇತ್ತೀಚೆಗೆ ಯಾವುದಾದರೂ ಔಷಧಿ ತೆಗೆದುಕೊಂಡಿದ್ದೀರಾ?',
    ml: 'മുമ്പ് എന്തെങ്കിലും മരുന്ന് കഴിച്ചിട്ടുണ്ടോ?',
    mr: 'यापूर्वी काही औषधे घेतली आहेत का?',
  },
  associations: {
    en: 'Any allergies or other associated symptoms?',
    hi: 'क्या कोई एलर्जी या अन्य संबंधित लक्षण हैं?',
    te: 'ఏవైనా అలెర్జీలు లేదా ఇతర సంబంధిత లక్షణాలు ఉన్నాయా?',
    ta: 'ஏதேனும் ஒவ்வாமை அல்லது பிற அறிகுறிகள் உள்ளதா?',
    kn: 'ಯಾವುದಾದರೂ ಅಲರ್ಜಿ ಅಥವಾ ಸಂಬಂಧಿತ ಲಕ್ಷಣಗಳಿವೆಯೇ?',
    ml: 'അലർജിയോ മറ്റ് ലക്ഷണങ്ങളോ ഉണ്ടോ?',
    mr: 'काही अ‍ॅलर्जी किंवा इतर लक्षणे आहेत का?',
  },
  severity: {
    en: 'Severity of pain or discomfort (0 to 10)?',
    hi: 'दर्द या तकलीफ की तीव्रता कितनी है (0 से 10)?',
    te: 'నొప్పి లేదా అసౌకర్య తీవ్రత ఎంత (0 నుండి 10)?',
    ta: 'வலியின் தீவிரம் எவ்வளவு (0 முதல் 10 வரை)?',
    kn: 'ನೋವಿನ ತೀವ್ರತೆ ಎಷ್ಟು (0 ರಿಂದ 10)?',
    ml: 'വേദനയുടെ തീവ്രത എത്രയാണ് (0 മുതൽ 10)?',
    mr: 'वेदनांची तीव्रता किती आहे (0 ते 10)?',
  },
  agni_koshtha: {
    en: 'Digestive fire & bowel routine (Agni & Koshtha)?',
    hi: 'आपकी पाचन शक्ति और पेट साफ होने की स्थिति कैसी है?',
    te: 'మీ జీర్ణశక్తి మరియు మలవిసర్జన ఎలా ఉంది? (అగ్ని & కోష్ఠ)',
    ta: 'உங்கள் செரிமான சக்தி மற்றும் மலம் கழித்தல் எப்படி உள்ளது?',
    kn: 'ನಿಮ್ಮ ಜೀರ್ಣಶಕ್ತಿ ಮತ್ತು ಮಲವಿಸರ್ಜನೆ ಹೇಗಿದೆ? (ಅಗ್ನಿ & ಕೋಷ್ಠ)',
    ml: 'ദഹനശേഷിയും മലവിസർജ്ജനവും എങ്ങനെയുണ്ട്?',
    mr: 'पचनशक्ती व पोट साफ होण्याची स्थिती कशी आहे?',
  },
  ahara_vihara: {
    en: 'Daily diet, routine & sleep patterns (Ahara-Vihara)?',
    hi: 'खान-पान, दिनचर्या और नींद कैसी है?',
    te: 'మీ ఆహారపు అలవాట్లు మరియు నిద్ర సమయాలు ఎలా ఉన్నాయి?',
    ta: 'உங்கள் உணவுப் பழக்கம் மற்றும் தூக்கம் எப்படி உள்ளது?',
    kn: 'ನಿಮ್ಮ ಆಹಾರ ಪದ್ಧತಿ ಮತ್ತು ನಿದ್ರೆ ಹೇಗಿದೆ?',
    ml: 'ഭക്ഷണരീതിയും ഉറക്കവും എങ്ങനെയുണ്ട്?',
    mr: 'आहार, दिनचर्या आणि झोप कशी आहे?',
  },
  timing: {
    en: 'When does the pain or discomfort get worse?',
    hi: 'दर्द या तकलीफ कब ज्यादा होती है?',
    te: 'ఈ నొప్పి లేదా అసౌకర్యం ఎప్పుడు ఎక్కువ అవుతుంది?',
    ta: 'வலி அல்லது அசௌகரியம் எப்போது அதிகரிக்கிறது?',
    kn: 'ನೋವು ಅಥವಾ ಅಸ್ವಸ್ಥತೆ ಯಾವಾಗ ಹೆಚ್ಚಾಗುತ್ತದೆ?',
    ml: 'വേദന അല്ലെങ്കിൽ അസ്വസ്ഥത എപ്പോൾ വർദ്ധിക്കുന്നു?',
    mr: 'वेदना किंवा त्रास केव्हा वाढतो?',
  },
};

const DEFAULT_ALLOPATHIC_KEYWORDS: GuidanceKeyword[] = [
  {
    id: 'problem',
    question: 'What is the problem?',
    questionRegional: 'మీ సమస్య ఏమిటి? (నొప్పి లేదా బాధ ఎక్కడ ఉంది?)',
    isCovered: false,
    extractedDetail: null,
  },
  {
    id: 'duration',
    question: 'From how long have you been experiencing the symptoms?',
    questionRegional: 'ఈ లక్షణాలు ఎంత కాలం నుండి ఉన్నాయి?',
    isCovered: false,
    extractedDetail: null,
  },
  {
    id: 'medications',
    question: 'Have you taken any previous medications?',
    questionRegional: 'గతంలో లేదా ఇటీవల ఏవైనా మందులు తీసుకున్నారా?',
    isCovered: false,
    extractedDetail: null,
  },
  {
    id: 'associations',
    question: 'Any allergies or other associated symptoms?',
    questionRegional: 'ఏవైనా అలెర్జీలు లేదా ఇతర సంబంధిత లక్షణాలు ఉన్నాయా?',
    isCovered: false,
    extractedDetail: null,
  },
  {
    id: 'severity',
    question: 'Severity of pain or discomfort (0 to 10)?',
    questionRegional: 'నొప్పి లేదా అసౌకర్య తీవ్రత ఎంత (0 నుండి 10)?',
    isCovered: false,
    extractedDetail: null,
  },
  {
    id: 'timing',
    question: 'When does the pain or discomfort get worse?',
    questionRegional: 'ఈ నొప్పి లేదా అసౌకర్యం ఎప్పుడు ఎక్కువ అవుతుంది?',
    isCovered: false,
    extractedDetail: null,
  },
];

const AYURVEDA_EXTRA_KEYWORDS: GuidanceKeyword[] = [
  {
    id: 'agni_koshtha',
    question: 'Digestive fire & bowel routine (Agni & Koshtha)?',
    questionRegional: 'మీ జీర్ణశక్తి మరియు మలవిసర్జన ఎలా ఉంది? (అగ్ని & కోష్ఠ)',
    isCovered: false,
    extractedDetail: null,
  },
  {
    id: 'ahara_vihara',
    question: 'Daily diet, routine & sleep patterns (Ahara-Vihara)?',
    questionRegional: 'మీ ఆహారపు అలవాట్లు మరియు నిద్ర సమయాలు ఎలా ఉన్నాయి? (ఆహార-విహార & నిద్ర)',
    isCovered: false,
    extractedDetail: null,
  },
];

type KeywordOption = { value: string; emoji: string; labels: Partial<Record<LanguageCode, string>> };

const KEYWORD_OPTIONS: Record<string, KeywordOption[]> = {
  problem: [
    { value: 'Head / Neck / Face', emoji: '🧠', labels: { en: 'Head / Neck', hi: 'सिर / गर्दन', te: 'తల / మెడ', ta: 'தலை / கழுத்து', kn: 'ತಲೆ / ಕತ್ತು', ml: 'തല / കഴുത്ത്', mr: 'डोके / मान' } },
    { value: 'Chest / Heart', emoji: '❤️', labels: { en: 'Chest / Heart', hi: 'छाती / हृदय', te: 'ఛాతీ / గుండె', ta: 'மார்பு / இதயம்', kn: 'ಎದೆ / ಹೃದಯ', ml: 'നെഞ്ച് / ഹൃദയം', mr: 'छाती / हृदय' } },
    { value: 'Abdomen / Stomach', emoji: '🫃', labels: { en: 'Abdomen / Stomach', hi: 'पेट / उदर', te: 'కడుపు / పొట్ట', ta: 'வயிறு', kn: 'ಹೊಟ್ಟೆ', ml: 'വയർ / ഉദരം', mr: 'पोट / उदर' } },
    { value: 'Back / Limbs / Joints', emoji: '🦴', labels: { en: 'Back / Limbs / Joints', hi: 'पीठ / हाथ-पैर', te: 'వీపు / కాళ్ళు చేతులు', ta: 'முதுகு / கைகால்', kn: 'ಬೆನ್ನು / ಕೈ-ಕಾಲು', ml: 'മുതുക് / കൈകാലുകൾ', mr: 'पाठ / हात-पाय' } },
  ],
  duration: [
    { value: 'Less than 1 week', emoji: '⚡', labels: { en: '< 1 Week (Acute)', hi: '1 हफ्ते से कम', te: '1 వారం కంటే తక్కువ', ta: '1 வாரத்திற்கும் குறைவாக', kn: '1 ವಾರಕ್ಕಿಂತ ಕಡಿಮೆ', ml: '1 ആഴ്ചയിൽ കുറവ്', mr: '1 आठवड्यापेक्षा कमी' } },
    { value: '1 to 4 weeks', emoji: '📅', labels: { en: '1 – 4 Weeks', hi: '1–4 हफ्ते', te: '1 – 4 వారాలు', ta: '1 – 4 வாரங்கள்', kn: '1 – 4 ವಾರ', ml: '1 – 4 ആഴ്ചകൾ', mr: '1 – 4 आठवडे' } },
    { value: '1 to 3 months', emoji: '🗓️', labels: { en: '1 – 3 Months', hi: '1–3 महीने', te: '1 – 3 నెలలు', ta: '1 – 3 மாதங்கள்', kn: '1 – 3 ತಿಂಗಳು', ml: '1 – 3 മാസം', mr: '1 – 3 महिने' } },
    { value: 'More than 3 months (chronic)', emoji: '🔄', labels: { en: '> 3 Months (Chronic)', hi: '3 महीने से ज्यादा', te: '3 నెలలకు పైగా', ta: '3 மாதங்களுக்கும் மேல்', kn: '3 ತಿಂಗಳಿಗಿಂತ ಹೆಚ್ಚು', ml: '3 മാസത്തിൽ കൂടുതൽ', mr: '3 महिन्यांपेक्षा जास्त' } },
  ],
  severity: [
    { value: 'Mild (1-3/10)', emoji: '😊', labels: { en: 'Mild (1–3)', hi: 'हल्का (1–3)', te: 'తేలికపాటి (1–3)', ta: 'மிதமான (1–3)', kn: 'ಮೃದು (1–3)', ml: 'മൃദു (1–3)', mr: 'सौम्य (1–3)' } },
    { value: 'Moderate (4-6/10)', emoji: '😐', labels: { en: 'Moderate (4–6)', hi: 'मध्यम (4–6)', te: 'మధ్యస్థ (4–6)', ta: 'நடுத்தர (4–6)', kn: 'ಮಧ್ಯಮ (4–6)', ml: 'മിതമായ (4–6)', mr: 'मध्यम (4–6)' } },
    { value: 'Severe (7-8/10)', emoji: '😣', labels: { en: 'Severe (7–8)', hi: 'गंभीर (7–8)', te: 'తీవ్రమైన (7–8)', ta: 'கடுமையான (7–8)', kn: 'ತೀವ್ರ (7–8)', ml: 'തീവ്രമായ (7–8)', mr: 'तीव्र (7–8)' } },
    { value: 'Very Severe / Unbearable (9-10/10)', emoji: '🆘', labels: { en: 'Unbearable (9–10)', hi: 'असहनीय (9–10)', te: 'అసహ్యమైన (9–10)', ta: 'தாங்காத (9–10)', kn: 'ಅಸಹ್ಯ (9–10)', ml: 'സഹിക്കാൻ കഴിയാത്ത (9–10)', mr: 'असह्य (9–10)' } },
  ],
  medications: [
    { value: 'No medications taken', emoji: '❌', labels: { en: 'No Medicines', hi: 'कोई दवा नहीं', te: 'మందులు లేవు', ta: 'மருந்தில்லை', kn: 'ಔಷಧಿ ಇಲ್ಲ', ml: 'മരുന്നില്ല', mr: 'औषध नाही' } },
    { value: 'Paracetamol or OTC painkiller', emoji: '💊', labels: { en: 'Paracetamol / Painkiller', hi: 'पैरासिटामोल / दर्दनिवारक', te: 'పారాసెటమోల్ / నొప్పి మాత్ర', ta: 'பாரசிட்டமால் / வலி நிவாரணி', kn: 'ಪ್ಯಾರಸಿಟಮಾಲ್ / ನೋವು ಮಾತ್ರೆ', ml: 'പാരസെറ്റമോൾ / വേദനാ ഉടക്ക്', mr: 'पॅरासिटामोल / वेदनाशामक' } },
    { value: 'Doctor-prescribed medicines', emoji: '📋', labels: { en: 'Prescribed Medicines', hi: 'डॉक्टर की दवाएं', te: 'వైద్యుడు సూచించిన మందులు', ta: 'மருத்துவர் மருந்துகள்', kn: 'ವೈದ್ಯರ ಔಷಧಿ', ml: 'ഡോക്ടർ മരുന്ന്', mr: 'डॉक्टरांची औषधे' } },
    { value: 'Herbal / Ayurvedic / Home remedies', emoji: '🌿', labels: { en: 'Herbal / Home Remedies', hi: 'आयुर्वेदिक / घरेलू उपाय', te: 'ఆయుర్వేద / ఇంటి వైద్యం', ta: 'மூலிகை / வீட்டு வைத்தியம்', kn: 'ಆಯುರ್ವೇದ / ಮನೆ ಔಷಧ', ml: 'ആയുർവേദ / ഗൃഹ ചికിത്സ', mr: 'आयुर्वेदिक / घरगुती उपाय' } },
  ],
  associations: [
    { value: 'No allergies or additional symptoms', emoji: '✅', labels: { en: 'No Allergies / Other Symptoms', hi: 'कोई एलर्जी नहीं', te: 'అలెర్జీలు లేవు', ta: 'ஒவ்வாமை இல்லை', kn: 'ಅಲರ್ಜಿ ಇಲ್ಲ', ml: 'അലർജി ഇല്ല', mr: 'कोणतीही अ‍ॅलर्जी नाही' } },
    { value: 'Drug or medicine allergy', emoji: '⚠️', labels: { en: 'Drug / Medicine Allergy', hi: 'दवा से एलर्जी', te: 'ఔషధ అలెర్జీ', ta: 'மருந்து ஒவ்வாமை', kn: 'ಔಷಧ ಅಲರ್ಜಿ', ml: 'ഔഷധ അലർജി', mr: 'औषध अ‍ॅलर्जी' } },
    { value: 'Fever / vomiting / breathlessness', emoji: '🤒', labels: { en: 'Fever / Vomiting / Breathlessness', hi: 'बुखार / उल्टी / सांस की तकलीफ', te: 'జ్వరం / వాంతి / ఆయాసం', ta: 'காய்ச்சல் / வாந்தி / மூச்சடைப்பு', kn: 'ಜ್ವರ / ವಾಂತಿ / ಉಸಿರಾಟ ತೊಂದರೆ', ml: 'പനി / ഛർദ്ദി / ശ്വാസ തടസ്സം', mr: 'ताप / उलटी / श्वास त्रास' } },
    { value: 'Fatigue / weakness / dizziness', emoji: '😴', labels: { en: 'Fatigue / Weakness / Dizziness', hi: 'थकान / कमजोरी / चक्कर', te: 'అలసట / బలహీనత / తల తిరగడం', ta: 'சோர்வு / பலவீனம்', kn: 'ದಣಿವು / ನಿರ್ಬಲತೆ', ml: 'ക്ഷീണം / ബലഹീനത', mr: 'थकवा / अशक्तपणा' } },
  ],
  timing: [
    { value: 'Morning (early hours)', emoji: '🌅', labels: { en: 'In the Morning', hi: 'सुबह', te: 'ఉదయం', ta: 'காலை', kn: 'ಬೆಳಿಗ್ಗೆ', ml: 'രാവിലെ', mr: 'सकाळी' } },
    { value: 'Evening or Night', emoji: '🌙', labels: { en: 'Evening / Night', hi: 'शाम / रात', te: 'సాయంత్రం / రాత్రి', ta: 'மாலை / இரவு', kn: 'ಸಂಜೆ / ರಾತ್ರಿ', ml: 'വൈകുന്നേരം / രാത്രി', mr: 'संध्याकाळी / रात्री' } },
    { value: 'During physical activity', emoji: '🏃', labels: { en: 'On Physical Activity', hi: 'शारीरिक गतिविधि में', te: 'శారీరక కదలికతో', ta: 'உடல் இயக்கத்தில்', kn: 'ದೈಹಿಕ ಚಟುವಟಿಕೆ ಸಮಯದಲ್ಲಿ', ml: 'ശാരീരിക പ്രവർത്തനത്തിൽ', mr: 'शारीरिक हालचालींमध्ये' } },
    { value: 'After eating food', emoji: '🍽️', labels: { en: 'After Meals', hi: 'खाने के बाद', te: 'భోజనం తర్వాత', ta: 'சாப்பிட்ட பிறகு', kn: 'ತಿಂದ ನಂತರ', ml: 'ഭക്ഷണ ശേഷം', mr: 'जेवणानंतर' } },
  ],
  agni_koshtha: [
    { value: 'Good digestion and regular bowels', emoji: '✅', labels: { en: 'Good Digestion', hi: 'अच्छी पाचन', te: 'మంచి జీర్ణక్రియ', ta: 'நல்ல செரிமானம்', kn: 'ಉತ್ತಮ ಜೀರ್ಣಕ್ರಿಯೆ', ml: 'നല്ല ദഹനം', mr: 'चांगली पचनशक्ती' } },
    { value: 'Slow digestion / gas / bloating', emoji: '💨', labels: { en: 'Slow / Gas / Bloating', hi: 'मंद पाचन / गैस', te: 'నెమ్మది జీర్ణక్రియ / గ్యాస్', ta: 'மெதுவான செரிமானம் / வாயு', kn: 'ನಿಧಾನ ಜೀರ್ಣಕ್ರಿಯೆ', ml: 'മന്ദ ദഹനം / ഗ്യാസ്', mr: 'मंद पचन / गॅस' } },
    { value: 'Frequent acidity / heartburn', emoji: '🔥', labels: { en: 'Acidity / Heartburn', hi: 'एसिडिटी / जलन', te: 'అమ్లత / ఛాతీ మంట', ta: 'அமிலத்தன்மை / நெஞ்சு எரிச்சல்', kn: 'ಆ್ಯಸಿಡಿಟಿ', ml: 'അസിഡിറ്റി', mr: 'अ‍ॅसिडिटी' } },
    { value: 'Constipation or loose stools', emoji: '⚠️', labels: { en: 'Constipation / Loose Stools', hi: 'कब्ज / दस्त', te: 'మలబద్ధకం / విరేచనాలు', ta: 'மலச்சிக்கல் / தளர்வான மலம்', kn: 'ಮಲಬದ್ಧತೆ / ಅತಿಸಾರ', ml: 'മലബന്ധം / ദ്രവ മലം', mr: 'बद्धकोष्ठता / सैल जुलाब' } },
  ],
  ahara_vihara: [
    { value: 'Regular meals and good sleep', emoji: '😴', labels: { en: 'Regular Meals & Good Sleep', hi: 'नियमित भोजन, अच्छी नींद', te: 'క్రమంగా భోజనం, మంచి నిద్ర', ta: 'வழக்கமான உணவு, நல்ல தூக்கம்', kn: 'ನಿಯಮಿತ ಊಟ, ಚೆನ್ನಾಗಿ ನಿದ್ರೆ', ml: 'ക്രമമായ ഭക്ഷണം, ഉറക്കം', mr: 'नियमित जेवण, चांगली झोप' } },
    { value: 'Irregular meal timings', emoji: '🕐', labels: { en: 'Irregular Meals', hi: 'अनियमित भोजन', te: 'అనియంత్రిత భోజన సమయాలు', ta: 'ஒழுங்கற்ற உணவு நேரங்கள்', kn: 'ಅನಿಯಮಿತ ಊಟ', ml: 'ക്രമമില്ലാത്ത ഭക്ഷണം', mr: 'अनियमित जेवण' } },
    { value: 'Poor sleep or insomnia', emoji: '🌙', labels: { en: 'Poor Sleep / Insomnia', hi: 'खराब नींद / अनिद्रा', te: 'నిద్ర సమస్యలు', ta: 'தூக்கமின்மை', kn: 'ಕಳಪೆ ನಿದ್ರೆ', ml: 'ഉറക്ക പ്രശ്നം', mr: 'खराब झोप' } },
    { value: 'High stress and unhealthy diet', emoji: '😰', labels: { en: 'Stress & Unhealthy Diet', hi: 'अधिक तनाव, गलत खानपान', te: 'అధిక ఒత్తిడి, అనారోగ్యకరమైన ఆహారం', ta: 'அதிக மன அழுத்தம், சரியற்ற உணவு', kn: 'ಅಧಿಕ ಒತ್ತಡ, ಅನಾರೋಗ್ಯಕರ ಆಹಾರ', ml: 'ഉയർന്ന സ്ട്രെസ്സ്, ആരോഗ്യ കേടായ ഭക്ഷണം', mr: 'जास्त तणाव, चुकीचा आहार' } },
  ],
};

function getNextUncoveredKeywordId(kwds: GuidanceKeyword[], afterId?: string): string | null {
  const uncovered = kwds.filter(k => !k.isCovered);
  if (uncovered.length === 0) return null;
  if (!afterId) return uncovered[0].id;
  const afterIndex = kwds.findIndex(k => k.id === afterId);
  const nextAfter = kwds.slice(afterIndex + 1).find(k => !k.isCovered);
  return nextAfter?.id ?? uncovered[0].id;
}

export const SocratesConversationEngine: React.FC<SocratesConversationEngineProps> = ({
  complaintId,
  historyObject,
  onUpdateHistory,
  onComplete,
  onBack,
  selectedLanguage,
  isAudioNarration,
}) => {
  const isAyush = historyObject.opdType === 'ayurveda';

  const initialKeywords = isAyush
    ? [...DEFAULT_ALLOPATHIC_KEYWORDS, ...AYURVEDA_EXTRA_KEYWORDS]
    : DEFAULT_ALLOPATHIC_KEYWORDS;

  const [keywords, setKeywords] = useState<GuidanceKeyword[]>(initialKeywords);
  const [transcript, setTranscript] = useState(
    Array.isArray(historyObject.transcriptLogs)
      ? historyObject.transcriptLogs
          .map((t: any) => (typeof t === 'string' ? t : t?.text || ''))
          .filter(Boolean)
          .join(' ')
      : ''
  );
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [redFlags, setRedFlags] = useState<string[]>(historyObject.redFlags || []);
  const [nextFollowup, setNextFollowup] = useState<{
    keywordId: string;
    prompt: string;
    promptRegional: string;
  } | null>(null);
  const [followupAnswer, setFollowupAnswer] = useState('');
  const [allCovered, setAllCovered] = useState(false);
  const [activeQuickKeywordId, setActiveQuickKeywordId] = useState<string | null>(
    () => initialKeywords.find(k => !k.isCovered)?.id ?? null
  );
  const recognitionRef = useRef<any>(null);


  const coveredCount = keywords.filter((k) => k.isCovered).length;
  const totalCount = keywords.length;

  // Initial welcome audio guidance
  useEffect(() => {
    if (isAudioNarration) {
      const welcomePrompt =
        selectedLanguage === 'te'
          ? 'దయచేసి మీ సమస్యను వివరిస్తూ మాట్లాడండి లేదా టైప్ చేయండి. కింద చూపిన ముఖ్య ప్రశ్నలు వైద్యునికి సహాయపడతాయి.'
          : selectedLanguage === 'ta'
          ? 'தயவுசெய்து உங்கள் பிரச்சனையை விளக்கி பேசவும் அல்லது தட்டச்சு செய்யவும்.'
          : selectedLanguage === 'kn'
          ? 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ವಿವರಿಸಿ.'
          : selectedLanguage === 'ml'
          ? 'ദയവായി നിങ്ങളുടെ പ്രശ്നം സംസാരിക്കുകയോ ടൈപ്പ് ചെയ്യുകയോ ചെയ്യുക.'
          : selectedLanguage === 'mr'
          ? 'कृपया आपला त्रास बोलून किंवा टाईप करून सांगा. खाली दिलेले मुद्दे डॉक्टरांना मदत करतील.'
          : isAyush
          ? 'Please explain your symptoms, daily diet, digestion, and routine freely by voice or text. Our Ayurveda intake will analyze your consultation notes.'
          : 'Please speak or type and explain your symptoms freely. Covering the guidance keywords below helps your doctor give an accurate diagnosis.';

      speechService.speak(welcomePrompt, selectedLanguage);
    }
  }, [isAudioNarration, selectedLanguage, isAyush]);

  // Analyze transcript with backend NLP endpoint
  const analyzeTranscript = useCallback(
    async (textToAnalyze: string) => {
      if (!textToAnalyze.trim() || textToAnalyze.trim().length < 5) return;
      setIsAnalyzing(true);
      try {
        const res = await fetch('/api/converse/analyze-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: textToAnalyze,
            opdType: historyObject.opdType || 'allopathic',
            complaintId,
            selectedLanguage,
            priorKeywords: keywords,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.keywords)) {
            setKeywords(data.keywords);
          }
          setAllCovered(Boolean(data.allCovered));
          setNextFollowup(data.nextFollowupQuestion || null);

          if (Array.isArray(data.redFlags) && data.redFlags.length > 0) {
            const merged = Array.from(new Set([...redFlags, ...data.redFlags]));
            setRedFlags(merged);
            onUpdateHistory({
              ...historyObject,
              redFlags: merged,
              transcriptLogs: [textToAnalyze],
              socrates: {
                ...historyObject.socrates,
                ...(data.extractedSocrates || {}),
              },
            });
          } else {
            onUpdateHistory({
              ...historyObject,
              transcriptLogs: [textToAnalyze],
              socrates: {
                ...historyObject.socrates,
                ...(data.extractedSocrates || {}),
              },
            });
          }

          // If a follow-up is prompted, speak it if audio narration is on
          if (data.nextFollowupQuestion && isAudioNarration) {
            const promptVoice =
              data.nextFollowupQuestion.promptRegional ||
              data.nextFollowupQuestion.prompt;
            speechService.speak(promptVoice, selectedLanguage);
          }
        }
      } catch (err) {
        console.warn('Transcript analyze error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [complaintId, historyObject, isAudioNarration, keywords, onUpdateHistory, redFlags, selectedLanguage]
  );

  // Toggle voice recognition
  const toggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      const rec = speechService.createRecognition(
        selectedLanguage,
        (spoken) => {
          if (spoken && spoken.trim()) {
            const combined = transcript
              ? `${transcript} ${spoken}`
              : spoken;
            setTranscript(combined);
            setInputText(combined);
            analyzeTranscript(combined);
          }
        },
        (err) => {
          console.warn('STT Error:', err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
      recognitionRef.current = rec;
      rec?.start();
    }
  };

  const handleSendInput = () => {
    if (!inputText.trim()) return;
    const combined = transcript
      ? `${transcript} ${inputText}`
      : inputText;
    setTranscript(combined);
    setInputText('');
    analyzeTranscript(combined);
  };

  const handleSendFollowup = () => {
    if (!followupAnswer.trim() || !nextFollowup) return;
    const updatedTranscript = `${transcript}. [${nextFollowup.prompt}]: ${followupAnswer}`;
    setTranscript(updatedTranscript);
    setFollowupAnswer('');
    analyzeTranscript(updatedTranscript);
  };

  const handleSelectKeywordToAnswer = (kw: GuidanceKeyword) => {
    setNextFollowup({
      keywordId: kw.id,
      prompt: kw.question,
      promptRegional: kw.questionRegional,
    });
    if (isAudioNarration) {
      speechService.speak(kw.questionRegional || kw.question, selectedLanguage);
    }
  };

  const handleQuickOptionSelect = (keywordId: string, optionValue: string, displayLabel: string) => {
    const updatedKeywords = keywords.map(k =>
      k.id === keywordId ? { ...k, isCovered: true, extractedDetail: displayLabel } : k
    );
    setKeywords(updatedKeywords);

    const entry = `[${KEYWORD_TRANSLATIONS[keywordId]?.en || keywordId}]: ${optionValue}`;
    const updatedTranscript = transcript ? `${transcript}. ${entry}` : entry;
    setTranscript(updatedTranscript);

    onUpdateHistory({
      ...historyObject,
      transcriptLogs: [updatedTranscript],
      socrates: { ...historyObject.socrates, [keywordId]: optionValue },
    });

    const allNowCovered = updatedKeywords.every(k => k.isCovered);
    if (allNowCovered) {
      setAllCovered(true);
      setActiveQuickKeywordId(null);
    } else {
      const nextId = getNextUncoveredKeywordId(updatedKeywords, keywordId);
      setActiveQuickKeywordId(nextId);
      if (isAudioNarration && nextId) {
        const nextKw = updatedKeywords.find(k => k.id === nextId);
        if (nextKw) {
          speechService.speak(
            KEYWORD_TRANSLATIONS[nextKw.id]?.[selectedLanguage] || nextKw.question,
            selectedLanguage
          );
        }
      }
    }
  };


  const getKeywordIcon = (id: string) => {
    switch (id) {
      case 'problem':
        return <Activity className="w-4 h-4 text-indigo-600" />;
      case 'duration':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'medications':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'associations':
        return <HeartPulse className="w-4 h-4 text-rose-600" />;
      case 'severity':
        return <Brain className="w-4 h-4 text-purple-600" />;
      case 'agni_koshtha':
      case 'ahara_vihara':
        return <Leaf className="w-4 h-4 text-emerald-700" />;
      default:
        return <Activity className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4">
      {/* Header Banner */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          {isAyush ? (
            <Leaf className="w-4 h-4 text-emerald-600" />
          ) : (
            <Stethoscope className="w-4 h-4 text-indigo-600" />
          )}
          <span>
            {isAyush
              ? 'AYUSH Rogi Pariksha / आयुर्वेदिक परामर्श'
              : 'Step 3: Clinical Intake & Free Narration'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          {selectedLanguage === 'te'
            ? 'మీ సమస్యను వివరంగా వివరించండి'
            : selectedLanguage === 'ta'
            ? 'உங்கள் பிரச்சனையை விரிவாக விளக்குங்கள்'
            : selectedLanguage === 'kn'
            ? 'ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ವಿವರವಾಗಿ ವಿವರಿಸಿ'
            : selectedLanguage === 'ml'
            ? 'നിങ്ങളുടെ പ്രശ്നം വിശദമായി പറയുക'
            : selectedLanguage === 'mr'
            ? 'आपली समस्या सविस्तर सांगा'
            : 'Explain Your Problem in Your Own Words'}
        </h2>

        <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl mx-auto">
          {isAyush
            ? 'Speak or type freely in your regional language. Cover the key questions below regarding your symptoms, digestion, and daily routine.'
            : 'Speak or type freely in your own language. We automatically recognize your problem, duration, past medicines, and ask only for missing details.'}
        </p>
      </div>

      {/* Red Flag Alert Banner */}
      {redFlags.length > 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 flex items-start gap-3 shadow-sm animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">
              🚨 Clinical Red-Flag Triggered
            </h4>
            <div className="mt-1 space-y-0.5">
              {redFlags.map((flag, idx) => (
                <p key={idx} className="text-xs font-semibold">
                  • {flag}
                </p>
              ))}
            </div>
            <p className="text-[11px] text-rose-700 mt-1 font-medium">
              OPD queue priority has been updated for high-urgency physician review.
            </p>
          </div>
        </div>
      )}

      {/* 5 Guidance Keywords Bar */}
      <div className="stitch-card p-4 sm:p-5 mb-5 shadow-xs border border-indigo-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Guidance Keywords / आवश्यक बिंदु
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              Covered: {coveredCount} of {totalCount}
            </span>
            <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-300"
                style={{ width: `${(coveredCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Keyword Pills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {keywords.map((kw) => {
            return (
              <div
                key={kw.id}
                onClick={() => !kw.isCovered && handleSelectKeywordToAnswer(kw)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  kw.isCovered
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                    : 'bg-white hover:bg-violet-50/60 border-slate-200 hover:border-indigo-300 text-slate-700'
                }`}
              >
                <div className="mt-0.5 shrink-0">{getKeywordIcon(kw.id)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold truncate">
                      {KEYWORD_TRANSLATIONS[kw.id]?.[selectedLanguage] || kw.question}
                    </p>
                    {kw.isCovered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                        {translate('required', selectedLanguage)}
                      </span>
                    )}
                  </div>
                  {selectedLanguage !== 'en' && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {kw.question}
                    </p>
                  )}
                  {kw.isCovered && kw.extractedDetail && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 line-clamp-1">
                      ✓ {kw.extractedDetail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-500 mt-2.5 text-center">
          💡 If you explain all keywords, we will skip questions directly to the next stage.
          If any keyword is skipped, we only ask that missing question.
        </p>
      </div>

      {/* Main Free-Text / Speech Input Console */}
      <div className="stitch-card p-5 mb-5 shadow-sm border-2 border-indigo-100/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span>{translate('voiceExplanation', selectedLanguage)}</span>
              {selectedLanguage !== 'en' && (
                <span className="block text-[10px] text-slate-400 font-normal">
                  {translate('voiceExplanation', 'en')}
                </span>
              )}
            </div>
          </span>

          <button
            type="button"
            onClick={toggleVoice}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-sm ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>
              {isListening ? translate('listening', selectedLanguage) : translate('speakButton', selectedLanguage)}
            </span>
          </button>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendInput();
              }
            }}
            placeholder={
              isAyush
                ? 'e.g. "I have lower back pain for 2 weeks. Digestion is slow with gas. No medicines taken. Pain is 6/10..."'
                : 'e.g. "I have severe chest pain and left shoulder pain since yesterday. I took paracetamol. Pain score is 8/10 with sweating..."'
            }
            className="w-full p-4 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 text-sm leading-relaxed resize-none shadow-inner"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              type="button"
              disabled={isAnalyzing || !inputText.trim()}
              onClick={handleSendInput}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{translate('analyzeButton', selectedLanguage)}</span>
            </button>
          </div>
        </div>

        {/* Live Transcript Display */}
        {transcript && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-mono font-bold text-slate-500 uppercase mb-1">
              Live Accumulated Transcript:
            </p>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              "{transcript}"
            </p>
          </div>
        )}
      </div>

      {/* Quick-Answer Panel — 4 option buttons per keyword, auto-advances on selection */}
      {activeQuickKeywordId && !allCovered && (() => {
        const activeKw = keywords.find(k => k.id === activeQuickKeywordId && !k.isCovered);
        if (!activeKw) return null;
        const options = KEYWORD_OPTIONS[activeQuickKeywordId] || [];
        const uncoveredKeywords = keywords.filter(k => !k.isCovered);
        const questionPosition = uncoveredKeywords.findIndex(k => k.id === activeQuickKeywordId) + 1;
        const questionText = KEYWORD_TRANSLATIONS[activeQuickKeywordId]?.[selectedLanguage] || activeKw.question;
        const questionEn = KEYWORD_TRANSLATIONS[activeQuickKeywordId]?.en || activeKw.question;

        return (
          <div className="stitch-card p-5 mb-5 shadow-sm border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 to-indigo-50/30">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-sm">
                  {questionPosition}
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider">
                    Quick Answer • {questionPosition} of {uncoveredKeywords.length}
                  </p>
                  <div className="w-28 h-1.5 rounded-full bg-indigo-100 overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                      style={{ width: `${((questionPosition - 1) / uncoveredKeywords.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextId = getNextUncoveredKeywordId(keywords, activeQuickKeywordId);
                  setActiveQuickKeywordId(nextId);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
              >
                Skip →
              </button>
            </div>

            {/* Question */}
            <div className="mb-4">
              <p className="text-sm font-black text-slate-900 leading-snug">{questionText}</p>
              {selectedLanguage !== 'en' && (
                <p className="text-[11px] text-slate-400 mt-0.5">{questionEn}</p>
              )}
            </div>

            {/* 4 Options 2×2 grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {options.map((opt) => {
                const label = opt.labels[selectedLanguage] || opt.labels.en || opt.value;
                const labelEn = opt.labels.en || opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleQuickOptionSelect(activeQuickKeywordId, opt.value, label)}
                    className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition active:scale-95 text-left flex items-center gap-2.5 group shadow-xs"
                  >
                    <span className="text-xl shrink-0 leading-none">{opt.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-indigo-700 truncate">
                        {label}
                      </p>
                      {selectedLanguage !== 'en' && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{labelEn}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 mt-3 text-center">
              💡 Tap an option above — or speak / type your answer freely in the input above
            </p>
          </div>
        );
      })()}

      {/* Missing Details Clarification Prompt (Only shown if a keyword is missing) */}
      {nextFollowup && !allCovered && (
        <div className="stitch-card p-5 mb-5 border-2 border-amber-300 bg-amber-50/40 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded">
                Missing Clinical Detail
              </span>
              <h4 className="text-sm font-black text-slate-900 mt-1">
                {nextFollowup.prompt}
              </h4>
              <p className="text-xs font-semibold text-indigo-800 mt-0.5">
                {nextFollowup.promptRegional}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={followupAnswer}
              onChange={(e) => setFollowupAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendFollowup();
              }}
              placeholder="Speak or type your answer for this specific detail..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-amber-200 text-sm focus:border-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSendFollowup}
              disabled={!followupAnswer.trim() || isAnalyzing}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Submit Detail</span>
            </button>
          </div>
        </div>
      )}

      {/* All Covered Celebration Banner */}
      {allCovered && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 mb-5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-black text-emerald-950">
                All {totalCount} Essential Questions Covered! (सभी मुख्य बिंदु पूर्ण)
              </p>
              <p className="text-xs text-emerald-800">
                Your clinical explanation is complete. Ready to proceed immediately to family history.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition whitespace-nowrap active:scale-95"
          >
            <span>Auto-Advance →</span>
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={onBack}
          className="py-2.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <div className="text-left">
            <span>{translate('back', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] text-slate-400 font-medium">Back to Complaint</span>
            )}
          </div>
        </button>

        <button
          id="converse-continue-btn"
          disabled={coveredCount === 0 && !transcript.trim()}
          onClick={onComplete}
          className={`py-3 px-8 rounded-2xl font-black text-base flex items-center gap-3 shadow-lg transition active:scale-98 ${
            coveredCount === 0 && !transcript.trim()
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-600/25'
          }`}
          title={coveredCount === 0 && !transcript.trim() ? 'Please speak or describe your symptom before proceeding' : ''}
        >
          <div className="text-left">
            <span>{translate('continue', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[11px] font-normal opacity-85">Proceed to Next Step</span>
            )}
          </div>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
