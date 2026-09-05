import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { PatientProfile } from '../types';

export const PatientPortalAuth: React.FC<{
  onAuthSuccess: (patient: PatientProfile) => void;
  onBackToKiosk: () => void;
}> = ({ onAuthSuccess, onBackToKiosk }) => {
  const [loginMethod, setLoginMethod] = useState<'ABHA' | 'AADHAAR' | 'PHONE'>('ABHA');
  const [inputValue, setInputValue] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setAuthError(`Please enter your ${loginMethod}.`);
      return;
    }

    if (loginMethod === 'ABHA' && !/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(trimmed)) {
      setAuthError('ABHA must be in the format XX-XXXX-XXXX-XXXX');
      return;
    }
    if (loginMethod === 'AADHAAR' && !/^\d{4}$/.test(trimmed)) {
      setAuthError('Please enter the last 4 digits of Aadhaar');
      return;
    }
    if (loginMethod === 'PHONE' && !/^\d{10}$/.test(trimmed)) {
      setAuthError('Phone must be 10 digits');
      return;
    }

    try {
      const response = await fetch(`/api/patients/search?query=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      const matchedPatient = Array.isArray(data) ? data[0] : (data.patients?.[0] || data);

      if (matchedPatient && matchedPatient.id) {
        onAuthSuccess(matchedPatient);
      } else {
        setAuthError('No patient found. Please register as a new patient.');
      }
    } catch (e) {
      setAuthError('No patient found or search failed. Please register as a new patient.');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-12 flex flex-col items-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 shadow-sm border border-amber-200">
        <ShieldCheck className="w-8 h-8" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 text-center">
        Secure Patient Portal
      </h2>
      <p className="text-sm text-slate-500 mb-8 text-center max-w-md">
        Access your chronological medical timeline, lab reports, and historic OP visit summaries.
      </p>

      <div className="w-full stitch-card p-6 shadow-md">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mb-6">
          {(['ABHA', 'AADHAAR', 'PHONE'] as const).map((method) => (
            <button
              key={method}
              onClick={() => {
                setLoginMethod(method);
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-mono font-bold rounded-xl transition-all ${
                loginMethod === method
                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-xs font-mono font-bold text-slate-600 mb-2 uppercase">
            {loginMethod === 'ABHA' ? 'ABHA Health ID' : loginMethod === 'AADHAAR' ? 'Aadhaar Number (Last 4 digits or 12 digits)' : 'Registered Mobile Number'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setAuthError(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500 transition-all focus:ring-2 focus:ring-indigo-500/20"
              placeholder={loginMethod === 'ABHA' ? 'e.g. 91-1234-5678-9012' : loginMethod === 'AADHAAR' ? 'e.g. 4392' : 'e.g. +91 98765 43210'}
            />
          </div>
          {authError && (
            <p className="text-xs text-rose-600 mt-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{authError}</span>
            </p>
          )}
        </div>

        <button
          onClick={handleLogin}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-98 mb-4"
        >
          <span>Authenticate & Access Records</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <p className="text-[10px] text-center text-slate-400 font-mono">
          Secured by ABDM Framework & DPDP Act 2023 Compliance
        </p>
      </div>

      <button
        onClick={onBackToKiosk}
        className="mt-8 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-mono font-bold text-slate-600 border border-slate-200 flex items-center gap-2 transition shadow-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Kiosk Mode</span>
      </button>
    </div>
  );
};
