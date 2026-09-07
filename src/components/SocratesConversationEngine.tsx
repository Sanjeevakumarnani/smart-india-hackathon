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
    historyObject.transcriptLogs?.join(' ') || ''
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
                    <p className="text-xs font-bold truncate">#{kw.question}</p>
                    {kw.isCovered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                        Missing
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {kw.isCovered && kw.extractedDetail
                      ? `✓ ${kw.extractedDetail}`
                      : kw.questionRegional}
                  </p>
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
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>Voice &amp; Text Explanation (बोले या लिखें)</span>
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
            <span>{isListening ? 'Listening (सुन रहा है...)' : 'Speak (बोलकर बताएं)'}</span>
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
              <span>Analyze (विश्लेषण करें)</span>
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
                All 5 Essential Questions Covered! (सभी मुख्य बिंदु पूर्ण)
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
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Complaint</span>
        </button>

        <button
          id="converse-continue-btn"
          onClick={onComplete}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98"
        >
          <span>
            {allCovered ? 'Proceed to Next Step' : 'Confirm & Proceed to Next Step'}
          </span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
