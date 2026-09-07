import React, { useState } from 'react';
import {
  X,
  Send,
  Phone,
  Video,
  Play,
  Pause,
  CheckCheck,
  PhoneCall,
  PhoneOff,
  Leaf,
} from 'lucide-react';
import { DigitizedDocument, HistoryObject, PatientProfile, LanguageCode, QueueToken } from '../types';
import { speechService } from '../services/speechService';

interface WhatsAppContinuityModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientProfile: PatientProfile | null;
  selectedLanguage: LanguageCode;
  historyObject: HistoryObject;
  createdToken?: QueueToken | null;
  documents?: DigitizedDocument[];
}

// Pathya/Apathya advice based on dominant dosha
const getPathyaApathya = (dosha: string) => {
  const dosha_lower = dosha.toLowerCase();
  if (dosha_lower.includes('vata')) {
    return {
      pathya: ['Warm, oily, and nourishing foods', 'Sweet, sour, and salty tastes (Madhura, Amla, Lavana Rasa)', 'Regular meal timing — avoid skipping meals', 'Warm milk with ghee at bedtime', 'Sesame oil self-massage (Abhyanga)', 'Adequate rest — 7-8 hours sleep'],
      apathya: ['Cold, dry, and raw foods', 'Excessive fasting or irregular eating', 'Excess bitter, pungent, astringent tastes', 'Prolonged screen use late at night', 'Loud environments and excessive travel'],
      dosha: 'Vata',
    };
  }
  if (dosha_lower.includes('pitta')) {
    return {
      pathya: ['Cool, sweet, and bitter foods', 'Coconut water, pomegranate, amla, coriander', 'Sweet, bitter, astringent tastes (Madhura, Tikta, Kashaya)', 'Cooling herbs: Shatavari, Guduchi, Brahmi', 'Gentle outdoor walks in morning coolness'],
      apathya: ['Spicy, sour, and salty foods in excess', 'Pickles, fermented foods, vinegar', 'Direct afternoon sun exposure', 'Excessive caffeine, alcohol', 'High-pressure competitive environments'],
      dosha: 'Pitta',
    };
  }
  if (dosha_lower.includes('kapha')) {
    return {
      pathya: ['Light, warm, and dry foods', 'Pungent, bitter, astringent tastes (Katu, Tikta, Kashaya)', 'Honey (in small amounts — not heated)', 'Vigorous exercise — brisk walking, yoga', 'Dry massage (Garshana) with raw silk gloves'],
      apathya: ['Heavy, oily, sweet, and cold foods', 'Dairy excess (especially cheese, curd at night)', 'Sleeping in daytime', 'Sedentary lifestyle', 'Sweet, salty, sour tastes in excess'],
      dosha: 'Kapha',
    };
  }
  return null;
};

export const WhatsAppContinuityModal: React.FC<WhatsAppContinuityModalProps> = ({
  isOpen,
  onClose,
  patientProfile,
  selectedLanguage,
  historyObject,
  createdToken,
  documents = [],
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'WHATSAPP' | 'IVR'>('WHATSAPP');
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connected' | 'ended'>('idle');
  const [chatInput, setChatInput] = useState('');
  const [extraMessages, setExtraMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([]);

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setExtraMessages(prev => [...prev, { sender: 'user', text, time: now }]);
    setChatInput('');

    // Dispatch real backend notification call
    fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: patientProfile?.phone || '+919876543210',
        message: text,
        patientName: patientProfile?.fullName || 'Patient',
      }),
    }).catch((err) => console.warn('Notification dispatch notice:', err));

    setTimeout(() => {
      setExtraMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `Acknowledged: "${text}". Your message has been logged for attending physician in Room ${createdToken?.roomNumber || '104'}.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  if (!isOpen) return null;

  const isAyush = historyObject.opdType === 'ayurveda';
  const dosha = historyObject.ayush?.dominantDosha || historyObject.ayush?.prakriti || 'Vata-Pitta';
  const pathyaApathya = isAyush ? getPathyaApathya(dosha) : null;

  const patientFirstName = patientProfile?.fullName?.split(' ')[0] || 'Patient';
  const regionalAudioNotes: Record<LanguageCode, string> = {
    te: isAyush
      ? `నమస్కారం ${patientFirstName} గారు, వైద్యుల సలహా ప్రకారం మీ ${dosha} శరీరతత్వానికి తగిన ఆహార నియమాలను పాటించండి.`
      : `నమస్కారం ${patientFirstName} గారు, డాక్టర్ సూచించిన విధంగా మీ మందులను సమయానికి తీసుకోండి. ఏదైనా అత్యవసరమైతే వెంటనే సంప్రదించండి.`,
    ta: isAyush
      ? `வணக்கம் ${patientFirstName} அவர்களே, மருத்துவர் ஆலோசனைப்படி உங்கள் ${dosha} உடலமைப்பிற்கு ஏற்ற உணவு முறைகளைப் பின்பற்றுங்கள்.`
      : `வணக்கம் ${patientFirstName} அவர்களே, மருத்துவரின் பரிந்துரைப்படி உங்கள் மருந்துகளை சரியான நேரத்தில் எடுத்துக் கொள்ளுங்கள்.`,
    kn: isAyush
      ? `ನಮಸ್ಕಾರ ${patientFirstName} ಅವರೇ, ವೈದ್ಯರ ಸಲಹೆಯಂತೆ ನಿಮ್ಮ ${dosha} ಪ್ರಕೃತಿಗೆ ಸೂಕ್ತವಾದ ಆಹಾರ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸಿ.`
      : `ನಮಸ್ಕಾರ ${patientFirstName} ಅವರೇ, ವೈದ್ಯರ ಸೂಚನೆಯಂತೆ ನಿಮ್ಮ ಔಷಧಿಗಳನ್ನು ಸರಿಯಾದ ಸಮಯಕ್ಕೆ ಸೇವಿಸಿ.`,
    ml: isAyush
      ? `നമസ്കാരം ${patientFirstName}, ഡോക്ടറുടെ നിർദ്ദേശപ്രകാരം നിങ്ങളുടെ ${dosha} പ്രകൃതിക്ക് അനുയോജ്യമായ ഭക്ഷണശീലങ്ങൾ പാലിക്കുക.`
      : `നമസ്കാരം ${patientFirstName}, ഡോക്ടറുടെ നിർദ്ദേശപ്രകാരം നിങ്ങളുടെ മരുന്നുകൾ കൃത്യസമയത്ത് കഴിക്കുക.`,
    mr: isAyush
      ? `नमस्कार ${patientFirstName} जी, वैद्यांच्या सल्ल्यानुसार तुमच्या ${dosha} प्रकृतीसाठी योग्य आहार-विहार पाळा.`
      : `नमस्कार ${patientFirstName} जी, डॉक्टरांच्या सल्ल्यानुसार आपली औषधे वेळेवर घ्या.`,
    en: isAyush
      ? `Hello ${patientFirstName}, please follow the dietary and lifestyle guidelines prescribed for your ${dosha} constitution.`
      : `Hello ${patientFirstName}, kindly follow your post-consult prescription schedule and avoid heavy physical exertion. In case of recurring chest tightness, report directly to emergency triage.`,
  };
  const audioNoteText = regionalAudioNotes[selectedLanguage] || regionalAudioNotes.en;

  const togglePlayAudio = () => {
    if (isPlayingAudio) {
      speechService.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      speechService.speak(
        audioNoteText,
        selectedLanguage,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false)
      );
    }
  };

  const handleStartIvrCall = () => {
    setCallState('ringing');
    setTimeout(() => {
      setCallState('connected');
      speechService.speak(
        `This is a message from the hospital. Dear ${patientProfile?.fullName || 'Patient'}, ${audioNoteText} Press any button to replay this message.`,
        selectedLanguage,
        () => {},
        () => setCallState('ended')
      );
    }, 2000);
  };

  const handleEndIvrCall = () => {
    speechService.stop();
    setCallState('ended');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[2.5rem] bg-slate-950 border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[680px] relative">
        {/* Phone Notch */}
        <div className="w-full bg-slate-900 pt-2 pb-1 flex items-center justify-between px-6 text-[11px] text-slate-400 font-mono">
          <span>09:41</span>
          <div className="w-24 h-4 rounded-full bg-black mx-auto" />
          <span>5G 100%</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`flex-1 py-2.5 text-xs font-bold transition ${activeTab === 'WHATSAPP' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500'}`}
          >
            💬 WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('IVR')}
            className={`flex-1 py-2.5 text-xs font-bold transition ${activeTab === 'IVR' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-500'}`}
          >
            📞 IVR Call
          </button>
          <button onClick={onClose} className="px-3 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Tab */}
        {activeTab === 'WHATSAPP' && (
          <>
            {/* WhatsApp Header */}
            <div className="bg-emerald-800 px-3.5 py-2.5 text-white flex items-center justify-between shadow">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shadow">M+</div>
                <div>
                  <p className="text-xs font-bold leading-tight">AIIMS OPD Health Desk</p>
                  <p className="text-[10px] text-emerald-200">Official Verified Business</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-emerald-200">
                <Video className="w-4 h-4" />
                <Phone className="w-4 h-4" />
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 bg-[#0b141a] p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
              <div className="flex justify-center">
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-400 font-medium shadow">TODAY</span>
              </div>

              {/* Consultation summary */}
              <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#202c33] p-3 text-slate-200 shadow-md">
                <p className="text-[11px] font-bold text-emerald-400 mb-1">
                  🏥 OPD Consultation Summary • Token #{createdToken?.tokenNumber || patientProfile?.aadhaarLast4 || '101'}
                </p>
                <p className="leading-relaxed">
                  Dear <strong>{patientProfile?.fullName || 'Patient'}</strong>, your intake case summary for <strong>{historyObject.chiefComplaint || 'OPD Consultation'}</strong> has been securely recorded and synced to your{' '}
                  <strong>ABHA ID ({patientProfile?.abhaId})</strong>.
                </p>
                <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 space-y-1">
                  <p>• <strong>Doctor:</strong> {createdToken?.doctorName || (isAyush ? 'Vaidya R. S. Joshi' : 'Attending OPD Physician')} ({createdToken?.roomNumber || (isAyush ? 'AYUSH Room 202' : 'OPD Room 104')})</p>
                  <p>• <strong>Triage Priority:</strong> <span className={createdToken?.priorityLevel === 'CRITICAL' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{createdToken?.priorityLevel || 'ROUTINE'}</span></p>
                  <p>• <strong>Next Review:</strong> In 5 days or SOS if symptoms escalate</p>
                </div>
                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400">
                  <span>Just now</span>
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>

              {/* Audio note */}
              <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#202c33] p-3 text-slate-200 shadow-md">
                <p className="text-[10px] font-bold text-slate-400 mb-2">🎙️ Post-Consult Voice Advice ({selectedLanguage.toUpperCase()})</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayAudio}
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow transition active:scale-95 shrink-0"
                  >
                    {isPlayingAudio ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full bg-emerald-400 ${isPlayingAudio ? 'w-full transition-all duration-3000' : 'w-1/3'}`} />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
                      <span>{isPlayingAudio ? 'Playing...' : '0:00'}</span>
                      <span>Voice Note</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 italic mt-2">"{audioNoteText}"</p>
                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400">
                  <span>Sent</span>
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>

              {/* Medication schedule OR Pathya/Apathya */}
              {isAyush && pathyaApathya ? (
                <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#202c33] p-3 text-slate-200 shadow-md">
                  <p className="text-[11px] font-bold text-amber-400 mb-2">
                    <Leaf className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                    Pathya-Apathya ({pathyaApathya.dosha} Prakriti)
                  </p>
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-emerald-400 mb-1">✅ Pathya (Do's):</p>
                    <ul className="space-y-0.5 text-[10px] text-slate-300">
                      {pathyaApathya.pathya.map((p, i) => <li key={i}>• {p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-rose-400 mb-1">❌ Apathya (Don'ts):</p>
                    <ul className="space-y-0.5 text-[10px] text-slate-300">
                      {pathyaApathya.apathya.map((a, i) => <li key={i}>• {a}</li>)}
                    </ul>
                  </div>
                  <div className="flex justify-end items-center gap-1 mt-2 text-[9px] text-slate-400">
                    <span>Active</span>
                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#202c33] p-3 text-slate-200 shadow-md">
                  <p className="text-[11px] font-bold text-emerald-400 mb-1">💊 Digital Medication Schedule</p>
                  {documents.length > 0 && documents.some(d => d.medications.length > 0) ? (
                    <ul className="space-y-1 text-[10px] text-slate-300">
                      {documents.flatMap(d => d.medications).map((m, idx) => (
                        <li key={idx}>✅ <strong>{m.name}:</strong> {m.dosage} — {m.frequency} ({m.duration})</li>
                      ))}
                    </ul>
                  ) : patientProfile?.currentMedications?.length ? (
                    <ul className="space-y-1 text-[10px] text-slate-300">
                      {patientProfile.currentMedications.map((med, idx) => (
                        <li key={idx}>✅ <strong>Active Rx:</strong> {med}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Prescription orders pending attending physician consult in {createdToken?.roomNumber || 'Room 104'}.
                    </p>
                  )}
                  {/* Dynamic sent messages */}
                  {extraMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        msg.sender === 'user'
                          ? 'ml-auto bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-[#202c33] text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400">
                        <span>{msg.time}</span>
                        {msg.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat input */}
            <div className="bg-[#202c33] p-2 flex items-center gap-2 text-slate-400">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="Type a message or health query..."
                className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* IVR Tab */}
        {activeTab === 'IVR' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900">
            {callState === 'idle' && (
              <>
                <div className="w-24 h-24 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center mb-5 shadow-sm">
                  <PhoneCall className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">IVR Health Reminder</h3>
                <p className="text-xs text-slate-500 text-center mb-2">
                  Automated follow-up call for patients without smartphones
                </p>
                <p className="text-xs text-indigo-600 font-mono font-bold mb-6">{patientProfile?.phone || '+91 98765 43210'}</p>
                <div className="w-full p-3 rounded-2xl bg-white border border-slate-200 text-[11px] text-slate-600 mb-6 shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold mb-1 font-mono">IVR SCRIPT PREVIEW:</p>
                  <p className="italic">"{audioNoteText}"</p>
                </div>
                <button
                  onClick={handleStartIvrCall}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/30 transition active:scale-95"
                >
                  <Phone className="w-7 h-7" />
                </button>
                <p className="text-[10px] text-slate-500 mt-3">Initiate automated IVR call</p>
              </>
            )}

            {callState === 'ringing' && (
              <>
                <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mb-5 animate-pulse shadow-2xl shadow-cyan-950/50">
                  <Phone className="w-12 h-12 text-cyan-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">Calling...</h3>
                <p className="text-xs text-slate-400">{patientProfile?.phone || '+91 98765 43210'}</p>
                <div className="flex gap-2 mt-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </>
            )}

            {callState === 'connected' && (
              <>
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-5 shadow-2xl shadow-emerald-950/50">
                  <Phone className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-emerald-300 mb-1">Call Connected</h3>
                <p className="text-xs text-slate-400 mb-1">{patientProfile?.phone || '+91 98765 43210'}</p>
                <p className="text-[11px] text-cyan-300 font-mono animate-pulse mb-4">🔊 Playing health advice...</p>
                <div className="w-full p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-100 mb-6 italic">
                  "{audioNoteText}"
                </div>
                <div className="text-[10px] text-slate-400 mb-4 font-mono text-center">
                  Press 1️⃣ to replay • Press 2️⃣ to connect to nurse
                </div>
                <button
                  onClick={handleEndIvrCall}
                  className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center shadow-2xl shadow-rose-500/30 transition active:scale-95"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
              </>
            )}

            {callState === 'ended' && (
              <>
                <div className="w-24 h-24 rounded-full bg-slate-800/50 border-2 border-slate-600 flex items-center justify-center mb-5">
                  <PhoneOff className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">Call Ended</h3>
                <p className="text-xs text-slate-400 mb-4">IVR health reminder delivered successfully</p>
                <div className="w-full p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono text-center">
                  ✅ Post-visit advice delivered via IVR
                </div>
                <button
                  onClick={() => setCallState('idle')}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#161c28] border border-[#1b2334] text-xs font-bold text-slate-300 hover:bg-[#202838] transition"
                >
                  Make Another Call
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
