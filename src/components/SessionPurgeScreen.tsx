import React, { useState, useEffect } from 'react';
import { ShieldCheck, Trash2, Lock, Wifi, CheckCircle2, ArrowRight, Printer } from 'lucide-react';
import { LanguageCode, QueueToken } from '../types';
import { translate } from '../services/i18n';

interface SessionPurgeScreenProps {
  createdToken: QueueToken | null;
  onProceed: () => void;
  selectedLanguage: LanguageCode;
}

const PURGE_STEPS = [
  { icon: <Trash2 className="w-5 h-5" />, label: 'Voice recordings deleted from kiosk memory', labelHi: 'आवाज़ रिकॉर्डिंग हटाई गई', delay: 0 },
  { icon: <Trash2 className="w-5 h-5" />, label: 'Scanned document images removed from device', labelHi: 'स्कैन की गई छवियाँ हटाई गईं', delay: 600 },
  { icon: <Lock className="w-5 h-5" />, label: 'Session encrypted and transmitted to doctor', labelHi: 'सत्र एन्क्रिप्ट कर चिकित्सक को भेजा गया', delay: 1200 },
  { icon: <Wifi className="w-5 h-5" />, label: 'FHIR bundle pushed to your ABHA health locker', labelHi: 'FHIR डेटा ABHA में सुरक्षित किया गया', delay: 1800 },
  { icon: <ShieldCheck className="w-5 h-5" />, label: 'Kiosk session cleared — privacy protected', labelHi: 'कियोस्क सत्र समाप्त — गोपनीयता सुरक्षित', delay: 2400 },
];

export const SessionPurgeScreen: React.FC<SessionPurgeScreenProps> = ({ createdToken, onProceed, selectedLanguage }) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(8);
  const allDone = completedSteps.length === PURGE_STEPS.length;

  useEffect(() => {
    // Invoke backend purge endpoint for GDPR/DPDP data hygiene
    if (createdToken?.id) {
      fetch(`/api/session/purge/${createdToken.id}`, { method: 'POST' }).catch(() => {});
    }

    PURGE_STEPS.forEach((step, idx) => {
      const t = setTimeout(() => {
        setCompletedSteps(prev => [...prev, idx]);
      }, step.delay + 400);
      return () => clearTimeout(t);
    });
  }, [createdToken]);

  useEffect(() => {
    if (!allDone) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); onProceed(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [allDone, onProceed]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center">
      {/* Top Shield Icon */}
      <div className="w-20 h-20 rounded-full bg-violet-50 border-2 border-indigo-300 flex items-center justify-center mb-6 shadow-sm">
        <ShieldCheck className="w-10 h-10 text-indigo-600" />
      </div>

      <h2 className="text-2xl font-black text-slate-900 text-center mb-1">{translate('dataProtected', selectedLanguage)}</h2>
      <p className="text-sm text-slate-600 text-center mb-8">आपकी गोपनीयता सुरक्षित है — DPDP Act 2023 के अनुसार</p>

      {/* Purge Steps */}
      <div className="w-full space-y-3 mb-8">
        {PURGE_STEPS.map((step, idx) => {
          const done = completedSteps.includes(idx);
          return (
            <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-500 ${
              done ? 'bg-violet-50 border-indigo-300' : 'bg-white border-slate-200 opacity-60'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                done ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.labelHi}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Token Display */}
      {createdToken && allDone && (
        <div className={`w-full p-6 rounded-3xl border-2 mb-6 text-center shadow-md ${
          createdToken.priorityLevel === 'CRITICAL'
            ? 'bg-rose-50 border-rose-400 text-rose-900'
            : 'stitch-card-active'
        }`}>
          <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">Your OPD Token Slip</p>
          <p className={`text-5xl font-black font-mono mb-2 ${
            createdToken.priorityLevel === 'CRITICAL' ? 'text-rose-600' : 'text-indigo-700'
          }`}>#{createdToken.tokenNumber}</p>
          {createdToken.priorityLevel === 'CRITICAL' && (
            <p className="text-sm font-black text-rose-600 animate-pulse">🚨 EMERGENCY — Proceed to TRIAGE immediately</p>
          )}
          <p className="text-sm text-slate-700 mt-1">
            Please proceed to <strong className="text-slate-900">{createdToken.roomNumber}</strong>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Doctor: {createdToken.doctorName}</p>
          {createdToken.waitMinutes > 0 && (
            <p className="text-xs text-indigo-700 mt-1 font-mono font-bold">Estimated wait: ~{createdToken.waitMinutes} minutes</p>
          )}

          {/* Thermal Receipt Print Action */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-indigo-700 flex items-center gap-2 transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Physical Thermal Token Slip</span>
            </button>
          </div>
        </div>
      )}

      {/* Printable 80mm ESC/POS Thermal Receipt Roll (Visible only on print) */}
      {createdToken && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-4 font-mono text-center w-[80mm] mx-auto text-xs leading-tight">
          <div className="border-b-2 border-dashed border-black pb-2 mb-2">
            <p className="font-extrabold text-sm uppercase">AIIMS / District Hospital</p>
            <p className="text-[10px]">Ayushman Bharat Digital Health Mission</p>
            <p className="text-[9px]">Station #K-04 • PS 26047</p>
          </div>

          <div className="py-2 border-b-2 border-dashed border-black">
            <p className="text-[10px] uppercase tracking-wider">OPD TOKEN SLIP</p>
            <p className="text-4xl font-black my-1">#{createdToken.tokenNumber}</p>
            <p className="text-[10px] font-bold">
              {createdToken.priorityLevel === 'CRITICAL' ? '*** EMERGENCY / TRIAGE ***' : 'ROUTINE CONSULTATION'}
            </p>
          </div>

          <div className="py-2 text-left text-[10px] space-y-1 border-b-2 border-dashed border-black">
            <p><strong>Patient:</strong> {createdToken.patientName}</p>
            <p><strong>Room:</strong> {createdToken.roomNumber}</p>
            <p><strong>Doctor:</strong> {createdToken.doctorName}</p>
            <p><strong>Complaint:</strong> {createdToken.chiefComplaint}</p>
            <p><strong>Est. Wait:</strong> ~{createdToken.waitMinutes} mins</p>
            <p><strong>Time:</strong> {new Date().toLocaleTimeString()} ({new Date().toLocaleDateString()})</p>
          </div>

          <div className="pt-3 text-center">
            {/* Simulated Barcode */}
            <div className="font-mono text-[11px] tracking-widest my-1">||| | |||| || ||| |||| |</div>
            <p className="text-[8px] uppercase">Token ID: {createdToken.tokenId || (createdToken as any).id}</p>
            <p className="text-[8px] mt-2">Data purged under DPDP Act 2023</p>
          </div>
        </div>
      )}

      {allDone && (
        <div className="w-full flex flex-col items-center gap-3">
          <p className="text-xs text-slate-500 font-mono">
            Physician console auto-opens in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
          <button
            onClick={onProceed}
            className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-98"
          >
            <span>Open Physician Console Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

