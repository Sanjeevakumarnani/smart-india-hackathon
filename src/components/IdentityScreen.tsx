/**
 * @file IdentityScreen.tsx
 * @description Step 2 — Patient Identification & Registration
 *
 * Implements three ABDM v3 authentication paths:
 *   PATH 1 — ABHA ID or QR Code scan
 *   PATH 2 — Aadhaar OTP (ABDM two-step state machine)
 *   PATH 3 — Mobile Number OTP with demographic fallback
 *
 * Design principles:
 *  - No `alert()` calls — all errors surface as inline banners
 *  - Animated panel transitions using the `motion` package
 *  - Two-column layout on desktop, single-column on mobile
 *  - OTP countdown timer with "Resend" action
 *  - Stage-based mobile flow: phone → OTP → (optional) demographics
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Phone,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Fingerprint,
  User,
  Upload,
  Loader2,
  Link2,
  ExternalLink,
  Sparkles,
  X,
  HeartPulse,
} from 'lucide-react';
import { PatientProfile, LanguageCode } from '../types';
import { speechService } from '../services/speechService';
import { translate } from '../services/i18n';

// ─────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────

const OTP_COUNTDOWN_SECONDS = 30;

function formatAbhaNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits.replace(
    /(\d{2})(\d{0,4})(\d{0,4})(\d{0,4})/,
    (_m, a, b, c, d) => [a, b, c, d].filter(Boolean).join('-')
  );
}

/** Maps a raw API patient record to a typed PatientProfile. */
function toPatientProfile(patient: any, fallback: Partial<PatientProfile> = {}): PatientProfile {
  return {
    id: patient.id || fallback.id || `PAT-${Date.now().toString().slice(-6)}`,
    abhaId: patient.abhaId || patient.abha_id || fallback.abhaId || '',
    abhaAddress: patient.abhaAddress || patient.abha_address || fallback.abhaAddress || '',
    aadhaarNumber: patient.aadhaarNumber || patient.aadhaar_number || fallback.aadhaarNumber || '',
    aadhaarLast4: patient.aadhaarLast4 || patient.aadhaar_last4 || fallback.aadhaarLast4 || '',
    fullName: patient.fullName || patient.full_name || fallback.fullName || 'Walk-in Patient',
    age: Number(patient.age ?? fallback.age ?? 30),
    gender: (patient.gender || fallback.gender || 'Other') as 'Male' | 'Female' | 'Other',
    phone: patient.phone || fallback.phone || '',
    city: patient.city || fallback.city || '',
    state: patient.state || fallback.state || '',
    bloodGroup: patient.bloodGroup || patient.blood_group || fallback.bloodGroup || '',
    emergencyContact: fallback.emergencyContact || { name: '', relation: '', phone: '' },
    medicalHistory: fallback.medicalHistory || [],
    currentMedications: fallback.currentMedications || [],
    allergies: fallback.allergies || [],
  };
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Inline dismissable error banner — replaces all alert() calls. */
const ErrorBanner: React.FC<{ message: string | null; onDismiss?: () => void }> = ({
  message,
  onDismiss,
}) => {
  if (!message) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm"
      >
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
        <p className="flex-1 font-medium leading-snug">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-600 font-bold text-xs shrink-0"
          >
            ✕
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/** Inline success / info message. */
const InfoBanner: React.FC<{ message: string | null; variant?: 'success' | 'info' }> = ({
  message,
  variant = 'info',
}) => {
  if (!message) return null;
  const colours =
    variant === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-indigo-50 border-indigo-200 text-indigo-800';
  const Icon = variant === 'success' ? CheckCircle2 : Shield;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-sm font-medium ${colours}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
};

/** OTP countdown timer with resend action. */
const OtpTimer: React.FC<{ onResend: () => void; isResending: boolean }> = ({
  onResend,
  isResending,
}) => {
  const [seconds, setSeconds] = useState(OTP_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {seconds > 0 ? (
        <span>
          Resend OTP in{' '}
          <span className="font-bold text-indigo-600 tabular-nums">{seconds}s</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSeconds(OTP_COUNTDOWN_SECONDS);
            onResend();
          }}
          disabled={isResending}
          className="flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-800 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
          Resend OTP
        </button>
      )}
    </div>
  );
};

/** Labelled form field wrapper with optional inline error. */
const Field: React.FC<{
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, error, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

const inputClass =
  'w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
  'transition placeholder:text-slate-400 shadow-sm';

const selectClass =
  'w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition shadow-sm';

// ─────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────

type TabId = 'ABHA' | 'AADHAAR' | 'MOBILE';

const TABS: { id: TabId; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    id: 'ABHA',
    label: 'ABHA & QR Scan',
    sublabel: 'ID number or scan card',
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    id: 'AADHAAR',
    label: 'Aadhaar OTP',
    sublabel: 'ABDM enrolment',
    icon: <Fingerprint className="w-5 h-5" />,
  },
  {
    id: 'MOBILE',
    label: 'Mobile OTP',
    sublabel: 'PHR login',
    icon: <Phone className="w-5 h-5" />,
  },
];

// ─────────────────────────────────────────────
// Component props
// ─────────────────────────────────────────────

interface IdentityScreenProps {
  patientProfile: PatientProfile | null;
  onSelectProfile: (profile: PatientProfile) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export const IdentityScreen: React.FC<IdentityScreenProps> = ({
  patientProfile,
  onSelectProfile,
  onContinue,
  onBack,
  selectedLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('ABHA');

  // ── Shared form state ──────────────────────
  const [abhaInput, setAbhaInput] = useState(formatAbhaNumber(patientProfile?.abhaId || ''));
  const [aadhaarInput, setAadhaarInput] = useState(patientProfile?.aadhaarNumber || '');
  const [customName, setCustomName] = useState(patientProfile?.fullName || '');
  const [customAge, setCustomAge] = useState(patientProfile?.age?.toString() || '');
  const [customGender, setCustomGender] = useState<'Male' | 'Female' | 'Other'>(
    patientProfile?.gender || 'Male'
  );
  const [customPhone, setCustomPhone] = useState(patientProfile?.phone || '');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── ABHA Lookup state ──────────────────────
  const [isAbhaLoading, setIsAbhaLoading] = useState(false);
  const [abhaWelcomeName, setAbhaWelcomeName] = useState<string | null>(null);
  const [abhaNotFound, setAbhaNotFound] = useState<boolean>(false);
  const [searchedAbha, setSearchedAbha] = useState<string>('');

  // ── QR scanner state (only uses camera if clicked) ──
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // ── Aadhaar OTP state ─────────────────────
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarTxnId, setAadhaarTxnId] = useState('');
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [isAadhaarLoading, setIsAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [aadhaarSuccess, setAadhaarSuccess] = useState<string | null>(null);

  // ── Mobile OTP state — 3 stages ───────────
  type MobileStage = 'PHONE_INPUT' | 'OTP_VERIFY' | 'DEMOGRAPHICS';
  const [mobileStage, setMobileStage] = useState<MobileStage>('PHONE_INPUT');
  const [mobileInput, setMobileInput] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileTxnId, setMobileTxnId] = useState('');
  const [isMobileLoading, setIsMobileLoading] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [mobileInfo, setMobileInfo] = useState<string | null>(null);
  // Demographics collected in stage 3 (REGISTRATION_REQUIRED)
  const [mobileFirstName, setMobileFirstName] = useState('');
  const [mobileLastName, setMobileLastName] = useState('');
  const [mobileAge, setMobileAge] = useState('');
  const [mobileSex, setMobileSex] = useState<'Male' | 'Female' | 'Other'>('Male');

  // ── Voice state ────────────────────────────
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);



  // ── Walk-in ABHA creation ──────────────────
  const [showAbhaCreation, setShowAbhaCreation] = useState(false);
  const [createAadhaar, setCreateAadhaar] = useState('');
  const [createOtpSent, setCreateOtpSent] = useState(false);
  const [createOtp, setCreateOtp] = useState('');
  const [createTxnId, setCreateTxnId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdAbha, setCreatedAbha] = useState<{ abhaId: string; abhaAddress: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Core API helper
  // ─────────────────────────────────────────────

  const verifyAndRegisterRequest = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/patient/verify-and-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 202) {
      const msg = result.error || 'Patient verification failed';
      if (response.status === 410) throw new Error('OTP has expired — please request a new one.');
      if (response.status === 504) throw new Error('Request timed out — please check your connection and retry.');
      throw new Error(msg);
    }
    return result;
  };

  // ─────────────────────────────────────────────
  // QR camera helpers
  // ─────────────────────────────────────────────

  const stopQrCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setIsCameraReady(false);
  }, []);

  const startQrCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError('Camera is not supported — use the photo upload option instead.');
      return;
    }
    stopQrCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraReady(true);
      setScanError(null);
    } catch {
      setScanError('Camera permission denied — use the photo upload option instead.');
      setShowCamera(false);
    }
  }, [stopQrCamera]);

  useEffect(() => {
    if (showCamera) {
      void startQrCamera();
    } else {
      stopQrCamera();
    }
    return stopQrCamera;
  }, [showCamera, startQrCamera, stopQrCamera]);

  const decodeAndRegister = async (imageBase64: string) => {
    setIsScanning(true);
    setScanError(null);
    setScanSuccess(false);
    try {
      const decodeRes = await fetch('/api/abdm/qr/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const decodeResult = await decodeRes.json().catch(() => ({}));
      if (!decodeRes.ok) throw new Error(decodeResult.error || 'QR decode failed');

      const scannedProfile = decodeResult.payload || decodeResult;
      const identifier =
        scannedProfile.abhaId || scannedProfile.abhaAddress || JSON.stringify(scannedProfile);

      const verification = await verifyAndRegisterRequest({
        path: 'abha',
        action: 'lookup',
        identifier,
        demographicPayload: scannedProfile,
      });
      if (verification.status === 'REGISTRATION_REQUIRED') {
        throw new Error('ABHA data verified but demographic details are incomplete. Use the ABHA tab to fill in missing fields.');
      }
      const profile = toPatientProfile(verification.patient, scannedProfile);
      onSelectProfile(profile);
      setAbhaInput(formatAbhaNumber(profile.abhaId));
      setCustomName(profile.fullName);
      setCustomAge(profile.age.toString());
      setCustomGender(profile.gender as 'Male' | 'Female' | 'Other');
      if (profile.phone) setCustomPhone(profile.phone);
      setScanSuccess(true);
      stopQrCamera();
    } catch (err: any) {
      setScanError(err.message || 'QR decode failed');
    } finally {
      setIsScanning(false);
    }
  };

  const captureQrFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    await decodeAndRegister(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await decodeAndRegister(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ─────────────────────────────────────────────
  // Aadhaar OTP handlers
  // ─────────────────────────────────────────────

  const handleSendAadhaarOtp = async () => {
    const clean = aadhaarInput.replace(/\D/g, '');
    if (clean.length !== 12) {
      setAadhaarError('Aadhaar number must be exactly 12 digits.');
      return;
    }
    setIsAadhaarLoading(true);
    setAadhaarError(null);
    try {
      const result = await verifyAndRegisterRequest({
        path: 'aadhaar',
        action: 'send_otp',
        identifier: clean,
      });
      setAadhaarTxnId(result.txnId || '');
      setAadhaarOtpSent(true);
      setAadhaarSuccess('OTP sent to your Aadhaar-linked mobile number.');
    } catch (e: any) {
      setAadhaarError(e.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsAadhaarLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (aadhaarOtp.length < 4) {
      setAadhaarError('Please enter the full OTP.');
      return;
    }
    setIsAadhaarLoading(true);
    setAadhaarError(null);
    try {
      const result = await verifyAndRegisterRequest({
        path: 'aadhaar',
        action: 'verify_otp',
        identifier: aadhaarInput.replace(/\D/g, ''),
        txnId: aadhaarTxnId,
        otp: aadhaarOtp,
        demographics: {
          fullName: customName || undefined,
          age: customAge ? Number(customAge) : undefined,
          gender: customGender,
          phone: customPhone || undefined,
        },
      });
      if (result.status === 'REGISTRATION_REQUIRED') {
        throw new Error(`Please provide: ${result.requiredFields?.join(', ')}`);
      }
      const profile = toPatientProfile(result.patient, { aadhaarNumber: aadhaarInput });
      onSelectProfile(profile);
      setCustomName(profile.fullName);
      setAbhaInput(formatAbhaNumber(profile.abhaId || ''));
      setAadhaarSuccess('Aadhaar verified — patient registered successfully!');
    } catch (e: any) {
      setAadhaarError(e.message || 'OTP verification failed.');
    } finally {
      setIsAadhaarLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Mobile OTP handlers
  // ─────────────────────────────────────────────

  const handleSendMobileOtp = async () => {
    const digits = mobileInput.replace(/\D/g, '').replace(/^91/, '');
    if (digits.length !== 10) {
      setMobileError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setIsMobileLoading(true);
    setMobileError(null);
    try {
      const result = await verifyAndRegisterRequest({
        path: 'mobile',
        action: 'send_otp',
        identifier: mobileInput,
      });
      setMobileTxnId(result.txnId || '');
      setMobileStage('OTP_VERIFY');
      setMobileInfo('OTP sent to your registered mobile number.');
    } catch (e: any) {
      setMobileError(e.message || 'Unable to send OTP. Please retry.');
    } finally {
      setIsMobileLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (mobileOtp.length < 4) {
      setMobileError('Please enter the complete OTP.');
      return;
    }
    setIsMobileLoading(true);
    setMobileError(null);
    setMobileInfo(null);
    try {
      const result = await verifyAndRegisterRequest({
        path: 'mobile',
        action: 'verify_otp',
        identifier: mobileInput,
        txnId: mobileTxnId,
        otp: mobileOtp,
      });
      if (result.status === 'REGISTRATION_REQUIRED') {
        // Patient not found — show demographic collection form
        setMobileStage('DEMOGRAPHICS');
        setMobileInfo('Mobile verified! Please provide your details to complete registration.');
        return;
      }
      const profile = toPatientProfile(result.patient, { phone: mobileInput });
      onSelectProfile(profile);
      setMobileInfo('Patient verified and logged in!');
      setTimeout(() => onContinue(), 800);
    } catch (e: any) {
      setMobileError(e.message || 'Mobile OTP verification failed.');
    } finally {
      setIsMobileLoading(false);
    }
  };

  const handleMobileRegister = async () => {
    if (!mobileFirstName.trim()) {
      setMobileError('First name is required.');
      return;
    }
    if (!mobileAge || Number(mobileAge) <= 0) {
      setMobileError('Please provide a valid age.');
      return;
    }
    setIsMobileLoading(true);
    setMobileError(null);
    try {
      const result = await verifyAndRegisterRequest({
        path: 'mobile',
        action: 'register',
        identifier: mobileInput,
        demographics: {
          firstName: mobileFirstName.trim(),
          lastName: mobileLastName.trim() || undefined,
          age: Number(mobileAge),
          gender: mobileSex,
          phone: mobileInput,
        },
      });
      const profile = toPatientProfile(result.patient, { phone: mobileInput });
      onSelectProfile(profile);
      setMobileInfo('Patient registered successfully!');
      setTimeout(() => onContinue(), 800);
    } catch (e: any) {
      setMobileError(e.message || 'Registration failed. Please retry.');
    } finally {
      setIsMobileLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Walk-in ABHA creation (Aadhaar OTP on-spot)
  // ─────────────────────────────────────────────

  const handleCreateAbhaSendOtp = async () => {
    if (createAadhaar.length !== 12) {
      setCreateError('Aadhaar must be exactly 12 digits.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await verifyAndRegisterRequest({
        path: 'aadhaar',
        action: 'send_otp',
        identifier: createAadhaar,
      });
      setCreateTxnId(result.txnId || '');
      setCreateOtpSent(true);
    } catch (e: any) {
      setCreateError(e.message || 'Error sending OTP.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateAbhaVerifyOtp = async () => {
    if (createOtp.length < 4) {
      setCreateError('Please enter the full OTP.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await verifyAndRegisterRequest({
        path: 'aadhaar',
        action: 'verify_otp',
        identifier: createAadhaar,
        txnId: createTxnId,
        otp: createOtp,
        demographics: {
          fullName: customName || undefined,
          age: customAge ? Number(customAge) : undefined,
          gender: customGender,
          phone: customPhone || undefined,
        },
      });
      if (result.status === 'REGISTRATION_REQUIRED') {
        throw new Error(`Please fill in: ${result.requiredFields?.join(', ')}`);
      }
      const profile = toPatientProfile(result.patient, { aadhaarNumber: createAadhaar });
      onSelectProfile(profile);
      setCreatedAbha({ abhaId: profile.abhaId, abhaAddress: profile.abhaAddress || '' });
      setAbhaInput(formatAbhaNumber(profile.abhaId));
      setAadhaarInput(createAadhaar);
      setCustomName(profile.fullName);
    } catch (e: any) {
      setCreateError(e.message || 'OTP verification failed.');
    } finally {
      setIsCreating(false);
    }
  };

  // ─────────────────────────────────────────────
  // Voice biometric (spoken name → transcript)
  // ─────────────────────────────────────────────

  const handleVoiceId = () => {
    setIsListeningVoice(true);
    setVoiceMessage(translate('voiceListening', selectedLanguage));
    const recognition = speechService.createRecognition(
      selectedLanguage,
      (transcript, isFinal) => {
        if (isFinal) {
          setIsListeningVoice(false);
          setCustomName(transcript.trim());
          setVoiceMessage(`Identified: "${transcript.trim()}" — fill in age and other fields, then proceed.`);
        }
      },
      () => {
        setIsListeningVoice(false);
        setVoiceMessage(translate('voiceError', selectedLanguage));
      },
      () => setIsListeningVoice(false)
    );
    if (!recognition.isSupported) {
      setIsListeningVoice(false);
      setVoiceMessage(translate('voiceError', selectedLanguage));
      return;
    }
    recognition.start();
  };

  // ─────────────────────────────────────────────
  // ABHA ID Lookup & Verification
  // ─────────────────────────────────────────────

  const handleAbhaLookup = async () => {
    const rawAbha = abhaInput.trim();
    if (!rawAbha) {
      setGlobalError('Please enter a valid 14-digit ABHA Number or ABHA Address (e.g. name@abdm).');
      return;
    }

    const digitsOnly = rawAbha.replace(/\D/g, '');
    const isAbhaNumber = digitsOnly.length === 14;
    const isAbhaAddress = rawAbha.includes('@');

    if (!isAbhaNumber && !isAbhaAddress) {
      setGlobalError('ABHA number must be 14 digits (XX-XXXX-XXXX-XXXX) or an ABHA address (name@abdm).');
      return;
    }

    setGlobalError(null);
    setIsAbhaLoading(true);
    setAbhaNotFound(false);
    setAbhaWelcomeName(null);
    setSearchedAbha(rawAbha);

    try {
      const result = await verifyAndRegisterRequest({
        path: 'abha',
        action: 'lookup',
        identifier: rawAbha,
      });

      if (result.status === 'VERIFIED' && result.patient) {
        const profile = toPatientProfile(result.patient);
        onSelectProfile(profile);
        setAbhaWelcomeName(profile.fullName);
        setAbhaNotFound(false);
      } else if (result.status === 'NOT_FOUND' || result.status === 'REGISTRATION_REQUIRED') {
        // Not present in local database
        setAbhaNotFound(true);
        setAbhaWelcomeName(null);
      } else {
        setAbhaNotFound(true);
        setAbhaWelcomeName(null);
      }
    } catch (error: any) {
      // If server returned 404/not found or similar, display the not-found fallback
      if (error?.message?.toLowerCase().includes('not found') || error?.message?.toLowerCase().includes('no patient')) {
        setAbhaNotFound(true);
        setAbhaWelcomeName(null);
      } else {
        setGlobalError(error.message || 'Error verifying ABHA number.');
      }
    } finally {
      setIsAbhaLoading(false);
    }
  };



  const handleAbhaSubmit = async () => {
    if (patientProfile) {
      onContinue();
    } else {
      await handleAbhaLookup();
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">

      {/* ── Header ──────────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
          <Shield className="w-3.5 h-3.5" />
          <span>Step 2 — {translate('identity', selectedLanguage)}</span>
          {selectedLanguage !== 'en' && <span className="text-[10px] opacity-75">(Patient Identification)</span>}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
          {translate('verifyPatient', selectedLanguage)}
        </h2>
        {selectedLanguage !== 'en' && (
          <p className="text-sm font-semibold text-indigo-700 mt-0.5">
            {translate('verifyPatient', 'en')}
          </p>
        )}
        <p className="text-slate-500 text-sm mt-1.5 max-w-lg mx-auto leading-relaxed">
          {translate('verifyPatientSub', selectedLanguage)}
        </p>
        {selectedLanguage !== 'en' && (
          <p className="text-xs text-slate-400 mt-0.5">
            {translate('verifyPatientSub', 'en')}
          </p>
        )}
      </div>

      {/* ── Tab navigation ──────────────────── */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-max mx-auto border border-slate-200 shadow-sm">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const tabKey = tab.id === 'ABHA' ? 'tabAbha' : tab.id === 'AADHAAR' ? 'tabAadhaar' : 'tabMobile';
            const regionalLabel = translate(tabKey as any, selectedLanguage);
            const englishLabel = translate(tabKey as any, 'en');

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                <div className="text-left">
                  <span>{regionalLabel}</span>
                  {selectedLanguage !== 'en' && (
                    <span className={`block text-[10px] font-normal leading-none mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {englishLabel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab panels ──────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════
            PATH 1: ABHA (Health ID Verification)
            ════════════════════════════════════════ */}
        {activeTab === 'ABHA' && (
          <motion.div
            key="ABHA"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Panel header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">ABHA Health ID</p>
                <p className="text-xs text-slate-400 mt-0.5">Enter 14-digit ABHA Card Number or ABHA Address (e.g. name@abdm)</p>
              </div>
            </div>

            <div className="p-6 max-w-xl mx-auto space-y-5">
              <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} />

              {/* ── State 1: Patient Found & Welcome Banner ── */}
              {abhaWelcomeName && patientProfile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50 border-2 border-emerald-500/30 text-emerald-950 shadow-sm space-y-3"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/25 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-emerald-900">
                        Hello {abhaWelcomeName}!
                      </h3>
                      <p className="text-sm font-medium text-emerald-800 mt-0.5">
                        Welcome, you are set to go with <span className="font-bold tracking-tight">medikiosk+</span>
                      </p>
                      <p className="text-xs text-emerald-700 font-mono mt-1">
                        ABHA: {patientProfile.abhaId || abhaInput} • Patient ID: {patientProfile.id}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Verified against ABHA Health Stack
                    </span>
                    <button
                      type="button"
                      onClick={onContinue}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                    >
                      Proceed to Vitals
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── State 2: Standard ABHA Input ── */}
              <div className="space-y-4">
                <Field label="ABHA Card Number or Address" required>
                  <div className="relative">
                    <input
                      type="text"
                      value={abhaInput}
                      onChange={(e) => {
                        setAbhaInput(formatAbhaNumber(e.target.value));
                        if (abhaNotFound) setAbhaNotFound(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleAbhaLookup();
                        }
                      }}
                      placeholder="e.g. 91-1234-5678-9012 or yourname@abdm"
                      className={inputClass + ' font-mono text-base pr-28'}
                    />
                    <button
                      type="button"
                      onClick={handleAbhaLookup}
                      disabled={isAbhaLoading || !abhaInput.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
                    >
                      {isAbhaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Verify
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter your 14-digit ABHA ID or your ABHA address linked to the Ayushman Bharat Digital Mission.
                  </p>
                </Field>
              </div>

              {/* ── State 3: Not Found in ABHA Database ── */}
              <AnimatePresence>
                {abhaNotFound && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="p-5 rounded-3xl bg-amber-50/80 border-2 border-amber-300 text-slate-900 shadow-sm space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-950">
                          No details found for this ABHA number
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          The identifier <span className="font-mono font-bold">{searchedAbha || abhaInput}</span> was not found in our database or the ABDM registry.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      {/* Mobile Alternative Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('MOBILE');
                          setGlobalError(null);
                        }}
                        className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition text-center"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Try Mobile Number Instead</span>
                      </button>

                      {/* Redirect Link to official ABHA Creation */}
                      <a
                        href={`https://healthid.abdm.gov.in/register?redirect_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition text-center whitespace-nowrap"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Official ABDM Portal</span>
                      </a>

                      {/* Mobile Alternative Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('MOBILE');
                          setGlobalError(null);
                        }}
                        className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-indigo-700 border-2 border-indigo-200 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition whitespace-nowrap"
                      >
                        <Phone className="w-4 h-4 text-indigo-600" />
                        <span>Use Mobile OTP</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

              {/* ── Integrated QR Scanner Section (Only uses camera on click) ── */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700">Or Scan ABHA Card QR Code</span>
                  </div>
                  {!showCamera ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCamera(true);
                        setScanError(null);
                        setScanSuccess(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Open Camera Scanner</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCamera(false);
                        stopQrCamera();
                      }}
                      className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
                    >
                      Close Camera
                    </button>
                  )}
                </div>

                <ErrorBanner message={scanError} onDismiss={() => setScanError(null)} />

                {/* Camera Viewport — only mounted/active when user clicks Open Camera Scanner */}
                <AnimatePresence>
                  {showCamera && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-4 rounded-3xl bg-slate-50 border border-indigo-100 flex flex-col items-center gap-3 overflow-hidden"
                    >
                      {isScanning ? (
                        <div className="flex flex-col items-center gap-2 py-6">
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                          <p className="text-xs font-bold text-slate-700">Decoding QR Code...</p>
                        </div>
                      ) : scanSuccess ? (
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs py-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>QR Scanned & Verified!</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-200 shadow-inner relative">
                            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                            {!isCameraReady && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <Camera className="w-8 h-8 animate-pulse" />
                                <p className="text-xs font-semibold">Starting camera...</p>
                              </div>
                            )}
                            <div className="absolute inset-[15%] border-2 border-emerald-400/80 rounded-xl pointer-events-none" />
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                            <button
                              type="button"
                              onClick={captureQrFrame}
                              disabled={!isCameraReady || isScanning}
                              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Capture & Scan</span>
                            </button>

                            <label className="px-4 py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200 hover:bg-slate-50 cursor-pointer transition flex items-center gap-1.5 shadow-2xs">
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>Upload Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleQrFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

        {/* ════════════════════════════════════════
            PATH 2: Aadhaar OTP
            ════════════════════════════════════════ */}
        {activeTab === 'AADHAAR' && (
          <motion.div
            key="AADHAAR"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Aadhaar OTP Verification</p>
                <p className="text-xs text-slate-400 mt-0.5">ABDM enrolment via POST /v3/enrollment/enrol/byAadhaar</p>
              </div>
            </div>

            <div className="p-6 max-w-md space-y-4">
              <ErrorBanner message={aadhaarError} onDismiss={() => setAadhaarError(null)} />
              <InfoBanner message={aadhaarSuccess} variant="success" />

              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${!aadhaarOtpSent ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                  {!aadhaarOtpSent ? '1' : '✓'}
                </span>
                <span className={!aadhaarOtpSent ? 'text-indigo-700' : 'text-slate-400'}>Enter Aadhaar</span>
                <div className="h-px flex-1 bg-slate-200" />
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${aadhaarOtpSent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  2
                </span>
                <span className={aadhaarOtpSent ? 'text-indigo-700' : 'text-slate-400'}>Verify OTP</span>
              </div>

              <Field label="12-Digit Aadhaar Number" required>
                <input
                  type="text"
                  maxLength={12}
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="XXXX XXXX XXXX"
                  disabled={aadhaarOtpSent}
                  className={inputClass + ' font-mono tracking-[0.3em]'}
                />
              </Field>

              {!aadhaarOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendAadhaarOtp}
                  disabled={isAadhaarLoading || aadhaarInput.length !== 12}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition"
                >
                  {isAadhaarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Request Aadhaar OTP
                </button>
              ) : (
                <div className="space-y-3">
                  <Field label="6-Digit OTP" required>
                    <input
                      type="text"
                      maxLength={6}
                      value={aadhaarOtp}
                      onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="● ● ● ● ● ●"
                      className={inputClass + ' font-mono tracking-[0.5em] text-center text-lg'}
                    />
                  </Field>

                  <OtpTimer
                    onResend={() => {
                      setAadhaarOtpSent(false);
                      setAadhaarOtp('');
                      void handleSendAadhaarOtp();
                    }}
                    isResending={isAadhaarLoading}
                  />

                  <button
                    type="button"
                    onClick={handleVerifyAadhaarOtp}
                    disabled={isAadhaarLoading || aadhaarOtp.length < 4}
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition"
                  >
                    {isAadhaarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Verify OTP & Register
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            PATH 3: Mobile OTP — 3-stage flow
            ════════════════════════════════════════ */}
        {activeTab === 'MOBILE' && (
          <motion.div
            key="MOBILE"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Mobile Number Login</p>
                <p className="text-xs text-slate-400 mt-0.5">ABDM PHR — /v3/phr/login/init + /v3/phr/login/verify/otp</p>
              </div>
            </div>

            <div className="p-6 max-w-md space-y-4">
              <ErrorBanner message={mobileError} onDismiss={() => setMobileError(null)} />
              <InfoBanner message={mobileInfo} variant={mobileInfo?.includes('registered') || mobileInfo?.includes('verified') ? 'success' : 'info'} />

              {/* Stage indicator */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                {(['PHONE_INPUT', 'OTP_VERIFY', 'DEMOGRAPHICS'] as MobileStage[]).map((stage, idx) => {
                  const done = (mobileStage === 'OTP_VERIFY' && idx === 0) ||
                               (mobileStage === 'DEMOGRAPHICS' && idx <= 1);
                  const active = mobileStage === stage;
                  return (
                    <React.Fragment key={stage}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {done ? '✓' : idx + 1}
                      </span>
                      <span className={active ? 'text-indigo-700' : done ? 'text-emerald-600' : ''}>
                        {stage === 'PHONE_INPUT' ? 'Phone' : stage === 'OTP_VERIFY' ? 'OTP' : 'Details'}
                      </span>
                      {idx < 2 && <div className="h-px flex-1 bg-slate-200" />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Stage 1: Phone input */}
              <AnimatePresence mode="wait">
                {mobileStage === 'PHONE_INPUT' && (
                  <motion.div
                    key="phone"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <Field label="Mobile Number" required>
                      <input
                        type="tel"
                        value={mobileInput}
                        onChange={(e) => setMobileInput(e.target.value)}
                        placeholder="+91 98765 43210"
                        className={inputClass + ' font-mono'}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      disabled={isMobileLoading || !mobileInput.trim()}
                      className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition"
                    >
                      {isMobileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                      Send OTP
                    </button>
                  </motion.div>
                )}

                {/* Stage 2: OTP verification */}
                {mobileStage === 'OTP_VERIFY' && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-xs text-slate-500 font-medium">
                      OTP sent to <span className="font-bold text-slate-700">{mobileInput}</span>
                    </p>
                    <Field label="Enter OTP" required>
                      <input
                        type="text"
                        maxLength={8}
                        value={mobileOtp}
                        onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="● ● ● ● ● ●"
                        className={inputClass + ' font-mono tracking-[0.5em] text-center text-lg'}
                      />
                    </Field>

                    <OtpTimer
                      onResend={() => {
                        setMobileStage('PHONE_INPUT');
                        setMobileOtp('');
                        setMobileInfo(null);
                      }}
                      isResending={isMobileLoading}
                    />

                    <button
                      type="button"
                      onClick={handleVerifyMobileOtp}
                      disabled={isMobileLoading || mobileOtp.length < 4}
                      className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition"
                    >
                      {isMobileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Verify & Continue
                    </button>
                  </motion.div>
                )}

                {/* Stage 3: Demographic collection (REGISTRATION_REQUIRED fallback) */}
                {mobileStage === 'DEMOGRAPHICS' && (
                  <motion.div
                    key="demographics"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                      <User className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800 font-medium">
                        Mobile verified! This number has no linked ABHA record. Please fill in your details to complete registration.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="First Name" required>
                        <input
                          type="text"
                          value={mobileFirstName}
                          onChange={(e) => setMobileFirstName(e.target.value)}
                          placeholder="First"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Last Name">
                        <input
                          type="text"
                          value={mobileLastName}
                          onChange={(e) => setMobileLastName(e.target.value)}
                          placeholder="Last"
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Age" required>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={mobileAge}
                          onChange={(e) => setMobileAge(e.target.value)}
                          placeholder="e.g. 35"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Sex" required>
                        <select
                          value={mobileSex}
                          onChange={(e) => setMobileSex(e.target.value as any)}
                          className={selectClass}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={handleMobileRegister}
                      disabled={isMobileLoading || !mobileFirstName.trim() || !mobileAge}
                      className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition"
                    >
                      {isMobileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Register & Continue
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

      </AnimatePresence>



      {/* ── Verified Profile Banner ──────────── */}
      <AnimatePresence>
        {patientProfile && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mt-5 p-4 rounded-3xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black flex items-center justify-center text-lg shadow-md shadow-indigo-500/20">
                {patientProfile.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-black text-slate-900">{patientProfile.fullName}</p>
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-mono font-bold">
                    {patientProfile.age} Y / {patientProfile.gender.charAt(0)}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <p className="text-xs text-slate-500 font-mono">
                    ID: <span className="text-indigo-700 font-bold">{patientProfile.id}</span>
                  </p>
                  {patientProfile.abhaId && (
                    <p className="text-xs text-slate-500 font-mono">
                      ABHA: <span className="text-indigo-700 font-bold">{patientProfile.abhaId}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold shrink-0">
              <Link2 className="w-3.5 h-3.5" />
              ABDM Linked
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation buttons ───────────────── */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <button
          onClick={onBack}
          className="py-2.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <div className="text-left">
            <span>{translate('back', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] text-slate-400 font-medium">Back to Consent</span>
            )}
          </div>
        </button>

        <button
          id="identity-proceed-btn"
          onClick={() => {
            if (activeTab === 'ABHA' || !patientProfile) {
              void handleAbhaSubmit();
            } else {
              onContinue();
            }
          }}
          className="py-3 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm flex items-center gap-3 shadow-lg shadow-indigo-600/20 transition active:scale-[0.98]"
        >
          <div className="text-left">
            <span>{translate('confirmVitals', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] font-normal opacity-85">Confirm Patient & Record Vitals</span>
            )}
          </div>
          <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
        </button>
      </div>
    </div>
  );
};
