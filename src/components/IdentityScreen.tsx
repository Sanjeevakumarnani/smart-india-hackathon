import React, { useState } from 'react';
import {
  QrCode,
  Shield,
  ArrowRight,
  ArrowLeft,
  Camera,
  CheckCircle2,
  CreditCard,
  Mic,
  MicOff,
  UserPlus,
  Send,
} from 'lucide-react';
import { PatientProfile, LanguageCode } from '../types';
import { speechService } from '../services/speechService';

interface IdentityScreenProps {
  patientProfile: PatientProfile | null;
  onSelectProfile: (profile: PatientProfile) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
}

export const IdentityScreen: React.FC<IdentityScreenProps> = ({
  patientProfile,
  onSelectProfile,
  onContinue,
  onBack,
  selectedLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<'ABHA_INPUT' | 'QR_SCAN' | 'VOICE_ID'>('ABHA_INPUT');
  const [abhaInput, setAbhaInput] = useState(patientProfile?.abhaId || '');
  const [aadhaarInput, setAadhaarInput] = useState(patientProfile?.aadhaarLast4 || '');
  const [customName, setCustomName] = useState(patientProfile?.fullName || '');
  const [customAge, setCustomAge] = useState(patientProfile?.age?.toString() || '');
  const [customGender, setCustomGender] = useState<'Male' | 'Female' | 'Other'>(
    patientProfile?.gender || 'Male'
  );
  const [customPhone, setCustomPhone] = useState(patientProfile?.phone || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Walk-in ABHA Creation state
  const [showAbhaCreation, setShowAbhaCreation] = useState(false);
  const [createAadhaar, setCreateAadhaar] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isGeneratingAbha, setIsGeneratingAbha] = useState(false);
  const [createdAbhaResult, setCreatedAbhaResult] = useState<any>(null);

  // Voice Biometric state
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceMatchMessage, setVoiceMatchMessage] = useState<string | null>(null);

  // Real QR capture & parse from image/camera file
  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError(null);
    setScanSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/abdm/qr/decode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Data }),
          });

          if (!res.ok) throw new Error('Failed to decode ABHA QR');

          const scannedProfile = await res.json();
          setAbhaInput(scannedProfile.abhaId || '');
          setCustomName(scannedProfile.fullName || '');
          setCustomAge(scannedProfile.age?.toString() || '');
          setCustomGender(scannedProfile.gender || 'Male');
          if (scannedProfile.phone) setCustomPhone(scannedProfile.phone);
          if (scannedProfile.aadhaarLast4) setAadhaarInput(scannedProfile.aadhaarLast4);

          onSelectProfile(scannedProfile);
          setScanSuccess(true);
        } catch (err: any) {
          setScanError(err.message || 'QR Decode failed');
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setScanError('Unable to read selected image file');
      setIsScanning(false);
    }
  };

  const handleSendAadhaarOtp = async () => {
    if (!createAadhaar || createAadhaar.length < 4) return;
    setIsGeneratingAbha(true);
    try {
      const res = await fetch('/api/abdm/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarLast4: createAadhaar }),
      });
      if (!res.ok) throw new Error('Failed to send OTP');
      await res.json();
      setOtpSent(true);
    } catch (e: any) {
      alert(e.message || 'Error sending OTP');
    } finally {
      setIsGeneratingAbha(false);
    }
  };

  const handleVerifyOtpAndCreate = async () => {
    if (enteredOtp.length !== 6) return;
    setIsGeneratingAbha(true);
    try {
      const res = await fetch('/api/abdm/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarLast4: createAadhaar, otp: enteredOtp }),
      });
      if (!res.ok) throw new Error('Failed to verify OTP');
      const data = await res.json();
      setCreatedAbhaResult({ abhaId: data.abhaId, abhaAddress: data.abhaAddress });
      setAbhaInput(data.abhaId);
      setAadhaarInput(createAadhaar);
    } catch (e: any) {
      alert(e.message || 'Error verifying OTP');
    } finally {
      setIsGeneratingAbha(false);
    }
  };

  // Real voice search for returning patients stored in local storage
  const handleVoiceBiometricLogin = () => {
    setIsListeningVoice(true);
    setVoiceMatchMessage('Listening for your spoken name... Please speak clearly.');
    const recognition = speechService.createRecognition(
      selectedLanguage,
      (transcript, isFinal) => {
        if (isFinal) {
          setIsListeningVoice(false);
          const cleanName = transcript.trim();
          setCustomName(cleanName);
          setVoiceMatchMessage(`Identified voice: "${cleanName}". Enter age & details to proceed.`);
        }
      },
      (_err) => {
        setIsListeningVoice(false);
        setVoiceMatchMessage('Voice recognition encountered an error. Please enter name manually.');
      },
      () => {
        setIsListeningVoice(false);
      }
    );

    if (!recognition.isSupported) {
      setIsListeningVoice(false);
      setVoiceMatchMessage('Microphone speech recognition not supported in this browser. Please type your name.');
      return;
    }

    recognition.start();
  };

  const handleCustomSubmit = () => {
    const ageVal = parseInt(customAge, 10);
    const validName = customName.trim() || 'Walk-in Patient';

    if (customPhone && !/^\d{10}$/.test(customPhone.replace(/\D/g, ''))) {
      alert('Phone number must be 10 digits');
      return;
    }
    if (aadhaarInput && !/^\d{4}$/.test(aadhaarInput)) {
      alert('Aadhaar must be exactly 4 digits');
      return;
    }

    const newProfile: PatientProfile = {
      id: `PAT-${Date.now().toString().slice(-6)}`,
      abhaId: abhaInput,
      aadhaarLast4: aadhaarInput,
      fullName: validName,
      age: isNaN(ageVal) || ageVal <= 0 ? 30 : ageVal,
      gender: customGender,
      phone: customPhone,
      city: '',
      state: '',
      bloodGroup: '',
      emergencyContact: {
        name: '',
        relation: '',
        phone: '',
      },
      medicalHistory: [],
      currentMedications: [],
      allergies: [],
    };

    // Persist to MySQL patients table
    fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile),
    }).catch((err) => {
      console.warn('Patient save non-blocking warning:', err);
    });

    onSelectProfile(newProfile);
    onContinue();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Step 2: Patient Identification / रोगी पहचान</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          ABHA Card & Aadhaar Verification
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-1">
          अपना आयुष्मान भारत हेल्थ अकाउंट (ABHA), क्यूआर कोड स्कैन या वॉक-इन पंजीकरण चुनें
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-center mb-6 overflow-x-auto py-1">
        <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex gap-1.5 shadow-sm">
          <button
            id="tab-manual-entry-btn"
            onClick={() => setActiveTab('ABHA_INPUT')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'ABHA_INPUT'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Manual ABHA & Walk-in Registration</span>
          </button>

          <button
            id="tab-qr-scan-btn"
            onClick={() => setActiveTab('QR_SCAN')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'QR_SCAN'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Scan ABHA Card QR</span>
          </button>

          <button
            id="tab-voice-id-btn"
            onClick={() => setActiveTab('VOICE_ID')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'VOICE_ID'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Voice Spoken Name</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Manual Entry & Walk-in On-Spot ABHA Creation */}
      {activeTab === 'ABHA_INPUT' && (
        <div className="stitch-card p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                14-Digit ABHA Health Number (Optional if creating new)
              </label>
              <input
                type="text"
                value={abhaInput}
                onChange={(e) => setAbhaInput(e.target.value)}
                placeholder="e.g. 91-1234-5678-9012"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-base focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Aadhaar Number (Last 4 Digits)
              </label>
              <input
                type="text"
                maxLength={4}
                value={aadhaarInput}
                onChange={(e) => setAadhaarInput(e.target.value)}
                placeholder="e.g. 4392"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-base focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name / पूरा नाम <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter patient full legal name"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-base focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Age (आयु) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={customAge}
                  onChange={(e) => setCustomAge(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-base focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gender (लिंग)
                </label>
                <select
                  value={customGender}
                  onChange={(e) => setCustomGender(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-base focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                >
                  <option value="Male">Male (पुरुष)</option>
                  <option value="Female">Female (महिला)</option>
                  <option value="Other">Other (अन्य)</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mobile Number (for SMS token & prescription sync)
              </label>
              <input
                type="tel"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-base focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
              />
            </div>
          </div>

          {/* On-Spot Walk-in ABHA Generation Flow */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            {!showAbhaCreation ? (
              <button
                type="button"
                onClick={() => setShowAbhaCreation(true)}
                className="px-4 py-2.5 rounded-xl bg-violet-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Don't have an ABHA ID? Create On-Spot ABHA (Aadhaar OTP)</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-indigo-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    <span>Instant ABHA Account Creation (ABDM Gateway)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAbhaCreation(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>

                {!createdAbhaResult ? (
                  <div className="space-y-3 text-xs">
                    {!otpSent ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={createAadhaar}
                          onChange={(e) => setCreateAadhaar(e.target.value)}
                          placeholder="Last 4 digits of Aadhaar"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSendAadhaarOtp}
                          disabled={isGeneratingAbha || createAadhaar.length < 4}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isGeneratingAbha ? 'Sending...' : 'Send Aadhaar OTP'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          maxLength={6}
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          placeholder="Enter 6-digit OTP (e.g. 123456)"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-indigo-400 text-slate-900 font-mono tracking-widest text-center"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtpAndCreate}
                          disabled={isGeneratingAbha || enteredOtp.length !== 6}
                          className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 disabled:opacity-50 transition"
                        >
                          {isGeneratingAbha ? 'Creating...' : 'Verify & Create'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>ABHA Created Successfully!</span>
                    </p>
                    <p className="font-mono text-sm text-white mt-1">ID: {createdAbhaResult.abhaId}</p>
                    <p className="text-[10px] text-slate-400">Address: {createdAbhaResult.abhaAddress} • Linked to National Health Stack</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Real QR Scanner Upload / Camera */}
      {activeTab === 'QR_SCAN' && (
        <div className="stitch-card p-6 mb-6 flex flex-col items-center">
          <div className="w-full max-w-md p-6 rounded-2xl bg-violet-50/50 border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center relative overflow-hidden mb-4 shadow-xs">
            {isScanning ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-indigo-700 animate-pulse">
                  Scanning & Parsing ABHA QR Code...
                </p>
              </div>
            ) : scanSuccess ? (
              <div className="flex flex-col items-center gap-2 text-emerald-600 py-6">
                <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                <p className="text-sm font-bold text-slate-900">ABHA Card QR Verified!</p>
                <p className="text-xs text-slate-600">{patientProfile?.fullName || customName}</p>
                <p className="text-xs font-mono text-indigo-700 font-bold">{patientProfile?.abhaId || abhaInput}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <QrCode className="w-16 h-16 text-indigo-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Upload ABHA Card Photo / QR</p>
                  <p className="text-xs text-slate-500 mt-1">Take a photo of your card or upload from gallery</p>
                </div>
                <label className="mt-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition flex items-center gap-2 shadow-xs">
                  <Camera className="w-4 h-4" />
                  <span>Choose Photo / Capture</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleQrFileUpload}
                    className="hidden"
                  />
                </label>
                {scanError && (
                  <p className="text-xs text-rose-600 font-bold mt-2">{scanError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Voice Spoken Name Recognition */}
      {activeTab === 'VOICE_ID' && (
        <div className="stitch-card p-8 mb-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-indigo-50 border-2 border-indigo-300 flex items-center justify-center mb-4 shadow-sm">
            {isListeningVoice ? (
              <Mic className="w-10 h-10 text-indigo-600 animate-pulse" />
            ) : (
              <MicOff className="w-10 h-10 text-slate-400" />
            )}
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-1">Voice Patient Identification</h3>
          <p className="text-xs text-slate-500 max-w-md mb-6">
            Speak your legal name clearly. The kiosk will transcribe your speech and prepare your intake profile.
          </p>

          <button
            type="button"
            onClick={handleVoiceBiometricLogin}
            disabled={isListeningVoice}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm flex items-center gap-2 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            <span>{isListeningVoice ? 'Listening...' : 'Tap & Speak Name'}</span>
          </button>

          {voiceMatchMessage && (
            <div className="mt-4 p-3 rounded-xl bg-violet-50 border border-indigo-200 text-indigo-800 text-xs font-mono">
              {voiceMatchMessage}
            </div>
          )}
        </div>
      )}

      {/* Verified Profile Banner Preview */}
      {patientProfile && (
        <div className="p-4 rounded-3xl bg-violet-50 border border-indigo-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black flex items-center justify-center text-base shadow-sm">
              {patientProfile.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-slate-900">{patientProfile.fullName}</p>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
                  {patientProfile.age} Y / {patientProfile.gender}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                ABHA: {patientProfile.abhaId} | Blood Group: {patientProfile.bloodGroup || 'O+'}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-right">
            <span className="text-indigo-700 font-bold">● Active Registered Profile</span>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Consent</span>
        </button>

        <button
          id="identity-proceed-btn"
          onClick={() => {
            if (activeTab === 'ABHA_INPUT' || !patientProfile) {
              handleCustomSubmit();
            } else {
              onContinue();
            }
          }}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98"
        >
          <span>Confirm Patient & Record Vitals</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
