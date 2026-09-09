import React from 'react';
import { LanguageCode } from '../types';

export type TranslationKey =
  | 'stepIdentify'
  | 'stepConverse'
  | 'stepHistory'
  | 'stepScanDocs'
  | 'stepPrivacy'
  | 'stepSummary'
  | 'stepAyush'
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
  | 'recordVitalsSub'
  | 'selectComplaint'
  | 'selectComplaintSub'
  | 'familyHistory'
  | 'familyHistorySub'
  | 'noFamilyHistory'
  | 'personalHabits'
  | 'scanDocuments'
  | 'dataProtected'
  | 'backToIdentity'
  | 'confirmVitals'
  | 'startInterview'
  | 'voiceListening'
  | 'voiceError'
  | 'dpdpConsentTitle'
  | 'dpdpConsentSub'
  | 'dpdpAudioNotice'
  | 'consentDemographics'
  | 'consentDemographicsSub'
  | 'consentMedical'
  | 'consentMedicalSub'
  | 'consentOcr'
  | 'consentOcrSub'
  | 'consentAbdm'
  | 'consentAbdmSub'
  | 'agreeAndProceed'
  | 'changeLanguage'
  | 'selectAllTerms'
  | 'verifyPatient'
  | 'verifyPatientSub'
  | 'tabAbha'
  | 'tabAbhaSub'
  | 'tabAadhaar'
  | 'tabAadhaarSub'
  | 'tabMobile'
  | 'tabMobileSub'
  | 'allopathicOpd'
  | 'allopathicOpdSub'
  | 'ayushOpd'
  | 'ayushOpdSub'
  | 'voiceExplanation'
  | 'speakButton'
  | 'listening'
  | 'analyzeButton'
  | 'docScanTitle'
  | 'docScanSub'
  | 'scanDocsTab'
  | 'previousDocsTab'
  | 'cameraScan'
  | 'uploadDoc'
  | 'sessionPurgeTitle'
  | 'tokenIssued'
  | 'printSlip'
  | 'finishSession'
  | 'confirmDocuments';

export const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    stepIdentify: '1. Identify',
    stepConverse: '2. Converse',
    stepHistory: '3. History',
    stepScanDocs: '4. Scan Docs',
    stepPrivacy: '5. Privacy',
    stepSummary: '6. Summary',
    stepAyush: '3. AYUSH Pariksha',
    back: 'Back',
    continue: 'Continue',
    next: 'Next',
    retry: 'Retry',
    loading: 'Loading...',
    listen: 'Listen',
    pauseVoice: 'Pause Voice',
    required: 'Required',
    optional: 'Optional',
    language: 'Language',
    identity: 'Patient Identification',
    vitals: 'Record Your Vitals',
    complaint: 'Primary Complaint',
    history: 'Family & Social History',
    documents: 'Scan Documents',
    privacy: 'Your Data is Protected',
    summary: 'Summary',
    selectLanguage: 'Choose your language',
    recordVitals: 'Record Your Vitals',
    recordVitalsSub: 'Adjust the sliders to match device readings, or tap Skip for any parameter not available',
    selectComplaint: 'Select OPD Category & Primary Complaint',
    selectComplaintSub: 'Select the hospital OPD department and your primary physical health concern',
    familyHistory: 'Family Medical History',
    familyHistorySub: 'Select all conditions present in immediate family members (parents, siblings)',
    noFamilyHistory: 'No significant family history',
    personalHabits: 'Personal Habits & Lifestyle',
    scanDocuments: 'AI Prescription & Diagnostic Report Scanner',
    dataProtected: 'Your Data is Protected',
    backToIdentity: 'Back to Identity',
    confirmVitals: 'Confirm Vitals & Select Complaint',
    startInterview: 'Start Clinical Interview',
    voiceListening: 'Listening. Please speak clearly.',
    voiceError: 'Voice recognition failed. Please try again.',
    dpdpConsentTitle: 'Data Privacy & Medical Consent',
    dpdpConsentSub: 'Consent in compliance with Digital Personal Data Protection (DPDP) Act 2023 & ABDM',
    dpdpAudioNotice: 'DPDP Act 2023 Compliant: Data deleted from kiosk upon token issue',
    consentDemographics: 'Demographic & Identity Verification (ABHA / Aadhaar)',
    consentDemographicsSub: 'Allows verifying your name, age, gender, and contact for hospital OPD registration.',
    consentMedical: 'Symptom History & Clinical SOCRATES Assessment',
    consentMedicalSub: 'Allows capturing your current chief complaints, pain scores, and medical background for doctor review.',
    consentOcr: 'Prescription & Lab Report AI OCR Digitization',
    consentOcrSub: 'Allows scanning past paper prescriptions and extracting test values & medications automatically.',
    consentAbdm: 'Link with Ayushman Bharat Health Account (ABDM / FHIR R4)',
    consentAbdmSub: 'Permits pushing verified consultation summary into your personal ABHA digital health locker.',
    agreeAndProceed: 'I Agree & Proceed',
    changeLanguage: 'Change Language',
    selectAllTerms: 'Select All Terms',
    verifyPatient: 'Verify & Register Patient',
    verifyPatientSub: 'Choose how this patient will identify themselves. Profile linked to ABDM health stack.',
    tabAbha: 'ABHA & QR Scan',
    tabAbhaSub: 'ID number or scan card',
    tabAadhaar: 'Aadhaar OTP',
    tabAadhaarSub: 'ABDM enrolment',
    tabMobile: 'Mobile OTP',
    tabMobileSub: 'PHR quick login',
    allopathicOpd: 'Allopathic General & Specialty OPD',
    allopathicOpdSub: 'Modern medicine & clinical evaluation',
    ayushOpd: 'AYUSH & Ayurvedic OPD',
    ayushOpdSub: 'Holistic Ayurveda, Siddha & Unani care',
    voiceExplanation: 'Voice & Text Explanation',
    speakButton: 'Speak Symptoms',
    listening: 'Listening...',
    analyzeButton: 'Analyze Symptoms',
    docScanTitle: 'AI Prescription & Diagnostic Report Scanner',
    docScanSub: 'Handwritten prescriptions & lab reports are recognized and transcribed into structured clinical data',
    scanDocsTab: 'Scan Documents',
    previousDocsTab: 'Previous Sessions',
    cameraScan: 'Scan with Camera',
    uploadDoc: 'Upload Document / Image',
    sessionPurgeTitle: 'Your Data is Protected & Cleared',
    tokenIssued: 'OPD Token Generated Successfully',
    printSlip: 'Print OPD Slip',
    finishSession: 'Finish & New Patient',
    confirmDocuments: 'Confirm Documents & Proceed',
  },

  te: {
    stepIdentify: '1. గుర్తింపు',
    stepConverse: '2. సంభాషణ',
    stepHistory: '3. చరిత్ర',
    stepScanDocs: '4. పత్రాలు',
    stepPrivacy: '5. గోప్యత',
    stepSummary: '6. సారాంశం',
    stepAyush: '3. ఆయుష్ పరీక్ష',
    back: 'వెనుకకు',
    continue: 'కొనసాగించు',
    next: 'తర్వాత',
    retry: 'మళ్లీ ప్రయత్నించండి',
    loading: 'లోడ్ అవుతోంది...',
    listen: 'వినండి',
    pauseVoice: 'వాయిస్ ఆపండి',
    required: 'అవసరం',
    optional: 'ఐచ్ఛికం',
    language: 'భాష',
    identity: 'రోగి గుర్తింపు',
    vitals: 'ఆరోగ్య కొలతలు నమోదు చేయండి',
    complaint: 'ప్రధాన సమస్య',
    history: 'కుటుంబ మరియు వ్యక్తిగత చరిత్ర',
    documents: 'పత్రాలను స్కాన్ చేయండి',
    privacy: 'మీ డేటా రక్షించబడింది',
    summary: 'సారాంశం',
    selectLanguage: 'మీ ప్రాధాన్యత భాషను ఎంచుకోండి',
    recordVitals: 'మీ ఆరోగ్య కొలతలను నమోదు చేయండి',
    recordVitalsSub: 'పరికరం కొలతలకు సరిపోయేలా స్లైడర్‌లను సర్దుబాటు చేయండి లేదా అందుబాటులో లేని వాటిని స్కిప్ చేయండి',
    selectComplaint: 'OPD విభాగం మరియు ప్రధాన సమస్యను ఎంచుకోండి',
    selectComplaintSub: 'ఆసుపత్రి OPD విభాగం మరియు మీ ప్రధాన శారీరక సమస్యను ఎంచుకోండి',
    familyHistory: 'కుటుంబ సభ్యుల వైద్య చరిత్ర',
    familyHistorySub: 'తల్లిదండ్రులు, తోబుట్టువులలో ఉన్న వ్యాధులను ఎంచుకోండి',
    noFamilyHistory: 'కుటుంబంలో ముఖ్యమైన వ్యాధి చరిత్ర లేదు',
    personalHabits: 'వ్యక్తిగత అలవాట్లు & జీవనశైలి',
    scanDocuments: 'AI ప్రిస్క్రిప్షన్ & ల్యాబ్ రిపోర్ట్ స్కానర్',
    dataProtected: 'మీ డేటా సురక్షితంగా ఉంది',
    backToIdentity: 'గుర్తింపుకు తిరిగి వెళ్లండి',
    confirmVitals: 'కొలతలను నిర్ధారించి సమస్యను ఎంచుకోండి',
    startInterview: 'క్లినికల్ ఇంటర్వ్యూ ప్రారంభించండి',
    voiceListening: 'వింటున్నాము. దయచేసి స్పష్టంగా మాట్లాడండి.',
    voiceError: 'వాయిస్ గుర్తింపు విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    dpdpConsentTitle: 'డేటా గోప్యత మరియు వైద్య సమ్మతి',
    dpdpConsentSub: 'డిజిటల్ పర్సనల్ డేటా ప్రొటెక్షన్ (DPDP) చట్టం 2023 మరియు ABDM మార్గదర్శకాల ప్రకారం సమ్మతి',
    dpdpAudioNotice: 'DPDP చట్టం 2023 వర్తింపు: టోకెన్ జారీ తర్వాత కియోస్క్ నుండి డేటా తొలగించబడుతుంది',
    consentDemographics: 'జనాభా & గుర్తింపు ధృవీకరణ (ABHA / ఆధార్)',
    consentDemographicsSub: 'ఆసుపత్రి OPD నమోదు కోసం మీ పేరు, వయస్సు, లింగం మరియు సంప్రదింపు వివరాలను ధృవీకరించడానికి అనుమతిస్తుంది.',
    consentMedical: 'లక్షణాల చరిత్ర & క్లినికల్ SOCRATES మూల్యాంకనం',
    consentMedicalSub: 'వైద్యుల సమీక్ష కోసం మీ ప్రస్తుత సమస్యలు, నొప్పి తీవ్రత మరియు వైద్య చరిత్ర నమోదు చేయడానికి అనుమతిస్తుంది.',
    consentOcr: 'ప్రిస్క్రిప్షన్ & ల్యాబ్ రిపోర్ట్ AI OCR డిజిటలైజేషన్',
    consentOcrSub: 'గత ప్రిస్క్రిప్షన్లను స్కాన్ చేసి పరీక్ష విలువలు & మందులను స్వయంచాలకంగా సేకరించడానికి అనుమతిస్తుంది.',
    consentAbdm: 'ఆయుష్మాన్ భారత్ హెల్త్ అకౌంట్ (ABDM)తో లింక్ చేయండి',
    consentAbdmSub: 'ధృవీకరించబడిన సంప్రదింపు సారాంశాన్ని మీ వ్యక్తిగత ABHA డిజిటల్ హెల్త్ లాకర్‌కు పంపడానికి అనుమతిస్తుంది.',
    agreeAndProceed: 'నేను అంగీకరిస్తున్నాను & కొనసాగించు',
    changeLanguage: 'భాషను మార్చండి',
    selectAllTerms: 'అన్ని నిబంధనలను ఎంచుకోండి',
    verifyPatient: 'రోగిని ధృవీకరించండి మరియు నమోదు చేయండి',
    verifyPatientSub: 'రోగి గుర్తింపు విధానాన్ని ఎంచుకోండి. వివరాలు ABDM హెల్త్ స్టాక్‌కు సురక్షితంగా లింక్ చేయబడతాయి.',
    tabAbha: 'ABHA & QR స్కాన్',
    tabAbhaSub: 'ID నంబర్ లేదా కార్డ్ స్కాన్',
    tabAadhaar: 'ఆధార్ OTP',
    tabAadhaarSub: 'ABDM నమోదు',
    tabMobile: 'మొబైల్ OTP',
    tabMobileSub: 'PHR త్వరిత లాగిన్',
    allopathicOpd: 'ఎలోపతిక్ జనరల్ & స్పెషాలిటీ OPD',
    allopathicOpdSub: 'ఆధునిక వైద్యం మరియు క్లినికల్ మూల్యాంకనం',
    ayushOpd: 'ఆయుష్ & ఆయుర్వేద OPD',
    ayushOpdSub: 'సమగ్ర ఆయుర్వేద, సిద్ధ మరియు యునాని సంరక్షణ',
    voiceExplanation: 'వాయిస్ & టెక్స్ట్ వివరణ',
    speakButton: 'లక్షణాలను మాట్లాడండి',
    listening: 'వింటున్నాము...',
    analyzeButton: 'లక్షణాలను విశ్లేషించండి',
    docScanTitle: 'AI ప్రిస్క్రిప్షన్ మరియు ల్యాబ్ రిపోర్ట్ స్కానర్',
    docScanSub: 'చేతివ్రాత ప్రిస్క్రిప్షన్లు & ల్యాబ్ రిపోర్టులను నిర్మాణాత్మక డిజిటల్ డేటాగా మార్చండి',
    scanDocsTab: 'పత్రాలను స్కాన్ చేయండి',
    previousDocsTab: 'మునుపటి సెషన్‌లు',
    cameraScan: 'కెమెరాతో స్కాన్ చేయండి',
    uploadDoc: 'పత్రం / చిత్రాన్ని అప్‌లోడ్ చేయండి',
    sessionPurgeTitle: 'మీ డేటా సురక్షితంగా తొలగించబడింది',
    tokenIssued: 'OPD టోకెన్ విజయవంతంగా రూపొందించబడింది',
    printSlip: 'OPD స్లిప్‌ను ముద్రించండి',
    finishSession: 'పూర్తి చేసి కొత్త రోగిని ప్రారంభించండి',
    confirmDocuments: 'పత్రాలను నిర్ధారించి కొనసాగించండి',
  },

  ta: {
    stepIdentify: '1. அடையாளம்',
    stepConverse: '2. உரையாடல்',
    stepHistory: '3. வரலாறு',
    stepScanDocs: '4. ஆவணங்கள்',
    stepPrivacy: '5. தனியுரிமை',
    stepSummary: '6. சுருக்கம்',
    stepAyush: '3. ஆயுஷ் பரீட்சை',
    back: 'பின்செல்',
    continue: 'தொடர்க',
    next: 'அடுத்து',
    retry: 'மீண்டும் முயற்சி',
    loading: 'ஏற்றுகிறது...',
    listen: 'கேளுங்கள்',
    pauseVoice: 'குரலை நிறுத்து',
    required: 'தேவை',
    optional: 'விருப்பம்',
    language: 'மொழி',
    identity: 'நோயாளி அடையாளம்',
    vitals: 'உடல்நல அளவுகள்',
    complaint: 'முக்கிய புகார்',
    history: 'குடும்ப மற்றும் தனிப்பட்ட வரலாறு',
    documents: 'ஆவணங்களை ஸ்கேன் செய்க',
    privacy: 'உங்கள் தரவு பாதுகாக்கப்படுகிறது',
    summary: 'சுருக்கம்',
    selectLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    recordVitals: 'உங்கள் உடல்நல அளவுகளை பதிவு செய்யவும்',
    recordVitalsSub: 'சாதன அளவீடுகளுடன் பொருந்த ஸ்லைடர்களை சரிசெய்யவும்',
    selectComplaint: 'OPD பிரிவு மற்றும் முக்கிய புகாரைத் தேர்ந்தெடுக்கவும்',
    selectComplaintSub: 'மருத்துவமனை OPD பிரிவு மற்றும் உங்கள் முக்கிய உடல்நலப் புகாரைத் தேர்ந்தெடுக்கவும்',
    familyHistory: 'குடும்ப உறுப்பினர்களின் மருத்துவ வரலாறு',
    familyHistorySub: 'பெற்றோர், உடன்பிறப்புகளில் உள்ள நோய்களைத் தேர்ந்தெடுக்கவும்',
    noFamilyHistory: 'குடும்பத்தில் குறிப்பிடத்தக்க நோய் வரலாறு இல்லை',
    personalHabits: 'தனிப்பட்ட பழக்கவழக்கங்கள் & வாழ்க்கை முறை',
    scanDocuments: 'AI மருந்துச்சீட்டு & அறிக்கை ஸ்கேனர்',
    dataProtected: 'உங்கள் தரவு பாதுகாப்பாக உள்ளது',
    backToIdentity: 'அடையாளத்திற்குத் திரும்பு',
    confirmVitals: 'அளவுகளை உறுதிசெய்து புகாரைத் தேர்ந்தெடுக்கவும்',
    startInterview: 'மருத்துவ நேர்காணலைத் தொடங்கு',
    voiceListening: 'கேட்கிறோம். தெளிவாகப் பேசவும்.',
    voiceError: 'குரல் அங்கீகாரம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
    dpdpConsentTitle: 'தரவு தனியுரிமை மற்றும் மருத்துவ ஒப்புதல்',
    dpdpConsentSub: 'டிஜிட்டல் தனிநபர் தரவு பாதுகாப்பு (DPDP) சட்டம் 2023 மற்றும் ABDM கீழ் ஒப்புதல்',
    dpdpAudioNotice: 'DPDP சட்டம் 2023 இணக்கம்: டோக்கன் வழங்கப்பட்டதும் கியோஸ்க்கிலிருந்து தரவு நீக்கப்படும்',
    consentDemographics: 'மக்கள்தொகை & அடையாள சரிபார்ப்பு (ABHA / ஆதார்)',
    consentDemographicsSub: 'மருத்துவமனை OPD பதிவிற்காக உங்கள் பெயர், வயது, பாலினம் மற்றும் தொடர்பை சரிபார்க்க அனுமதிக்கிறது.',
    consentMedical: 'அறிகுறி வரலாறு & மருத்துவ SOCRATES மதிப்பீடு',
    consentMedicalSub: 'மருத்துவர் பார்வைக்காக உங்கள் தற்போதைய புகார்கள், வலி அளவு மற்றும் மருத்துவ வரலாற்றைப் பதிவு செய்ய அனுமதிக்கிறது.',
    consentOcr: 'மருந்துச்சீட்டு & ஆய்வக அறிக்கை AI OCR டிஜிட்டல் மயமாக்கல்',
    consentOcrSub: 'பழைய மருந்துச்சீட்டுகளை ஸ்கேன் செய்து மருந்துகளையும் பரிசோதனை முடிவுகளையும் தானாகப் பெற அனுமதிக்கிறது.',
    consentAbdm: 'ஆயுஷ்மான் பாரத் சுகாதார கணக்குடன் (ABDM) இணைக்கவும்',
    consentAbdmSub: 'சரிபார்க்கப்பட்ட மருத்துவ சுருக்கத்தை உங்கள் தனிப்பட்ட ABHA டிஜிட்டல் லாக்கருக்கு அனுப்ப அனுமதிக்கிறது.',
    agreeAndProceed: 'நான் ஒப்புக்கொள்கிறேன் & தொடர்க',
    changeLanguage: 'மொழியை மாற்றவும்',
    selectAllTerms: 'அனைத்து நிபந்தனைகளையும் தேர்ந்தெடுக்கவும்',
    verifyPatient: 'நோயாளியை சரிபார்த்து பதிவு செய்யவும்',
    verifyPatientSub: 'நோயாளி அடையாள முறையைத் தேர்ந்தெடுக்கவும். சுயவிவரம் ABDM உடன் பாதுகாப்பாக இணைக்கப்படும்.',
    tabAbha: 'ABHA & QR ஸ்கேன்',
    tabAbhaSub: 'ID எண் அல்லது அட்டை ஸ்கேன்',
    tabAadhaar: 'ஆதார் OTP',
    tabAadhaarSub: 'ABDM சேர்க்கை',
    tabMobile: 'மொபைல் OTP',
    tabMobileSub: 'PHR விரைவு உள்நுழைவு',
    allopathicOpd: 'அலோபதி பொது & சிறப்பு OPD',
    allopathicOpdSub: 'நவீன மருத்துவம் மற்றும் மருத்துவ மதிப்பீடு',
    ayushOpd: 'ஆயுஷ் & ஆயுர்வேத OPD',
    ayushOpdSub: 'முழுமையான ஆயுர்வேத, சித்த மற்றும் யுனானி பராமரிப்பு',
    voiceExplanation: 'குரல் & உரை விளக்கம்',
    speakButton: 'அறிகுறிகளைப் பேசுங்கள்',
    listening: 'கேட்கிறோம்...',
    analyzeButton: 'அறிகுறிகளை பகுப்பாய்வு செய்க',
    docScanTitle: 'AI மருந்துச்சீட்டு மற்றும் ஆய்வக அறிக்கை ஸ்கேனர்',
    docScanSub: 'கையெழுத்து மருந்துச்சீட்டுகள் & அறிக்கைகளை டிஜிட்டல் பதிவுகளாக மாற்றவும்',
    scanDocsTab: 'ஆவணங்களை ஸ்கேன் செய்க',
    previousDocsTab: 'முந்தைய அமர்வுகள்',
    cameraScan: 'கேமரா மூலம் ஸ்கேன் செய்க',
    uploadDoc: 'கோப்பு / படத்தை பதிவேற்றவும்',
    sessionPurgeTitle: 'உங்கள் தரவு பாதுகாப்பாக அழிக்கப்பட்டது',
    tokenIssued: 'OPD டோக்கன் வெற்றிகரமாக உருவாக்கப்பட்டது',
    printSlip: 'OPD சீட்டை அச்சிடுக',
    finishSession: 'முடித்து புதிய நோயாளியைத் தொடங்கவும்',
    confirmDocuments: 'ஆவணங்களை உறுதிசெய்து தொடரவும்',
  },

  kn: {
    stepIdentify: '1. ಗುರುತು',
    stepConverse: '2. ಸಂಭಾಷಣೆ',
    stepHistory: '3. ಇತಿಹಾಸ',
    stepScanDocs: '4. ದಾಖಲೆಗಳು',
    stepPrivacy: '5. ಗೌಪ್ಯತೆ',
    stepSummary: '6. ಸಾರಾಂಶ',
    stepAyush: '3. ಆಯುಷ್ ಪರೀಕ್ಷೆ',
    back: 'ಹಿಂದೆ',
    continue: 'ಮುಂದುವರಿಸಿ',
    next: 'ಮುಂದೆ',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    listen: 'ಕೇಳಿ',
    pauseVoice: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
    required: 'ಅಗತ್ಯ',
    optional: 'ಐಚ್ಛಿಕ',
    language: 'ಭಾಷೆ',
    identity: 'ರೋಗಿಯ ಗುರುತು',
    vitals: 'ಆರೋಗ್ಯ ಅಳತೆಗಳು',
    complaint: 'ಮುಖ್ಯ ದೂರು',
    history: 'ಕುಟುಂಬ ಮತ್ತು ವೈಯಕ್ತಿಕ ಇತಿಹಾಸ',
    documents: 'ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    privacy: 'ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ',
    summary: 'ಸಾರಾಂಶ',
    selectLanguage: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    recordVitals: 'ಆರೋಗ್ಯ ಅಳತೆಗಳನ್ನು ದಾಖಲಿಸಿ',
    recordVitalsSub: 'ಸಾಧನದ ರೀಡಿಂಗ್‌ಗಳಿಗೆ ಸರಿಹೊಂದುವಂತೆ ಸ್ಲೈಡರ್‌ಗಳನ್ನು ಹೊಂದಿಸಿ',
    selectComplaint: 'OPD ವಿಭಾಗ ಮತ್ತು ಮುಖ್ಯ ದೂರು ಆಯ್ಕೆಮಾಡಿ',
    selectComplaintSub: 'ಆಸ್ಪತ್ರೆಯ OPD ವಿಭಾಗ ಮತ್ತು ನಿಮ್ಮ ಮುಖ್ಯ ದೈಹಿಕ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    familyHistory: 'ಕುಟುಂಬ ಸದಸ್ಯರ ವೈದ್ಯಕೀಯ ಇತಿಹಾಸ',
    familyHistorySub: 'ಪೋಷಕರು, ಒಡಹುಟ್ಟಿದವರಲ್ಲಿ ಇರುವ ರೋಗಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    noFamilyHistory: 'ಕುಟುಂಬದಲ್ಲಿ ಯಾವುದೇ ಗಂಭೀರ ಕಾಯಿಲೆಯ ಇತಿಹಾಸವಿಲ್ಲ',
    personalHabits: 'ವೈಯಕ್ತಿಕ ಅಭ್ಯಾಸಗಳು ಮತ್ತು ಜೀವನಶೈಲಿ',
    scanDocuments: 'AI ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ & ಲ್ಯಾಬ್ ವರದಿ ಸ್ಕ್ಯಾನರ್',
    dataProtected: 'ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ',
    backToIdentity: 'ಗುರುತಿಗೆ ಹಿಂತಿರುಗಿ',
    confirmVitals: 'ಅಳತೆಗಳನ್ನು ದೃಢೀಕರಿಸಿ ದೂರು ಆಯ್ಕೆಮಾಡಿ',
    startInterview: 'ವೈದ್ಯಕೀಯ ಸಂದರ್ಶನ ಪ್ರಾರಂಭಿಸಿ',
    voiceListening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ. ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ.',
    voiceError: 'ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    dpdpConsentTitle: 'ಡೇಟಾ ಗೌಪ್ಯತೆ ಮತ್ತು ವೈದ್ಯಕೀಯ ಒಪ್ಪಿಗೆ',
    dpdpConsentSub: 'ಡಿಜಿಟಲ್ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಸಂರಕ್ಷಣೆ (DPDP) ಕಾಯ್ದೆ 2023 ಮತ್ತು ABDM ಅಡಿಯಲ್ಲಿ ಒಪ್ಪಿಗೆ',
    dpdpAudioNotice: 'DPDP ಕಾಯ್ದೆ 2023 ಅನುಸರಣೆ: ಟೋಕನ್ ನೀಡಿದ ತಕ್ಷಣ ಕಿಯೋಸ್ಕ್‌ನಿಂದ ಡೇಟಾ ಅಳಿಸಲಾಗುತ್ತದೆ',
    consentDemographics: 'ಜನಸಂಖ್ಯಾ & ಗುರುತು ಪರಿಶೀಲನೆ (ABHA / ಆಧಾರ್)',
    consentDemographicsSub: 'ಆಸ್ಪತ್ರೆಯ OPD ನೋಂದಣಿಗಾಗಿ ನಿಮ್ಮ ಹೆಸರು, ವಯಸ್ಸು, ಲಿಂಗ ಮತ್ತು ಸಂಪರ್ಕ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಅನುಮತಿಸುತ್ತದೆ.',
    consentMedical: 'ರೋಗಲಕ್ಷಣಗಳ ಇತಿಹಾಸ ಮತ್ತು ಕ್ಲಿನಿಕಲ್ SOCRATES ಮೌಲ್ಯಮಾಪನ',
    consentMedicalSub: 'ವೈದ್ಯರ ಪರಿಶೀಲನೆಗಾಗಿ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ದೂರುಗಳು, ನೋವಿನ ತೀವ್ರತೆ ಮತ್ತು ವೈದ್ಯಕೀಯ ಇತಿಹಾಸ ದಾಖಲಿಸಲು ಅನುಮತಿಸುತ್ತದೆ.',
    consentOcr: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ & ಲ್ಯಾಬ್ ವರದಿ AI OCR ಡಿಜಿಟಲೀಕರಣ',
    consentOcrSub: 'ಹಳೆಯ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಔಷಧಗಳು ಮತ್ತು ಪರೀಕ್ಷಾ ವಿವರಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪಡೆಯಲು ಅನುಮತಿಸುತ್ತದೆ.',
    consentAbdm: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಹೆಲ್ತ್ ಅಕೌಂಟ್ (ABDM) ನೊಂದಿಗೆ ಲಿಂಕ್ ಮಾಡಿ',
    consentAbdmSub: 'ದೃಢೀಕೃತ ವೈದ್ಯಕೀಯ ಸಾರಾಂಶವನ್ನು ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ABHA ಡಿಜಿಟಲ್ ಲಾಕರ್‌ಗೆ ಕಳುಹಿಸಲು ಅನುಮತಿಸುತ್ತದೆ.',
    agreeAndProceed: 'ನಾನು ಒಪ್ಪುತ್ತೇನೆ & ಮುಂದುವರಿಯಿರಿ',
    changeLanguage: 'ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಿ',
    selectAllTerms: 'ಎಲ್ಲಾ ಷರತ್ತುಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    verifyPatient: 'ರೋಗಿಯನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ನೋಂದಾಯಿಸಿ',
    verifyPatientSub: 'ರೋಗಿಯ ಗುರುತಿನ ವಿಧಾನವನ್ನು ಆಯ್ಕೆಮಾಡಿ. ವಿವರಗಳು ABDM ನೊಂದಿಗೆ ಸುರಕ್ಷಿತವಾಗಿ ಲಿಂಕ್ ಆಗುತ್ತವೆ.',
    tabAbha: 'ABHA & QR ಸ್ಕ್ಯಾನ್',
    tabAbhaSub: 'ID ಸಂಖ್ಯೆ ಅಥವಾ ಕಾರ್ಡ್ ಸ್ಕ್ಯಾನ್',
    tabAadhaar: 'ಆಧಾರ್ OTP',
    tabAadhaarSub: 'ABDM ದಾಖಲಾತಿ',
    tabMobile: 'ಮೊಬೈಲ್ OTP',
    tabMobileSub: 'PHR ತ್ವರಿತ ಲಾಗಿನ್',
    allopathicOpd: 'ಅಲೋಪತಿಕ್ ಸಾಮಾನ್ಯ ಮತ್ತು ಸ್ಪೆಷಾಲಿಟಿ OPD',
    allopathicOpdSub: 'ಆಧುನಿಕ ವೈದ್ಯಕೀಯ ಮತ್ತು ಕ್ಲಿನಿಕಲ್ ಮೌಲ್ಯಮಾಪನ',
    ayushOpd: 'ಆಯುಷ್ ಮತ್ತು ಆಯುರ್ವೇದ OPD',
    ayushOpdSub: 'ಸಮಗ್ರ ಆಯುರ್ವೇದ, ಸಿದ್ಧ ಮತ್ತು ಯುನಾನಿ ಆರೈಕೆ',
    voiceExplanation: 'ಧ್ವನಿ ಮತ್ತು ಪಠ್ಯ ವಿವರಣೆ',
    speakButton: 'ಲಕ್ಷಣಗಳನ್ನು ಮಾತನಾಡಿ',
    listening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ...',
    analyzeButton: 'ಲಕ್ಷಣಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ',
    docScanTitle: 'AI ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಮತ್ತು ಲ್ಯಾಬ್ ವರದಿ ಸ್ಕ್ಯಾನರ್',
    docScanSub: 'ಕೈಬರಹದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳು ಮತ್ತು ವರದಿಗಳನ್ನು ಡಿಜಿಟಲ್ ದಾಖಲೆಗಳಾಗಿ ಪರಿವರ್ತಿಸಿ',
    scanDocsTab: 'ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    previousDocsTab: 'ಹಿಂದಿನ ಸೆಷನ್‌ಗಳು',
    cameraScan: 'ಕ್ಯಾಮೆರಾದೊಂದಿಗೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    uploadDoc: 'ಫೈಲ್ / ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    sessionPurgeTitle: 'ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿ ಅಳಿಸಲಾಗಿದೆ',
    tokenIssued: 'OPD ಟೋಕನ್ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ',
    printSlip: 'OPD ಸ್ಲಿಪ್ ಮುದ್ರಿಸಿ',
    finishSession: 'ಮುಗಿಸಿ ಹೊಸ ರೋಗಿಯನ್ನು ಪ್ರಾರಂಭಿಸಿ',
    confirmDocuments: 'ದಾಖಲೆಗಳನ್ನು ದೃಢೀಕರಿಸಿ ಮುಂದುವರಿಯಿರಿ',
  },

  ml: {
    stepIdentify: '1. തിരിച്ചറിയൽ',
    stepConverse: '2. സംഭാഷണം',
    stepHistory: '3. ചരിത്രം',
    stepScanDocs: '4. രേഖകൾ',
    stepPrivacy: '5. സ്വകാര്യത',
    stepSummary: '6. സംഗ്രഹം',
    stepAyush: '3. ആയുഷ് പരീക്ഷ',
    back: 'തിരികെ',
    continue: 'തുടരുക',
    next: 'അടുത്തത്',
    retry: 'വീണ്ടും ശ്രമിക്കുക',
    loading: 'ലോഡ് ചെയ്യുന്നു...',
    listen: 'കേൾക്കുക',
    pauseVoice: 'ശബ്ദം നിർത്തുക',
    required: 'ആവശ്യമാണ്',
    optional: 'ഓപ്ഷണൽ',
    language: 'ഭാഷ',
    identity: 'രോഗിയുടെ തിരിച്ചറിയൽ',
    vitals: 'ആരോഗ്യ അളവുകൾ',
    complaint: 'പ്രധാന പരാതി',
    history: 'കുടുംബ, വ്യക്തിഗത ചരിത്രം',
    documents: 'രേഖകൾ സ്കാൻ ചെയ്യുക',
    privacy: 'നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമാണ്',
    summary: 'സംഗ്രഹം',
    selectLanguage: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
    recordVitals: 'ആരോഗ്യ അളവുകൾ രേഖപ്പെടുത്തുക',
    recordVitalsSub: 'ഉപകരണ റീഡിംഗുകളുമായി പൊരുത്തപ്പെടുത്താൻ സ്ലൈഡറുകൾ ക്രമീകരിക്കുക',
    selectComplaint: 'OPD വിഭാഗവും പ്രധാന പരാതിയും തിരഞ്ഞെടുക്കുക',
    selectComplaintSub: 'ആശുപത്രി ഒപിഡി വിഭാഗവും നിങ്ങളുടെ പ്രധാന ശാരീരിക പ്രശ്നവും തിരഞ്ഞെടുക്കുക',
    familyHistory: 'കുടുംബാംഗങ്ങളുടെ മെഡിക്കൽ ചരിത്രം',
    familyHistorySub: 'മാതാപിതാക്കൾ, സഹോദരങ്ങൾ എന്നിവരിലെ രോഗങ്ങൾ തിരഞ്ഞെടുക്കുക',
    noFamilyHistory: 'കുടുംബത്തിൽ കാര്യമായ രോഗചരിത്രമില്ല',
    personalHabits: 'വ്യക്തിഗത ശീലങ്ങളും ജീവിതരീതിയും',
    scanDocuments: 'AI കുറിപ്പടി & ലാബ് റിപ്പോർട്ട് സ്കാനർ',
    dataProtected: 'നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമാണ്',
    backToIdentity: 'തിരിച്ചറിയലിലേക്ക് മടങ്ങുക',
    confirmVitals: 'അളവുകൾ സ്ഥിരീകരിച്ച് പരാതി തിരഞ്ഞെടുക്കുക',
    startInterview: 'ക്ലിനിക്കൽ അഭിമുഖം ആരംഭിക്കുക',
    voiceListening: 'കേൾക്കുന്നു. വ്യക്തമായി സംസാരിക്കുക.',
    voiceError: 'ശബ്ദ തിരിച്ചറിയൽ പരാജയപ്പെട്ടു. വീണ്ടും ശ്രമിക്കുക.',
    dpdpConsentTitle: 'ഡാറ്റാ സ്വകാര്യതയും മെഡിക്കൽ സമ്മതവും',
    dpdpConsentSub: 'ഡിജിറ്റൽ വ്യക്തിഗത ഡാറ്റാ പരിരക്ഷ (DPDP) നിയമം 2023, ABDM പ്രകാരമുള്ള സമ്മതം',
    dpdpAudioNotice: 'DPDP നിയമം 2023 അനുസരണം: ടോക്കൺ ലഭിച്ച ഉടൻ കിയോസ്കിൽ നിന്ന് ഡാറ്റ നീക്കംചെയ്യും',
    consentDemographics: 'ജനസംഖ്യാ & തിരിച്ചറിയൽ പരിശോധന (ABHA / ആധാർ)',
    consentDemographicsSub: 'ആശുപത്രി ഒപിഡി രജിസ്ട്രേഷനായി നിങ്ങളുടെ പേര്, പ്രായം, ലിംഗം, ഫോൺ എന്നിവ പരിശോധിക്കാൻ അനുവദിക്കുന്നു.',
    consentMedical: 'രോഗലക്ഷണ ചരിത്രവും ക്ലിനിക്കൽ SOCRATES വിലയിരുത്തലും',
    consentMedicalSub: 'ഡോക്ടറുടെ പരിശോധനയ്ക്കായി നിലവിലെ ലക്ഷണങ്ങളും രോഗചരിത്രവും രേഖപ്പെടുത്താൻ അനുവദിക്കുന്നു.',
    consentOcr: 'കുറിപ്പടി & ലാബ് റിപ്പോർട്ട് AI OCR ഡിജിറ്റൈസേഷൻ',
    consentOcrSub: 'പഴയ കുറിപ്പടികൾ സ്കാൻ ചെയ്ത് മരുന്നുകളും പരിശോധനാ ഫലങ്ങളും സ്വയമേവ രേഖപ്പെടുത്താൻ അനുവദിക്കുന്നു.',
    consentAbdm: 'ആയുഷ്മാൻ ഭാരത് ഹെൽത്ത് അക്കൗണ്ടുമായി (ABDM) ബന്ധിപ്പിക്കുക',
    consentAbdmSub: 'പരിശോധനാ സംഗ്രഹം നിങ്ങളുടെ സ്വകാര്യ ABHA ഡിജിറ്റൽ ലോക്കറിലേക്ക് അയയ്ക്കാൻ അനുവദിക്കുന്നു.',
    agreeAndProceed: 'ഞാൻ സമ്മതിക്കുന്നു & തുടരുക',
    changeLanguage: 'ഭാഷ മാറ്റുക',
    selectAllTerms: 'എല്ലാ നിബന്ധനകളും തിരഞ്ഞെടുക്കുക',
    verifyPatient: 'രോഗിയെ പരിശോധിച്ച് രജിസ്റ്റർ ചെയ്യുക',
    verifyPatientSub: 'രോഗിയുടെ തിരിച്ചറിയൽ രീതി തിരഞ്ഞെടുക്കുക. പ്രൊഫൈൽ ABDM-ലേക്ക് സുരക്ഷിതമായി ബന്ധിപ്പിക്കും.',
    tabAbha: 'ABHA & QR സ്കാൻ',
    tabAbhaSub: 'ഐഡി നമ്പർ അല്ലെങ്കിൽ കാർഡ് സ്കാൻ',
    tabAadhaar: 'ആധാർ OTP',
    tabAadhaarSub: 'ABDM എൻറോൾമെന്റ്',
    tabMobile: 'മൊബൈൽ OTP',
    tabMobileSub: 'PHR ദ്രുത ലോഗിൻ',
    allopathicOpd: 'അലോപ്പതി ജനറൽ & സ്പെഷ്യാലിറ്റി ഒപിഡി',
    allopathicOpdSub: 'ആധുനിക വൈദ്യശാസ്ത്രവും ക്ലിനിക്കൽ വിലയിരുത്തലും',
    ayushOpd: 'ആയുഷ് & ആയുർവേദ ഒപിഡി',
    ayushOpdSub: 'സമഗ്ര ആയുർവേദ, സിദ്ധ, യൂനാനി പരിചരണം',
    voiceExplanation: 'ശബ്ദ & വാചക വിവരണം',
    speakButton: 'ലക്ഷണങ്ങൾ സംസാരിക്കുക',
    listening: 'കേൾക്കുന്നു...',
    analyzeButton: 'ലക്ഷണങ്ങൾ വിശകലനം ചെയ്യുക',
    docScanTitle: 'AI കുറിപ്പടിയും ലാബ് റിപ്പോർട്ട് സ്കാനറും',
    docScanSub: 'കുറിപ്പടികളും പരിശോധനാ ഫലങ്ങളും ഡിജിറ്റൽ രേഖകളാക്കി മാറ്റുക',
    scanDocsTab: 'രേഖകൾ സ്കാൻ ചെയ്യുക',
    previousDocsTab: 'മുമ്പത്തെ സെഷനുകൾ',
    cameraScan: 'ക്യാമറ ഉപയോഗിച്ച് സ്കാൻ ചെയ്യുക',
    uploadDoc: 'ഫയൽ / ചിത്രം അപ്‌ലോഡ് ചെയ്യുക',
    sessionPurgeTitle: 'നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമായി മായ്ച്ചു',
    tokenIssued: 'ഒപിഡി ടോക്കൺ വിജയകരമായി ജനറേറ്റ് ചെയ്തു',
    printSlip: 'ഒപിഡി സ്ലിപ്പ് പ്രിന്റ് ചെയ്യുക',
    finishSession: 'പൂർത്തിയാക്കി പുതിയ രോഗിയെ ആരംഭിക്കുക',
    confirmDocuments: 'രേഖകൾ സ്ഥിരീകരിച്ച് തുടരുക',
  },

  mr: {
    stepIdentify: '१. ओळख',
    stepConverse: '२. संवाद',
    stepHistory: '३. इतिहास',
    stepScanDocs: '४. कागदपत्रे',
    stepPrivacy: '५. गोपनीयता',
    stepSummary: '६. सारांश',
    stepAyush: '३. आयुष परीक्षा',
    back: 'मागे',
    continue: 'पुढे चला',
    next: 'पुढील',
    retry: 'पुन्हा प्रयत्न करा',
    loading: 'लोड होत आहे...',
    listen: 'ऐका',
    pauseVoice: 'आवाज थांबवा',
    required: 'आवश्यक',
    optional: 'पर्यायी',
    language: 'भाषा',
    identity: 'रुग्णाची ओळख',
    vitals: 'आरोग्य मोजमाप',
    complaint: 'मुख्य तक्रार',
    history: 'कौटुंबिक व वैयक्तिक इतिहास',
    documents: 'कागदपत्रे स्कॅन करा',
    privacy: 'तुमचा डेटा सुरक्षित आहे',
    summary: 'सारांश',
    selectLanguage: 'आपली भाषा निवडा',
    recordVitals: 'आरोग्य मोजमाप नोंदवा',
    recordVitalsSub: 'डिव्हाइस रीडिंगनुसार स्लाइडर जुळवा किंवा उपलब्ध नसलेले पॅरामीटर वगळा',
    selectComplaint: 'OPD विभाग आणि मुख्य तक्रार निवडा',
    selectComplaintSub: 'रुग्णालय OPD विभाग आणि तुमची मुख्य शारीरिक तक्रार निवडा',
    familyHistory: 'कुटुंबातील सदस्यांचा वैद्यकीय इतिहास',
    familyHistorySub: 'आई-वडील, भावंडांमधील आजार निवडा',
    noFamilyHistory: 'कुटुंबात कोणताही गंभीर आजार नाही',
    personalHabits: 'वैयक्तिक सवयी आणि जीवनशैली',
    scanDocuments: 'AI प्रिस्क्रिप्शन आणि लॅब रिपोर्ट स्कॅनर',
    dataProtected: 'तुमचा डेटा सुरक्षित आहे',
    backToIdentity: 'ओळखीकडे परत जा',
    confirmVitals: 'मोजमाप निश्चित करून तक्रार निवडा',
    startInterview: 'क्लिनिकल मुलाखत सुरू करा',
    voiceListening: 'ऐकत आहोत. कृपया स्पष्ट बोला.',
    voiceError: 'आवाज ओळखता आला नाही. कृपया पुन्हा प्रयत्न करा.',
    dpdpConsentTitle: 'डेटा गोपनीयता आणि वैद्यकीय संमती',
    dpdpConsentSub: 'डिजिटल वैयक्तिक डेटा संरक्षण (DPDP) कायदा 2023 आणि ABDM अंतर्गत संमती',
    dpdpAudioNotice: 'DPDP कायदा 2023 अनुपालन: टोकन दिल्यानंतर किओस्कवरून डेटा हटवला जाईल',
    consentDemographics: 'जनसांख्यिकीय व ओळख पडताळणी (ABHA / आधार)',
    consentDemographicsSub: 'रुग्णालय OPD नोंदणीसाठी तुमचे नाव, वय, लिंग आणि संपर्क तपासण्याची परवानगी देते.',
    consentMedical: 'लक्षण इतिहास आणि क्लिनिकल SOCRATES मूल्यांकन',
    consentMedicalSub: 'डॉक्टरांच्या तपासणीसाठी तुमच्या सध्याच्या तक्रारी, वेदना तीव्रता आणि वैद्यकीय इतिहास नोंदवण्याची परवानगी देते.',
    consentOcr: 'प्रिस्क्रिप्शन व लॅब रिपोर्ट AI OCR डिजिटायझेशन',
    consentOcrSub: 'मागील कागदी प्रिस्क्रिप्शन स्कॅन करून औषधे व तपासणी नोंदी आपोआप मिळवण्याची परवानगी देते.',
    consentAbdm: 'आयुष्मान भारत हेल्थ अकाउंटशी (ABDM) लिंक करा',
    consentAbdmSub: 'तपासणीचा सारांश तुमच्या वैयक्तिक ABHA डिजिटल लॉकरमध्ये पाठवण्याची परवानगी देते.',
    agreeAndProceed: 'मी सहमत आहे आणि पुढे चला',
    changeLanguage: 'भाषा बदला',
    selectAllTerms: 'सर्व अटी निवडा',
    verifyPatient: 'रुग्णाची पडताळणी व नोंदणी करा',
    verifyPatientSub: 'रुग्णाची ओळख पद्धत निवडा. प्रोफाइल सुरक्षितपणे ABDM शी जोडले जाईल.',
    tabAbha: 'ABHA आणि QR स्कॅन',
    tabAbhaSub: 'ID क्रमांक किंवा कार्ड स्कॅन',
    tabAadhaar: 'आधार OTP',
    tabAadhaarSub: 'ABDM नोंदणी',
    tabMobile: 'मोबाईल OTP',
    tabMobileSub: 'PHR जलद लॉगिन',
    allopathicOpd: 'अ‍ॅलोपॅथिक सामान्य व विशेष OPD',
    allopathicOpdSub: 'आधुनिक वैद्यकशास्त्र आणि क्लिनिकल मूल्यमापन',
    ayushOpd: 'आयुष आणि आयुर्वेदिक OPD',
    ayushOpdSub: 'सर्वसमावेशक आयुर्वेद, सिद्ध आणि युनानी उपचार',
    voiceExplanation: 'आवाज आणि मजकूर स्पष्टीकरण',
    speakButton: 'लक्षणे बोलून सांगा',
    listening: 'ऐकत आहोत...',
    analyzeButton: 'लक्षणे तपासा',
    docScanTitle: 'AI प्रिस्क्रिप्शन आणि लॅब रिपोर्ट स्कॅनर',
    docScanSub: 'हस्तलिखित प्रिस्क्रिप्शन आणि लॅब रिपोर्ट डिजिटल नोंदींमध्ये रूपांतरित करा',
    scanDocsTab: 'कागदपत्रे स्कॅन करा',
    previousDocsTab: 'मागील सेशन्स',
    cameraScan: 'कॅमेऱ्याने स्कॅन करा',
    uploadDoc: 'फाइल / फोटो अपलोड करा',
    sessionPurgeTitle: 'तुमचा डेटा सुरक्षितपणे हटवला गेला आहे',
    tokenIssued: 'OPD टोकन यशस्वीरीत्या तयार केले',
    printSlip: 'OPD स्लिप प्रिंट करा',
    finishSession: 'पूर्ण करा व नवीन रुग्ण सुरू करा',
    confirmDocuments: 'कागदपत्रे पुष्टी करा आणि पुढे जा',
  },

  hi: {
    stepIdentify: '1. पहचान',
    stepConverse: '2. बातचीत',
    stepHistory: '3. इतिहास',
    stepScanDocs: '4. दस्तावेज़',
    stepPrivacy: '5. गोपनीयता',
    stepSummary: '6. सारांश',
    stepAyush: '3. आयुष परीक्षा',
    back: 'वापस',
    continue: 'जारी रखें',
    next: 'अगला',
    retry: 'पुनः प्रयास करें',
    loading: 'लोड हो रहा है...',
    listen: 'सुनें',
    pauseVoice: 'आवाज़ रोकें',
    required: 'आवश्यक',
    optional: 'वैकल्पिक',
    language: 'भाषा',
    identity: 'रोगी पहचान',
    vitals: 'स्वास्थ्य जानकारी',
    complaint: 'मुख्य समस्या',
    history: 'पारिवारिक और व्यक्तिगत इतिहास',
    documents: 'दस्तावेज़ स्कैन करें',
    privacy: 'आपका डेटा सुरक्षित है',
    summary: 'सारांश',
    selectLanguage: 'अपनी भाषा चुनें',
    recordVitals: 'स्वास्थ्य जानकारी दर्ज करें',
    recordVitalsSub: 'डिवाइस रीडिंग के अनुसार स्लाइडर सेट करें या जो उपलब्ध न हो उसे छोड़ दें',
    selectComplaint: 'OPD विभाग और मुख्य समस्या चुनें',
    selectComplaintSub: 'अस्पताल ओपीडी विभाग और अपनी मुख्य शारीरिक तकलीफ चुनें',
    familyHistory: 'परिवार के सदस्यों का मेडिकल इतिहास',
    familyHistorySub: 'माता-पिता, भाई-बहनों में मौजूद बीमारियों का चयन करें',
    noFamilyHistory: 'परिवार में कोई गंभीर बीमारी का इतिहास नहीं है',
    personalHabits: 'व्यक्तिगत आदतें और जीवनशैली',
    scanDocuments: 'AI प्रिस्क्रिप्शन व लैब रिपोर्ट स्कैनर',
    dataProtected: 'आपका डेटा सुरक्षित है',
    backToIdentity: 'पहचान पर वापस जाएं',
    confirmVitals: 'जानकारी की पुष्टि करें और समस्या चुनें',
    startInterview: 'नैदानिक साक्षात्कार शुरू करें',
    voiceListening: 'सुन रहे हैं। कृपया स्पष्ट बोलें।',
    voiceError: 'आवाज़ पहचान विफल। कृपया पुनः प्रयास करें।',
    dpdpConsentTitle: 'डेटा गोपनीयता और चिकित्सा सहमति',
    dpdpConsentSub: 'डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम 2023 एवं ABDM दिशानिर्देशों के तहत सहमति',
    dpdpAudioNotice: 'DPDP अधिनियम 2023 अनुपालन: टोकन जारी होने के बाद कियोस्क से डेटा हटा दिया जाएगा',
    consentDemographics: 'जनसांख्यिकीय एवं पहचान सत्यापन (ABHA / आधार)',
    consentDemographicsSub: 'अस्पताल ओपीडी पंजीकरण के लिए आपका नाम, आयु, लिंग और संपर्क सत्यापित करने की अनुमति देता है।',
    consentMedical: 'लक्षण इतिहास और नैदानिक SOCRATES मूल्यांकन',
    consentMedicalSub: 'डॉक्टर की समीक्षा के लिए आपकी मुख्य समस्याएं, दर्द का स्तर और स्वास्थ्य विवरण दर्ज करने की अनुमति देता है।',
    consentOcr: 'पर्चे व लैब रिपोर्ट का AI OCR डिजिटलीकरण',
    consentOcrSub: 'पुराने पर्चे स्कैन करके दवाइयों और टेस्ट रिपोर्ट को स्वचालित रूप से निकालने की अनुमति देता है।',
    consentAbdm: 'आयुष्मान भारत हेल्थ अकाउंट (ABDM) से लिंक करें',
    consentAbdmSub: 'सत्यापित परामर्श सारांश को आपके व्यक्तिगत ABHA डिजिटल हेल्थ लॉकर में भेजने की अनुमति देता है।',
    agreeAndProceed: 'मैं सहमत हूँ और आगे बढ़ें',
    changeLanguage: 'भाषा बदलें',
    selectAllTerms: 'सभी शर्तें चुनें',
    verifyPatient: 'रोगी सत्यापन और पंजीकरण',
    verifyPatientSub: 'रोगी पहचान विधि चुनें। प्रोफाइल सुरक्षित रूप से ABDM से लिंक किया जाएगा।',
    tabAbha: 'ABHA एवं QR स्कैन',
    tabAbhaSub: 'ID नंबर या कार्ड स्कैन करें',
    tabAadhaar: 'आधार OTP',
    tabAadhaarSub: 'ABDM नामांकन',
    tabMobile: 'मोबाइल OTP',
    tabMobileSub: 'PHR त्वरित लॉगिन',
    allopathicOpd: 'एलोपैथिक सामान्य एवं विशेषज्ञ OPD',
    allopathicOpdSub: 'आधुनिक चिकित्सा और नैदानिक मूल्यांकन',
    ayushOpd: 'आयुष एवं आयुर्वेदिक OPD',
    ayushOpdSub: 'समग्र आयुर्वेद, सिद्ध और यूनानी उपचार',
    voiceExplanation: 'आवाज़ एवं टेक्स्ट विवरण',
    speakButton: 'लक्षण बोलकर बताएं',
    listening: 'सुन रहे हैं...',
    analyzeButton: 'लक्षणों का विश्लेषण करें',
    docScanTitle: 'AI प्रिस्क्रिप्शन व लैब रिपोर्ट स्कैनर',
    docScanSub: 'हस्तलिखित पर्चे और रिपोर्ट को संरचित डिजिटल डेटा में बदलें',
    scanDocsTab: 'दस्तावेज़ स्कैन करें',
    previousDocsTab: 'पिछले सत्र',
    cameraScan: 'कैमरे से स्कैन करें',
    uploadDoc: 'फ़ाइल / फ़ोटो अपलोड करें',
    sessionPurgeTitle: 'आपका डेटा सुरक्षित रूप से हटा दिया गया है',
    tokenIssued: 'OPD टोकन सफलतापूर्वक जनरेट हुआ',
    printSlip: 'OPD पर्ची प्रिंट करें',
    finishSession: 'समाप्त करें एवं नया मरीज शुरू करें',
    confirmDocuments: 'दस्तावेज़ की पुष्टि करें और आगे बढ़ें',
  },
};

export function translate(key: TranslationKey, language: LanguageCode, fallback?: string): string {
  return translations[language]?.[key] || translations.en[key] || fallback || key;
}

export function t(key: TranslationKey, language: LanguageCode): string {
  return translate(key, language);
}

export function getVoicePrompt(language: LanguageCode, key: 'voiceListening' | 'voiceError'): string {
  return translate(key, language);
}

/**
 * Returns primary text in the active language and the English subtitle if language is non-English.
 */
export function bilingual(
  key: TranslationKey,
  language: LanguageCode
): { primary: string; subtitle?: string } {
  const primary = translate(key, language);
  const english = translations.en[key];
  if (language === 'en' || !english || primary === english) {
    return { primary };
  }
  return { primary, subtitle: english };
}

/**
 * Reusable Bilingual Display component:
 * When language !== 'en', renders the primary text in the selected regional language,
 * and an English subtitle underneath.
 * When language === 'en', renders the English text cleanly without duplicate subtitles.
 */
export interface BilingualTextProps {
  textKey?: TranslationKey;
  regional?: string;
  english?: string;
  language: LanguageCode;
  className?: string;
  primaryClassName?: string;
  subtitleClassName?: string;
  inline?: boolean;
}

export const BilingualText: React.FC<BilingualTextProps> = ({
  textKey,
  regional,
  english,
  language,
  className = '',
  primaryClassName = '',
  subtitleClassName = 'text-slate-400 font-normal text-xs',
  inline = false,
}) => {
  const primary = regional || (textKey ? translate(textKey, language) : '');
  const sub = english || (textKey ? translations.en[textKey] : '');
  const showSubtitle = language !== 'en' && sub && sub !== primary;

  if (inline) {
    return React.createElement(
      'span',
      { className },
      React.createElement('span', { className: primaryClassName }, primary),
      showSubtitle
        ? React.createElement('span', { className: `ml-1.5 opacity-75 text-xs ${subtitleClassName}` }, ` (${sub})`)
        : null
    );
  }

  return React.createElement(
    'div',
    { className },
    React.createElement('span', { className: `block ${primaryClassName}` }, primary),
    showSubtitle
      ? React.createElement('span', { className: `block mt-0.5 opacity-80 ${subtitleClassName}` }, sub)
      : null
  );
};
