import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { HistoryObject, LanguageCode, SocratesData } from '../types';
import { SOCRATES_QUESTIONS_MAP } from '../data/mockData';
import { speechService } from '../services/speechService';

interface SocratesConversationEngineProps {
  complaintId: string;
  historyObject: HistoryObject;
  onUpdateHistory: (history: HistoryObject) => void;
  onComplete: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
  isAudioNarration: boolean;
}

const SOCRATES_STEP_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, string>>> = {
  site: {
    te: 'నొప్పి లేదా సమస్య ఎక్కడ ఉంది?',
    ta: 'வலி அல்லது அசௌகரியம் எங்குள்ளது?',
    kn: 'ನೋವು ಅಥವಾ ತೊಂದರೆ ನಿಖರವಾಗಿ ಎಲ್ಲಿದೆ?',
    ml: 'വേദന കൃത്യമായി എവിടെയാണ് അനുഭവപ്പെടുന്നത്?',
    mr: 'वेदना किंवा त्रास नक्की कुठे होत आहे?',
  },
  onset: {
    te: 'ఈ సమస్య ఎప్పుడు మరియు ఎలా ప్రారంభమైంది?',
    ta: 'இந்த பிரச்சனை எப்போது எப்படி தொடங்கியது?',
    kn: 'ಈ ತೊಂದರೆ ಹೇಗೆ ಮತ್ತು ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು?',
    ml: 'ഈ പ്രശ്നം എപ്പോൾ, എങ്ങനെയാണ് തുടങ്ങിയത്?',
    mr: 'हा त्रास केव्हा आणि कसा सुरू झाला?',
  },
  character: {
    te: 'నొప్పి లేదా బాధ యొక్క స్వభావం ఎలా ఉంది?',
    ta: 'வலியின் தன்மை எப்படி இருக்கிறது?',
    kn: 'ನೋವಿನ ಸ್ವರೂಪ ಹೇಗಿದೆ?',
    ml: 'വേദനയുടെ സ്വഭാവം എങ്ങനെയുള്ളതാണ്?',
    mr: 'वेदना किंवा त्रासाचे स्वरूप कसे जाणवत आहे?',
  },
  radiation: {
    te: 'నొప్పి శరీరంలో ఇతర భాగాలకు వ్యాపిస్తుందా?',
    ta: 'வலி உடலின் பிற பகுதிகளுக்கு பரவுகிறதா?',
    kn: 'ನೋವು ದೇಹದ ಇತರ ಭಾಗಗಳಿಗೆ ಹರಡುತ್ತಿದೆಯೇ?',
    ml: 'വേദന മറ്റ് ഭാഗങ്ങളിലേക്ക് വ്യാപിക്കുന്നുണ്ടോ?',
    mr: 'वेदना शरीराच्या इतर भागात पसरत आहे का?',
  },
  associations: {
    te: 'దీనితో పాటు ఇతర అనుబంధ లక్షణాలు ఏమైనా ఉన్నాయా?',
    ta: 'இத்துடன் தொடர்புடைய பிற அறிகுறிகள் ஏதேனும் உள்ளதா?',
    kn: 'ಇದರೊಂದಿಗೆ ಬೇರೆ ಯಾವುದೇ ಸಂಬಂಧಿತ ಲಕ್ಷಣಗಳು ಇವೆಯೇ?',
    ml: 'ഇതോടൊപ്പം മറ്റ് അനുബന്ധ ലക്ഷണങ്ങൾ എന്തെങ്കിലും ഉണ്ടോ?',
    mr: 'यासोबत इतर कोणतीही संबंधित लक्षणे जाणवत आहेत का?',
  },
  timing: {
    te: 'ఈ నొప్పి ఎంత సమయంగా కొనసాగుతోంది?',
    ta: 'இந்த வலி எவ்வளவு நேரமாக நீடிக்கிறது?',
    kn: 'ಈ ನೋವು ಎಷ್ಟು ಸಮಯದಿಂದ ಮುಂದುವರಿಯುತ್ತಿದೆ?',
    ml: 'ഈ വേദന എത്ര സമയമായി തുടരുന്നു?',
    mr: 'ही वेदना किती वेळापासून सतत होत आहे?',
  },
  exacerbating: {
    te: 'ఏమి చేయడం వల్ల నొప్పి పెరుగుతుంది లేదా తగ్గుతుంది?',
    ta: 'எதனால் வலி அதிகமாகிறது அல்லது குறைகிறது?',
    kn: 'ಯಾವ ಕಾರಣದಿಂದ ನೋವು ಹೆಚ್ಚಾಗುತ್ತದೆ ಅಥವಾ ಕಡಿಮೆಯಾಗುತ್ತದೆ?',
    ml: 'എന്തുകൊണ്ടാണ് വേദന കൂടുകയോ കുറയുകയോ ചെയ്യുന്നത്?',
    mr: 'कशाने वेदना वाढते किंवा कमी होते?',
  },
  severity: {
    te: '0 నుండి 10 స్కేలులో మీ నొప్పి తీవ్రతను తెలియజేయండి',
    ta: '0 முதல் 10 வரையிலான அளவில் உங்கள் வலி தீவிரத்தை மதிப்பிடுங்கள்',
    kn: '0 ರಿಂದ 10 ರ ಪ್ರಮಾಣದಲ್ಲಿ ನಿಮ್ಮ ನೋವಿನ ತೀವ್ರತೆಯನ್ನು ರೇಟ್ ಮಾಡಿ',
    ml: '0 മുതൽ 10 വരെയുള്ള സ്കെയിലിൽ നിങ്ങളുടെ വേദനയുടെ തീവ്രത രേഖപ്പെടുത്തുക',
    mr: '0 ते 10 च्या प्रमाणात आपल्या वेदनेची तीव्रता सांगा',
  },
};

const getQuestionRegionalSubtitle = (q: any, lang: LanguageCode): string | undefined => {
  if (lang === 'en') return undefined;
  return q?.regionalTitles?.[lang] || SOCRATES_STEP_TRANSLATIONS[q?.step]?.[lang];
};

export interface AdaptiveQuestion {
  id: string;
  step: string;
  title: string;
  titleRegional?: string;
  subtitle?: string;
  reasoning?: string;
  options?: { label: string; labelRegional?: string; code: string; isRed?: boolean }[];
  isPainScale?: boolean;
  isMultiSelect?: boolean;
  isFinal?: boolean;
}

export const SOCRATES_DIMENSIONS: { key: keyof SocratesData; label: string; short: string }[] = [
  { key: 'site', label: 'Site', short: 'S' },
  { key: 'onset', label: 'Onset', short: 'O' },
  { key: 'character', label: 'Character', short: 'C' },
  { key: 'radiation', label: 'Radiation', short: 'R' },
  { key: 'associations', label: 'Associations', short: 'A' },
  { key: 'timing', label: 'Timing', short: 'T' },
  { key: 'severity', label: 'Severity', short: 'S' },
];

export const SocratesConversationEngine: React.FC<SocratesConversationEngineProps> = ({
  complaintId,
  historyObject,
  onUpdateHistory,
  onComplete,
  onBack,
  selectedLanguage,
  isAudioNarration,
}) => {
  const defaultQuestions = SOCRATES_QUESTIONS_MAP[complaintId] || SOCRATES_QUESTIONS_MAP['chest_pain'];
  const [questionsList, setQuestionsList] = useState<AdaptiveQuestion[]>([defaultQuestions[0]]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [customInputText, setCustomInputText] = useState('');
  const [isAdapting, setIsAdapting] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  const currentQ = questionsList[currentQIndex] || defaultQuestions[0];
  const socrates = historyObject.socrates;

  // Trigger TTS on question change if audio narration is on
  useEffect(() => {
    if (isAudioNarration && currentQ) {
      const regional = currentQ.titleRegional || getQuestionRegionalSubtitle(currentQ, selectedLanguage);
      const textToSpeak = regional || currentQ.title;
      speechService.speak(textToSpeak, selectedLanguage);
    }
  }, [currentQIndex, selectedLanguage, isAudioNarration, currentQ]);

  // Submit Answer & Fetch Next Dynamic Question
  const submitAnswer = async (answerText: string, optionObj?: any) => {
    if (!answerText || !answerText.trim() || isAdapting) return;

    const cleanAnswer = answerText.trim();
    const stepKey = currentQ.step as keyof SocratesData;
    const updatedSocrates: SocratesData = { ...socrates };

    if (optionObj) {
      if (currentQ.isMultiSelect) {
        const currentList = (updatedSocrates[stepKey] as string[]) || [];
        (updatedSocrates[stepKey] as any) = [...currentList, optionObj.label];
      } else {
        (updatedSocrates[stepKey] as any) = optionObj.label;
      }
    } else {
      (updatedSocrates[stepKey] as any) = cleanAnswer;
    }

    // Real-time Red-Flag Elevation
    const updatedRedFlags = [...(historyObject.redFlags || [])];
    if (optionObj?.isRed) {
      const flagPrefix =
        complaintId === 'chest_pain' ? 'Cardiac Red Flag' :
        complaintId === 'headache' || complaintId === 'headache_neuro' ? 'Neurological Alert' :
        complaintId === 'breathlessness' ? 'Respiratory Distress Alert' :
        complaintId === 'stomach_digestive' ? 'Acute Abdomen Alert' :
        complaintId === 'skin_rash' ? 'Severe Allergic / Cutaneous Warning' : 'Emergency Clinical Alert';
      const flagText = `${flagPrefix}: ${optionObj.label}`;
      if (!updatedRedFlags.includes(flagText)) {
        updatedRedFlags.push(flagText);
      }
    }

    const patientLog = { speaker: 'patient' as const, text: cleanAnswer, time: new Date().toLocaleTimeString() };
    const updatedTranscripts = [...(historyObject.transcriptLogs || []), patientLog];

    onUpdateHistory({
      ...historyObject,
      socrates: updatedSocrates,
      redFlags: updatedRedFlags,
      transcriptLogs: updatedTranscripts,
    });

    setVoiceTranscript('');
    setCustomInputText('');
    setIsAdapting(true);

    try {
      const res = await fetch('/api/converse/adaptive-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId,
          chiefComplaint: historyObject.chiefComplaint,
          conversationHistory: updatedTranscripts,
          socrates: updatedSocrates,
          redFlags: updatedRedFlags,
          selectedLanguage,
          lastAnswer: cleanAnswer,
          stepIndex: answeredCount + 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.question) {
          const nextQuestion: AdaptiveQuestion = data.question;
          const mergedFlags = Array.from(new Set([...updatedRedFlags, ...(data.newRedFlags || [])]));
          const mergedSocrates = { ...updatedSocrates, ...(data.extractedAttributes || {}) };

          onUpdateHistory({
            ...historyObject,
            socrates: mergedSocrates,
            redFlags: mergedFlags,
            transcriptLogs: [
              ...updatedTranscripts,
              { speaker: 'kiosk', text: nextQuestion.title, time: new Date().toLocaleTimeString() },
            ],
          });

          setQuestionsList(prev => [...prev, nextQuestion]);
          setCurrentQIndex(prev => prev + 1);
          setAnsweredCount(prev => prev + 1);

          if (isAudioNarration) {
            const toSpeak = nextQuestion.titleRegional || nextQuestion.title;
            speechService.speak(toSpeak, selectedLanguage);
          }
          setIsAdapting(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[Adaptive Converse] Network error, using fallback:', err);
    }

    // Static fallback if API is unreachable
    const nextIdx = currentQIndex + 1;
    if (nextIdx < defaultQuestions.length) {
      const nextFallback = defaultQuestions[nextIdx];
      setQuestionsList(prev => [...prev, nextFallback]);
      setCurrentQIndex(nextIdx);
      setAnsweredCount(prev => prev + 1);
      if (isAudioNarration) {
        const regional = getQuestionRegionalSubtitle(nextFallback, selectedLanguage);
        speechService.speak(regional || nextFallback.title, selectedLanguage);
      }
    } else {
      onComplete();
    }
    setIsAdapting(false);
  };

  // Voice STT Toggle
  const toggleVoice = () => {
    if (isListening) {
      if (recognitionObj) recognitionObj.stop();
      setIsListening(false);
    } else {
      const rec = speechService.createRecognition(
        selectedLanguage,
        (transcript, isFinal) => {
          setVoiceTranscript(transcript);
          if (isFinal && transcript.trim()) {
            submitAnswer(transcript);
          }
        },
        (err) => {
          console.warn('Voice recognition error:', err);
          setIsListening(false);
        },
        () => setIsListening(false)
      );

      setRecognitionObj(rec);
      rec.start();
      setIsListening(true);
    }
  };

  const handleOptionSelect = (option: any) => {
    if (currentQ.isMultiSelect) {
      const stepKey = currentQ.step as keyof SocratesData;
      const currentList = Array.isArray(socrates[stepKey]) ? [...(socrates[stepKey] as string[])] : [];
      const exists = currentList.includes(option.label);
      const nextList = exists ? currentList.filter(l => l !== option.label) : [...currentList, option.label];
      const updatedSocrates: SocratesData = { ...socrates, [stepKey]: nextList };

      const updatedRedFlags = [...(historyObject.redFlags || [])];
      if (option.isRed && !exists) {
        const flagText = `Clinical Alert: ${option.label}`;
        if (!updatedRedFlags.includes(flagText)) updatedRedFlags.push(flagText);
      }

      onUpdateHistory({
        ...historyObject,
        socrates: updatedSocrates,
        redFlags: updatedRedFlags,
      });
    } else {
      submitAnswer(option.label, option);
    }
  };

  const handlePainSeverity = (val: number) => {
    const updatedSocrates: SocratesData = { ...socrates, severity: val };
    const updatedRedFlags = [...(historyObject.redFlags || [])];

    if (val >= 7) {
      let acuteFlag: string | null = null;
      if (complaintId === 'chest_pain') {
        acuteFlag = 'Critical: Severe Pain Score (>= 7/10) with Acute Chest Discomfort';
      } else if (complaintId === 'headache' || complaintId === 'headache_neuro') {
        acuteFlag = 'Critical: Thunderclap / Severe Pain Score (>= 7/10) with Neurological Risk';
      } else if (complaintId === 'breathlessness') {
        acuteFlag = 'Critical: Severe Respiratory Distress (Pain/Discomfort Score >= 7/10)';
      }
      if (acuteFlag && !updatedRedFlags.includes(acuteFlag)) {
        updatedRedFlags.push(acuteFlag);
      }
    }

    onUpdateHistory({
      ...historyObject,
      socrates: updatedSocrates,
      redFlags: updatedRedFlags,
    });

    submitAnswer(`Pain severity rated as ${val}/10`);
  };

  const handlePlayPrompt = () => {
    const regional = currentQ.titleRegional || getQuestionRegionalSubtitle(currentQ, selectedLanguage);
    const textToSpeak = regional || currentQ.title;
    speechService.speak(textToSpeak, selectedLanguage);
  };

  const handleNext = () => {
    if (isAdapting) return;

    if (currentQ.isMultiSelect) {
      const stepKey = currentQ.step as keyof SocratesData;
      const selected = (socrates[stepKey] as string[]) || [];
      if (selected.length > 0) {
        submitAnswer(selected.join(', '));
        return;
      }
    }

    if (currentQ.isFinal || answeredCount >= 6) {
      onComplete();
    } else {
      submitAnswer('No additional specific symptoms / Proceeding');
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  const painFaces = [
    {
      score: 0,
      face: '😊',
      label: 'No Pain',
      regional: {
        te: 'నొప్పి లేదు',
        ta: 'வலி இல்லை',
        kn: 'ನೋವಿಲ್ಲ',
        ml: 'വേദനയില്ല',
        mr: 'वेदना नाही',
      },
    },
    {
      score: 2,
      face: '🙂',
      label: 'Mild',
      regional: {
        te: 'తేలికపాటి',
        ta: 'லேசான வலி',
        kn: 'ಸ್ವಲ್ಪ ನೋವು',
        ml: 'നേരിയ വേദന',
        mr: 'किरकोळ वेदना',
      },
    },
    {
      score: 4,
      face: '😐',
      label: 'Moderate',
      regional: {
        te: 'మధ్యస్థమైనది',
        ta: 'மிதமான வலி',
        kn: 'ಸಾಧಾರಣ ನೋವು',
        ml: 'മിതമായ വേദന',
        mr: 'मध्यम वेदना',
      },
    },
    {
      score: 6,
      face: '😣',
      label: 'Severe',
      regional: {
        te: 'తీవ్రమైనది',
        ta: 'கடுமையான வலி',
        kn: 'ತೀವ್ರ ನೋವು',
        ml: 'കഠിനമായ വേദന',
        mr: 'तीव्र वेदना',
      },
    },
    {
      score: 8,
      face: '😫',
      label: 'Very Severe',
      regional: {
        te: 'చాలా తీవ్రమైనది',
        ta: 'மிகக் கடுமையான',
        kn: 'ಅತಿ ತೀವ್ರ ನೋವು',
        ml: 'വളരെ കഠിനം',
        mr: 'असह्य वेदना',
      },
    },
    {
      score: 10,
      face: '😭',
      label: 'Worst Possible',
      regional: {
        te: 'భరించలేని నొప్పి',
        ta: 'தாங்க முடியாத',
        kn: 'ತಡೆಯಲಾರದ ನೋವು',
        ml: 'സഹിക്കാനാവാത്തത്',
        mr: 'अत्यंत तीव्र वेदना',
      },
    },
  ];

  const hasActiveRedFlag = historyObject.redFlags && historyObject.redFlags.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Red-Flag Urgent Banner if triggered */}
      {hasActiveRedFlag && (
        <div className="mb-6 p-4 rounded-3xl bg-[#20080e]/95 border-2 border-rose-500 text-white flex items-center justify-between shadow-2xl shadow-rose-950/60 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/40">
              <ShieldAlert className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-black text-rose-200 uppercase tracking-wide">
                CRITICAL TRIAGE PROTOCOL ACTIVATED
              </p>
              <p className="text-xs text-rose-300">
                Symptoms indicate potential Acute Coronary Syndrome. Elevated to Priority 1 (Red).
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-600 font-mono font-black text-xs">
            PRIORITY 1
          </span>
        </div>
      )}

      {/* SOCRATES Dimensions Flow Tracker */}
      <div className="mb-5 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
              Dynamic Inquiry #{currentQIndex + 1}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Dimension: <strong className="text-indigo-900 font-bold">{currentQ.step?.toUpperCase()}</strong>
            </span>
          </div>

          <span className="text-xs font-mono text-slate-500">
            {answeredCount} of ~6 answered
          </span>
        </div>

        {/* 7 SOCRATES Dimension Badges */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {SOCRATES_DIMENSIONS.map((dim) => {
            const val = socrates[dim.key];
            const isFilled = Array.isArray(val) ? val.length > 0 : val !== undefined && val !== null && val !== '';
            const isCurrent = currentQ.step === dim.key;

            return (
              <div
                key={dim.key}
                className={`py-1.5 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-400'
                    : isFilled
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 font-semibold'
                    : 'bg-slate-100 border border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <span className="text-[11px] sm:text-xs font-mono font-black">{dim.short}</span>
                  {isFilled && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 hidden sm:inline" />}
                </div>
                <span className="text-[9px] sm:text-[10px] truncate max-w-full hidden sm:inline">{dim.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="stitch-card p-6 sm:p-8 mb-6">
        {/* Dynamic Reasoning Badge */}
        {currentQ.reasoning && (
          <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{currentQ.reasoning}</span>
          </div>
        )}

        {/* Title & Audio */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {currentQ.title}
            </h3>
            {selectedLanguage !== 'en' && getQuestionRegionalSubtitle(currentQ, selectedLanguage) && (
              <p className="text-base sm:text-lg text-indigo-700 mt-1 font-semibold">
                {getQuestionRegionalSubtitle(currentQ, selectedLanguage)}
              </p>
            )}
            {currentQ.subtitle && (
              <p className="text-xs text-slate-500 mt-1">{currentQ.subtitle}</p>
            )}
          </div>

          <button
            onClick={handlePlayPrompt}
            className="p-3 rounded-2xl bg-violet-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition shadow-sm shrink-0"
            title="Read Question Aloud"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Adapting / Thinking Banner */}
        {isAdapting && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-center gap-3 animate-pulse text-indigo-900">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="text-xs sm:text-sm font-semibold">
              AI is analyzing your input and tailoring the next clinical question...
            </span>
          </div>
        )}

        {/* 2D Body Map Site Visualizer if site/radiation step */}
        {(currentQ.step === 'site' || currentQ.step === 'radiation') && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-around gap-4">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider font-mono">
                Interactive Anatomical Map
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Tap the pain epicenter on the body schema
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                disabled={isAdapting}
                onClick={() =>
                  handleOptionSelect({
                    label: 'Center of chest (Retrosternal)',
                    code: 'retrosternal',
                    isRed: true,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition shadow-xs disabled:opacity-50"
              >
                🫀 Retrosternal Chest
              </button>
              <button
                disabled={isAdapting}
                onClick={() =>
                  handleOptionSelect({
                    label: 'Left Arm & Shoulder',
                    code: 'left_arm',
                    isRed: true,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition shadow-xs disabled:opacity-50"
              >
                💪 Left Arm Radiation
              </button>
              <button
                disabled={isAdapting}
                onClick={() =>
                  handleOptionSelect({
                    label: 'Upper Epigastrium',
                    code: 'epigastric',
                    isRed: false,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition shadow-xs disabled:opacity-50"
              >
                🥗 Epigastric / Stomach
              </button>
            </div>
          </div>
        )}

        {/* Pain Scale (Wong-Baker + Numerical 0-10) */}
        {currentQ.isPainScale ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {painFaces.map((f) => {
                const isSelected = socrates.severity === f.score;
                return (
                  <div
                    key={f.score}
                    id={`pain-score-${f.score}`}
                    onClick={() => !isAdapting && handlePainSeverity(f.score)}
                    className={`p-3.5 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-between ${
                      isAdapting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'stitch-card-active scale-105'
                        : 'stitch-card hover:border-indigo-400'
                    }`}
                  >
                    <span className="text-3xl select-none">{f.face}</span>
                    <span className="text-lg font-black text-slate-900 mt-1 font-mono">
                      {f.score}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 mt-0.5">
                      {f.label}
                    </span>
                    {selectedLanguage !== 'en' && f.regional[selectedLanguage] && (
                      <span className="text-[9px] text-indigo-700 font-medium">
                        {f.regional[selectedLanguage]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Slider backup */}
            <div className="px-4">
              <input
                type="range"
                min="0"
                max="10"
                disabled={isAdapting}
                value={socrates.severity ?? 5}
                onChange={(e) => handlePainSeverity(parseInt(e.target.value, 10))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>0 (No Pain)</span>
                <span className="text-indigo-700 font-bold text-sm">
                  Selected Severity: {socrates.severity ?? 'Not set'}/10
                </span>
                <span>10 (Maximum Pain)</span>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Multi / Single Choice Options */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentQ.options?.map((opt: any) => {
              const stepKey = currentQ.step as keyof SocratesData;
              let isSelected = false;
              if (currentQ.isMultiSelect) {
                isSelected = ((socrates[stepKey] as string[]) || []).includes(opt.label);
              } else {
                isSelected = socrates[stepKey] === opt.label;
              }

              return (
                <div
                  key={opt.code}
                  id={`option-${opt.code}`}
                  onClick={() => !isAdapting && handleOptionSelect(opt)}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                    isAdapting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? opt.isRed
                        ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 shadow-sm'
                        : 'stitch-card-active'
                      : 'stitch-card hover:border-indigo-400 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isSelected
                          ? opt.isRed
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      ✓
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-snug text-slate-900">
                        {opt.label}
                      </span>
                      {selectedLanguage !== 'en' && opt.labelRegional && (
                        <span className="text-xs text-indigo-700 font-medium mt-0.5">
                          {opt.labelRegional}
                        </span>
                      )}
                    </div>
                  </div>

                  {opt.isRed && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-mono font-bold uppercase shrink-0">
                      Cardiac Flag
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Voice & Custom Input Controls */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Voice STT Button */}
            <button
              id="voice-mic-btn"
              onClick={toggleVoice}
              disabled={isAdapting}
              className={`p-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition shadow-sm shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              } ${isAdapting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>
                    {selectedLanguage === 'te' ? 'వింటున్నాము...' :
                     selectedLanguage === 'ta' ? 'கேட்கிறோம்...' :
                     selectedLanguage === 'kn' ? 'ಕೇಳುತ್ತಿದ್ದೇವೆ...' :
                     selectedLanguage === 'ml' ? 'കേൾക്കുന്നു...' :
                     selectedLanguage === 'mr' ? 'ऐकत आहोत...' :
                     'Listening...'}
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <span>
                    {selectedLanguage === 'te' ? 'వాయిస్ ద్వారా చెప్పండి' :
                     selectedLanguage === 'ta' ? 'குரல் மூலம் பேசவும்' :
                     selectedLanguage === 'kn' ? 'ಧ್ವನಿ ಮೂಲಕ ಹೇಳಿ' :
                     selectedLanguage === 'ml' ? 'ശബ്ദത്തിൽ സംസാരിക്കുക' :
                     selectedLanguage === 'mr' ? 'आवाजाने बोला' :
                     'Speak (Mic)'}
                  </span>
                </>
              )}
            </button>

            {/* Custom Input Bar */}
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={customInputText}
                onChange={(e) => setCustomInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInputText.trim() && !isAdapting) {
                    submitAnswer(customInputText);
                  }
                }}
                placeholder={
                  selectedLanguage === 'te' ? 'ఇక్కడ మీ స్వంత సమాధానం టైప్ చేయండి...' :
                  selectedLanguage === 'ta' ? 'இங்கு உங்கள் பதிலை தட்டச்சு செய்க...' :
                  selectedLanguage === 'kn' ? 'ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...' :
                  selectedLanguage === 'ml' ? 'നിങ്ങളുടെ മറുപടി ഇവിടെ ടൈപ്പ് ചെയ്യുക...' :
                  selectedLanguage === 'mr' ? 'आपले उत्तर येथे टाईप करा...' :
                  'Or type your answer in your own words...'
                }
                className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-xs"
                disabled={isAdapting}
              />
              <button
                type="button"
                onClick={() => {
                  if (customInputText.trim() && !isAdapting) {
                    submitAnswer(customInputText);
                  }
                }}
                disabled={!customInputText.trim() || isAdapting}
                className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition shrink-0"
                title="Send Answer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active voice transcript display */}
          {voiceTranscript && (
            <div className="text-xs text-slate-600 italic bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              "{voiceTranscript}"
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={isAdapting}
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentQIndex === 0 ? 'Back to Complaints' : 'Previous Question'}</span>
        </button>

        <button
          id="socrates-next-btn"
          onClick={handleNext}
          disabled={isAdapting}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98 disabled:opacity-50"
        >
          <span>
            {currentQ.isFinal || answeredCount >= 6 ? 'Proceed to Next Stage' : 'Next Question'}
          </span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
