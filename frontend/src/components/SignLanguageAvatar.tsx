import React, { useState, useEffect } from 'react';
import { Hand, X } from 'lucide-react';
import { KioskStep, OpdType } from '../types';

interface SignLanguageAvatarProps {
  currentPromptText: string;
  currentStep: KioskStep;
  opdType?: OpdType;
  isOpen: boolean;
  onClose: () => void;
}

type StepISLData = {
  gestures: { label: string; icon: string; handPose: string }[];
  glossLine: string;
  contextLabel: string;
  contextColor: string;
};

const STEP_ISL_MAP: Partial<Record<KioskStep, StepISLData>> = {
  LANGUAGE: {
    gestures: [
      { label: 'Welcome / Namaste', icon: '🙏', handPose: 'Hands joined at chest' },
      { label: 'Select Language', icon: '👆', handPose: 'Index finger pointing to screen' },
      { label: 'Tap your choice', icon: '🤏', handPose: 'Pinch gesture toward button' },
      { label: 'Understanding', icon: '👂', handPose: 'Hand cupped at ear' },
    ],
    glossLine: 'LANGUAGE → CHOOSE → YOUR → TAP',
    contextLabel: 'Language Selection',
    contextColor: 'text-cyan-400 border-cyan-500/40',
  },
  CONSENT: {
    gestures: [
      { label: 'Privacy / Data Safe', icon: '🔒', handPose: 'Fist closed at chest — protection sign' },
      { label: 'Read Terms', icon: '📖', handPose: 'Open palms facing up — reading gesture' },
      { label: 'Agree / Accept', icon: '✅', handPose: 'Thumbs up' },
      { label: 'Your data protected', icon: '🛡️', handPose: 'Arms crossed at chest — shield gesture' },
    ],
    glossLine: 'PRIVACY → AGREE → PROTECT → YOUR-DATA',
    contextLabel: 'Consent & Privacy',
    contextColor: 'text-emerald-400 border-emerald-500/40',
  },
  IDENTITY: {
    gestures: [
      { label: 'Scan ABHA Card', icon: '🪪', handPose: 'Card held flat, move to camera area' },
      { label: 'Show QR Code', icon: '📱', handPose: 'Phone display gesture toward scanner' },
      { label: 'Your Name', icon: '🧑', handPose: 'Point to self, then open palm outward' },
      { label: 'Verified', icon: '✅', handPose: 'Thumbs up with nod' },
    ],
    glossLine: 'ABHA-CARD → SCAN → OR → ENTER-NUMBER',
    contextLabel: 'Identity & ABHA',
    contextColor: 'text-cyan-400 border-cyan-500/40',
  },
  VITALS: {
    gestures: [
      { label: 'Blood Pressure', icon: '💉', handPose: 'Squeezing arm cuff gesture' },
      { label: 'Pulse / Heartbeat', icon: '❤️', handPose: 'Index and middle fingers on wrist' },
      { label: 'Oxygen / Breathing', icon: '🫁', handPose: 'Deep breath + finger clip on fingertip gesture' },
      { label: 'Temperature', icon: '🌡️', handPose: 'Thermometer under arm/forehead gesture' },
    ],
    glossLine: 'BLOOD-PRESSURE → PULSE → OXYGEN → TEMPERATURE',
    contextLabel: 'Vitals Measurement',
    contextColor: 'text-indigo-400 border-indigo-500/40',
  },
  COMPLAINT_SELECT: {
    gestures: [
      { label: 'Where is the pain?', icon: '🤔', handPose: 'Tilt head, quizzical expression, open hands' },
      { label: 'Point to problem area', icon: '👉', handPose: 'Index finger pointing toward body area' },
      { label: 'Chest pain', icon: '🫀', handPose: 'Hand pressed flat on chest' },
      { label: 'Stomach', icon: '🤢', handPose: 'Circular motion over abdomen' },
    ],
    glossLine: 'PROBLEM → WHERE → CHEST? → STOMACH? → SELECT',
    contextLabel: 'Chief Complaint',
    contextColor: 'text-amber-400 border-amber-500/40',
  },
  CONVERSATION: {
    gestures: [
      { label: 'Describe your pain', icon: '😣', handPose: 'Fist on chest for pain, then open hand describing' },
      { label: 'When did it start?', icon: '⏰', handPose: 'Tap watch/wrist, then open palms upward' },
      { label: 'Speak or tap answer', icon: '🎙️', handPose: 'Point to mouth (speak) OR point to screen (tap)' },
      { label: 'Severity rating', icon: '📊', handPose: 'Show fingers 1-10 for severity scale' },
    ],
    glossLine: 'PAIN → DESCRIBE → WHEN → HOW-SEVERE → ANSWER',
    contextLabel: 'SOCRATES Interview',
    contextColor: 'text-rose-400 border-rose-500/40',
  },
  FAMILY_HISTORY: {
    gestures: [
      { label: 'Your family', icon: '👨‍👩‍👧', handPose: 'Hands forming a house shape' },
      { label: 'Any illness in family?', icon: '🤒', handPose: 'Points to self, then spreads arms wide (family)' },
      { label: 'Tap to select', icon: '☑️', handPose: 'Tapping finger motion' },
      { label: 'Habits / Lifestyle', icon: '🚭', handPose: 'Crossed arms (No smoking gesture)' },
    ],
    glossLine: 'FAMILY → ILLNESS → SELECT → LIFESTYLE',
    contextLabel: 'Family & Social History',
    contextColor: 'text-violet-400 border-violet-500/40',
  },
  AYUSH_PARIKSHA: {
    gestures: [
      { label: 'Prakriti / Constitution', icon: '🌿', handPose: 'Hands open at chest — receiving gesture' },
      { label: 'Vata — Wind / Air', icon: '💨', handPose: 'Hands fluttering — air movement gesture' },
      { label: 'Pitta — Fire', icon: '🔥', handPose: 'Rubbing palms together — heat gesture' },
      { label: 'Kapha — Water / Earth', icon: '💧', handPose: 'Flowing water hand motion downward' },
    ],
    glossLine: 'PRAKRITI → VATA? → PITTA? → KAPHA? → SELECT',
    contextLabel: 'Dashavidha Pariksha',
    contextColor: 'text-amber-400 border-amber-500/40',
  },
  DOC_SCAN: {
    gestures: [
      { label: 'Place document here', icon: '📄', handPose: 'Two hands flat, placing motion on surface' },
      { label: 'Camera scans it', icon: '📷', handPose: 'Frame fingers like a camera lens' },
      { label: 'AI reads the paper', icon: '🤖', handPose: 'Index finger reading motion left to right' },
      { label: 'All medicines noted', icon: '💊', handPose: 'Pinch fingers — pill gesture' },
    ],
    glossLine: 'PAPER → PLACE-HERE → SCAN → MEDICINES-NOTED',
    contextLabel: 'Document Digitization',
    contextColor: 'text-cyan-400 border-cyan-500/40',
  },
  SESSION_PURGE: {
    gestures: [
      { label: 'Data deleted', icon: '🗑️', handPose: 'Sweep motion off table — erasing gesture' },
      { label: 'Safe & protected', icon: '🔐', handPose: 'Fist closed at chest — lock gesture' },
      { label: 'Sent to doctor', icon: '📤', handPose: 'Open palm pushing away — sending gesture' },
      { label: 'Your token ready', icon: '🎫', handPose: 'Hold up a slip / card gesture' },
    ],
    glossLine: 'DATA-DELETE → SAFE → DOCTOR-RECEIVED → TOKEN-READY',
    contextLabel: 'Privacy Confirmation',
    contextColor: 'text-emerald-400 border-emerald-500/40',
  },
};

export const SignLanguageAvatar: React.FC<SignLanguageAvatarProps> = ({
  currentPromptText,
  currentStep,
  opdType: _opdType,
  isOpen,
  onClose,
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setAnimationFrame(0);
    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 1800);
    return () => clearInterval(interval);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const islData = STEP_ISL_MAP[currentStep] || {
    gestures: [
      { label: 'Welcome / Namaste (नमस्ते)', icon: '🙏', handPose: 'Hands joined at chest level' },
      { label: 'Listening & Understanding', icon: '👂', handPose: 'Pointing towards ear and chest' },
      { label: 'Please Select Option', icon: '👉', handPose: 'Open palm gesturing towards screen' },
      { label: 'Health & Well-being', icon: '❤️', handPose: 'Gentle circular motion over heart' },
    ],
    glossLine: 'WELCOME → LISTEN → SELECT → HEALTH',
    contextLabel: 'MediKiosk+ Assistant',
    contextColor: 'text-cyan-400 border-cyan-500/40',
  };

  const currentGesture = islData.gestures[animationFrame] || islData.gestures[0];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-3xl bg-[#0e121a]/95 border-2 border-cyan-500/50 shadow-2xl p-4 text-white backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1b2334]">
        <div className="flex items-center gap-2 text-cyan-400">
          <Hand className="w-5 h-5 animate-bounce" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">ISL Avatar Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#161c28] transition"
          aria-label="Close avatar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Context badge */}
      <div className={`mt-2 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider ${islData.contextColor} bg-[#06080d] inline-block`}>
        {islData.contextLabel}
      </div>

      {/* Animated Avatar */}
      <div className="mt-3 flex flex-col items-center">
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-[#09222c] via-[#0e121a] to-[#161c28] flex items-center justify-center border-2 border-cyan-400/40 shadow-inner">
          <div className="text-5xl select-none animate-pulse">
            {currentGesture.icon}
          </div>
          <div className="absolute -bottom-1 px-2.5 py-0.5 rounded-full bg-cyan-400 text-[10px] font-mono font-black text-slate-950 shadow">
            SIGNING
          </div>
        </div>

        {/* Gesture description */}
        <div className="mt-3 text-center">
          <p className="text-xs font-bold text-cyan-300">{currentGesture.label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 italic">"{currentGesture.handPose}"</p>
        </div>

        {/* ISL Gloss line */}
        <div className="mt-3 w-full p-2.5 rounded-2xl bg-[#06080d] border border-cyan-500/30">
          <p className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">ISL Gloss:</p>
          <p className="text-[11px] text-cyan-200 font-mono">{islData.glossLine}</p>
        </div>

        {/* Current narration */}
        <div className="mt-2 w-full p-2.5 rounded-2xl bg-[#06080d] border border-[#1b2334] text-[11px] text-slate-200 line-clamp-2">
          <span className="text-slate-400 font-bold font-mono">Narration: </span>
          {currentPromptText || 'Welcome! MediKiosk is ready to assist you in Indian Sign Language.'}
        </div>

        {/* Frame dots */}
        <div className="flex gap-1.5 mt-3">
          {islData.gestures.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === animationFrame ? 'w-5 bg-cyan-400' : 'w-1.5 bg-[#1b2334]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
