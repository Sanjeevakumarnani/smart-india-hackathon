import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
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
  const [questions, setQuestions] = useState<any[]>(defaultQuestions);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/socrates/questions/${encodeURIComponent(complaintId)}`)
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
        }
      })
      .catch(() => {
        // Fallback to offline questions
      });
  }, [complaintId]);

  const currentQ = questions[currentQIndex] || defaultQuestions[0];
  const socrates = historyObject.socrates;

  // Trigger TTS on question change if audio narration is on
  useEffect(() => {
    if (isAudioNarration && currentQ) {
      const regional = getQuestionRegionalSubtitle(currentQ, selectedLanguage);
      const textToSpeak = regional || currentQ.title;
      speechService.speak(textToSpeak, selectedLanguage);
    }
  }, [currentQIndex, selectedLanguage, isAudioNarration]);

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
          if (isFinal) {
            // Check if matches any option keywords
            handleVoiceMatch(transcript);
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

  const handleVoiceMatch = (text: string) => {
    const lower = text.toLowerCase();
    if (currentQ.options) {
      const matched = currentQ.options.find((opt: any) =>
        lower.includes(opt.label.toLowerCase().slice(0, 8)) ||
        lower.includes(opt.code.toLowerCase())
      );
      if (matched) {
        handleOptionSelect(matched);
      }
    }
  };

  const handleOptionSelect = (option: any) => {
    const stepKey = currentQ.step as keyof SocratesData;
    const updatedSocrates: SocratesData = { ...socrates };

    if (currentQ.isMultiSelect) {
      const currentList = (updatedSocrates[stepKey] as string[]) || [];
      if (currentList.includes(option.label)) {
        (updatedSocrates[stepKey] as any) = currentList.filter((item) => item !== option.label);
      } else {
        (updatedSocrates[stepKey] as any) = [...currentList, option.label];
      }
    } else {
      (updatedSocrates[stepKey] as any) = option.label;
    }

    // Evaluate Red Flags in real-time
    const updatedRedFlags = [...(historyObject.redFlags || [])];
    if (option.isRed) {
      const flagPrefix =
        complaintId === 'chest_pain' ? 'Cardiac Red Flag' :
        complaintId === 'headache' || complaintId === 'headache_neuro' ? 'Neurological Alert' :
        complaintId === 'breathlessness' ? 'Respiratory Distress Alert' :
        complaintId === 'stomach_digestive' ? 'Acute Abdomen Alert' :
        complaintId === 'skin_rash' ? 'Severe Allergic / Cutaneous Warning' : 'Emergency Clinical Alert';
      const flagText = `${flagPrefix}: ${option.label}`;
      if (!updatedRedFlags.includes(flagText)) {
        updatedRedFlags.push(flagText);
      }
    }

    onUpdateHistory({
      ...historyObject,
      socrates: updatedSocrates,
      redFlags: updatedRedFlags,
    });
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
  };

  const handlePlayPrompt = () => {
    const regional = getQuestionRegionalSubtitle(currentQ, selectedLanguage);
    const textToSpeak = regional || currentQ.title;
    speechService.speak(textToSpeak, selectedLanguage);
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      onComplete();
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

      {/* Progress Dots */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold">
            Question {currentQIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-amber-400 font-mono font-semibold">
            {currentQ.step?.toUpperCase()}
          </span>
        </div>

        <div className="flex gap-1.5">
          {questions.map((_: any, idx: number) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentQIndex
                  ? 'w-6 bg-amber-400 shadow-sm shadow-amber-400/50'
                  : idx < currentQIndex
                  ? 'w-2 bg-emerald-400'
                  : 'w-2 bg-[#1b2334]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="stitch-card p-6 sm:p-8 mb-6">
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
                onClick={() =>
                  handleOptionSelect({
                    label: 'Center of chest (Retrosternal)',
                    code: 'retrosternal',
                    isRed: true,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition shadow-xs"
              >
                🫀 Retrosternal Chest
              </button>
              <button
                onClick={() =>
                  handleOptionSelect({
                    label: 'Left Arm & Shoulder',
                    code: 'left_arm',
                    isRed: true,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition shadow-xs"
              >
                💪 Left Arm Radiation
              </button>
              <button
                onClick={() =>
                  handleOptionSelect({
                    label: 'Upper Epigastrium',
                    code: 'epigastric',
                    isRed: false,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition shadow-xs"
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
                    onClick={() => handlePainSeverity(f.score)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all text-center flex flex-col items-center justify-between ${
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
                value={socrates.severity ?? 5}
                onChange={(e) => handlePainSeverity(parseInt(e.target.value, 10))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
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
                  onClick={() => handleOptionSelect(opt)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
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
                    <span className="text-sm font-semibold leading-snug text-slate-900">
                      {opt.label}
                    </span>
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

        {/* Voice Microphone Input Widget */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              id="voice-mic-btn"
              onClick={toggleVoice}
              className={`p-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition shadow-sm ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>
                    {selectedLanguage === 'te' ? 'వింటున్నాము... మాట్లాడండి' :
                     selectedLanguage === 'ta' ? 'கேட்கிறோம்... பேசவும்' :
                     selectedLanguage === 'kn' ? 'ಕೇಳುತ್ತಿದ್ದೇವೆ... ಮಾತನಾಡಿ' :
                     selectedLanguage === 'ml' ? 'കേൾക്കുന്നു... സംസാരിക്കുക' :
                     selectedLanguage === 'mr' ? 'ऐकत आहोत... बोला' :
                     'Listening... Speak clearly'}
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <span>
                    {selectedLanguage === 'te' ? 'వాయిస్ ద్వారా సమాధానం ఇవ్వండి' :
                     selectedLanguage === 'ta' ? 'குரல் மூலம் பதிலளிக்கவும்' :
                     selectedLanguage === 'kn' ? 'ಧ್ವನಿ ಮೂಲಕ ಉತ್ತರಿಸಿ' :
                     selectedLanguage === 'ml' ? 'ശബ്ദത്തിലൂടെ മറുപടി നൽകുക' :
                     selectedLanguage === 'mr' ? 'आवाजाद्वारे उत्तर द्या' :
                     'Speak Answer (Mic)'}
                  </span>
                </>
              )}
            </button>

            {isListening && (
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-rose-500 animate-bounce" />
                <span className="w-1 h-5 bg-rose-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1 h-3 bg-rose-500 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

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
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentQIndex === 0 ? 'Back to Complaints' : 'Previous Question'}</span>
        </button>

        <button
          id="socrates-next-btn"
          onClick={handleNext}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98"
        >
          <span>
            {currentQIndex === questions.length - 1 ? 'Proceed to Next Stage' : 'Next Question'}
          </span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
