import React, { useState, useEffect, useRef } from 'react';
import {
  ConsentSettings,
  DigitizedDocument,
  HistoryObject,
  KioskStep,
  LanguageCode,
  OpdType,
  PatientProfile,
  QueueToken,
} from './types';
import { Header } from './components/Header';
import { LanguagePicker } from './components/LanguagePicker';
import { ConsentScreen } from './components/ConsentScreen';
import { IdentityScreen } from './components/IdentityScreen';
import { VitalsCaptureScreen } from './components/VitalsCaptureScreen';
import { ChiefComplaintPicker } from './components/ChiefComplaintPicker';
import { SocratesConversationEngine } from './components/SocratesConversationEngine';
import { FamilyPersonalHistoryScreen } from './components/FamilyPersonalHistoryScreen';
import { AyushParikshaCards } from './components/AyushParikshaCards';
import { DocumentDigitization } from './components/DocumentDigitization';
import { SessionPurgeScreen } from './components/SessionPurgeScreen';
import { PhysicianSummaryConsole } from './components/PhysicianSummaryConsole';
import { OpdQueueTriageView } from './components/OpdQueueTriageView';
import { WhatsAppContinuityModal } from './components/WhatsAppContinuityModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { PatientPortalAuth } from './components/PatientPortalAuth';
import { PatientPortalDashboard } from './components/PatientPortalDashboard';
import { SignLanguageAvatar } from './components/SignLanguageAvatar';
import { RedFlagNotificationListener } from './components/RedFlagNotificationListener';
import { OfflineIndicator } from './components/PWAInstallButton';
import { ChatWidget } from './components/ChatWidget';
import { broadcastManager } from './services/broadcastChannel';
import { PatientHeader } from './components/PatientHeader';
import { FloatingCurrentToken } from './components/FloatingCurrentToken';
import { StaffLoginScreen, AuthUser } from './components/StaffLoginScreen';
import { DoctorConsolePage } from './components/DoctorConsolePage';
import { AdminPanelPage } from './components/AdminPanelPage';

export function App() {
  // Role & View Management (Patient Kiosk vs Staff Login vs Doctor vs Admin)
  const [activeRoleView, setActiveRoleView] = useState<'patient' | 'staff_login' | 'doctor' | 'admin'>('patient');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('medikiosk_user');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });

  // Navigation & Kiosk State
  const [currentStep, setCurrentStep] = useState<KioskStep>('LANGUAGE');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [sessionCount, setSessionCount] = useState<number>(1);

  // Accessibility States
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [isAudioNarration, setIsAudioNarration] = useState(true);
  const [isSignAvatar, setIsSignAvatar] = useState(false);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [kioskBanner, setKioskBanner] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  // Consent
  const [consent, setConsent] = useState<ConsentSettings>({
    demographics: true,
    medicalHistory: true,
    documentOcr: true,
    abdmLinking: true,
    voiceRecording: true,
    timestamp: new Date().toISOString(),
  });

  // Patient & Clinical Intake (Clean Initial State)
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [opdType, setOpdType] = useState<OpdType>('allopathic');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>('');

  const [historyObject, setHistoryObject] = useState<HistoryObject>({
    chiefComplaint: '',
    opdType: 'allopathic',
    socrates: {},
    redFlags: [],
    transcriptLogs: [],
  });

  const [documents, setDocuments] = useState<DigitizedDocument[]>([]);

  // Load persistent real queue from localStorage if available, or empty
  const [queue, setQueue] = useState<QueueToken[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('medikiosk_opd_queue');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not load saved queue:', e);
      }
    }
    return [];
  });
  const [createdToken, setCreatedToken] = useState<QueueToken | null>(null);

  // Sync queue to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medikiosk_opd_queue', JSON.stringify(queue));
    }
  }, [queue]);

  // Auto-reset timer when idle
  const idleTimerRef = useRef<any>(null);
  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (currentStep !== 'LANGUAGE' && currentStep !== 'PHYSICIAN_CONSOLE' && currentStep !== 'ANALYTICS') {
        handleResetKiosk();
      }
    }, 180000); // 3 minutes auto reset
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [currentStep]);

  // Insert CRITICAL red-flag token at front of queue
  const triggerRedFlagQueueElevate = async () => {
    const isCritical =
      Boolean(historyObject.redFlags && historyObject.redFlags.length > 0) ||
      documents.some((d) => d.labValues.some((l) => l.status.includes('CRITICAL')));

    const tokenPayload = {
      abhaId: patientProfile?.abhaId || '',
      patientName: patientProfile?.fullName || '',
      age: patientProfile?.age || '',
      gender: patientProfile?.gender || '',
      opdType: opdType,
      chiefComplaint: historyObject.chiefComplaint || '',
      priorityLevel: isCritical ? 'CRITICAL' : 'ROUTINE',
      redFlagReason: isCritical ? historyObject.redFlags?.[0] || 'Critical biomarkers identified' : undefined,
      language: selectedLanguage,
    };

    try {
      // 1. Atomic encounter persistence across patient, encounter, token, vitals, socrates, ayush, history, documents
      const completePayload = {
        tokenPayload,
        patientProfile,
        socrates: historyObject.socrates,
        ayush: historyObject.ayush,
        familyHistory: historyObject.familyHistory,
        personalHistory: historyObject.personalHistory,
        documents: documents || [],
      };

      const response = await fetch('/api/encounters/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completePayload),
      });

      let serverResponse;
      if (response.ok) {
        serverResponse = await response.json();
      } else {
        throw new Error('Failed to create token');
      }

      const sToken = serverResponse.token || serverResponse;

      // 2. Save encounter to localStorage 'medikiosk_fhir_archive' for Patient Portal continuity
      try {
        const existingArchive = JSON.parse(localStorage.getItem('medikiosk_fhir_archive') || '[]');
        const archiveItem = {
          id: sToken.id || sToken.tokenId || `ENC-${Date.now()}`,
          date: new Date().toISOString(),
          title: `${historyObject.chiefComplaint || 'OPD Consultation'} Summary`,
          documentType: 'discharge_summary',
          hospitalOrClinic: 'AIIMS / District OPD Centre',
          doctorName: sToken.doctorName || 'Attending Physician',
          diagnoses: [historyObject.chiefComplaint || 'Clinical Consultation'],
          abhaId: tokenPayload.abhaId || 'ABHA-DEMO-001',
          patientName: tokenPayload.patientName || 'Patient',
          department: opdType === 'ayurveda' ? 'Ayurveda / AYUSH' : 'General Medicine OPD',
          status: 'COMPLETED',
          vitals: patientProfile?.vitals,
          socrates: historyObject.socrates,
          ayush: historyObject.ayush,
          documents: documents || [],
          redFlags: historyObject.redFlags || [],
          rawOcrText: 'Digital Health Record synchronized with ABDM Health Locker.',
        };
        localStorage.setItem('medikiosk_fhir_archive', JSON.stringify([archiveItem, ...existingArchive]));
      } catch (e) {
        console.warn('Could not save to fhir archive:', e);
      }

      const newToken: QueueToken = {
        tokenId: sToken.id || sToken.tokenId || `TOKEN-LIVE-${Date.now().toString().slice(-4)}`,
        tokenNumber: sToken.tokenNumber || (100 + queue.length + 1),
        abhaId: tokenPayload.abhaId,
        patientName: tokenPayload.patientName,
        age: tokenPayload.age as any,
        gender: tokenPayload.gender as any,
        opdType: tokenPayload.opdType,
        chiefComplaint: tokenPayload.chiefComplaint,
        priorityLevel: tokenPayload.priorityLevel as any,
        redFlagReason: tokenPayload.redFlagReason,
        arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'WAITING',
        roomNumber: sToken.roomNumber || (opdType === 'ayurveda' ? 'AYUSH Room 202' : 'OPD Room 104'),
        doctorName: sToken.doctorName || (opdType === 'ayurveda' ? 'Vaidya R. S. Joshi' : 'Dr. Priya Sharma (MD)'),
        waitMinutes: sToken.waitMinutes !== undefined ? sToken.waitMinutes : (isCritical ? 0 : 15),
        language: tokenPayload.language,
      };

      setCreatedToken(newToken);
      setSessionCount((prev) => prev + 1);

      let updatedQueue: QueueToken[];
      if (newToken.priorityLevel === 'CRITICAL') {
        updatedQueue = [newToken, ...queue];
        broadcastManager.postMessage({
          type: 'RED_FLAG_TRIGGERED',
          token: newToken,
          patientName: newToken.patientName,
          redFlagReason: newToken.redFlagReason || 'Red Flag Alert',
          timestamp: new Date().toISOString(),
        });
      } else {
        updatedQueue = [...queue, newToken];
        broadcastManager.postMessage({
          type: 'TOKEN_CREATED',
          token: newToken,
          timestamp: new Date().toISOString(),
        });
      }

      setQueue(updatedQueue);
    } catch (error) {
      console.error("Token creation failed:", error);
      setKioskBanner({
        type: 'error',
        message: 'Unable to issue OPD token. Please re-check vitals or contact hospital intake desk.',
      });
    }
  };

  const handleResetKiosk = () => {
    setCurrentStep('LANGUAGE');
    setSelectedLanguage('en');
    setPatientProfile(null);
    setOpdType('allopathic');
    setSelectedComplaintId('');
    setHistoryObject({
      chiefComplaint: '',
      opdType: 'allopathic',
      socrates: {},
      redFlags: [],
      transcriptLogs: [],
    });
    setDocuments([]);
    setCreatedToken(null);
  };

  const handleComplaintSelection = (id: string, title: string) => {
    setSelectedComplaintId(id);
    setHistoryObject((prev) => ({
      ...prev,
      chiefComplaint: title,
      opdType: opdType,
      socrates: {
        ...prev.socrates,
      },
    }));
  };

  const hasRedFlag = Boolean(historyObject.redFlags && historyObject.redFlags.length > 0);

  // Role Gate: Hospital Staff & Doctor Login
  if (activeRoleView === 'staff_login') {
    return (
      <StaffLoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin') {
            setActiveRoleView('admin');
          } else {
            setActiveRoleView('doctor');
          }
        }}
        onBackToKiosk={() => setActiveRoleView('patient')}
      />
    );
  }

  // Role Gate: Doctor Console (OPD Queue + Priority Jump + Clinical Summary)
  if (activeRoleView === 'doctor' && currentUser) {
    return (
      <DoctorConsolePage
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('medikiosk_token');
          localStorage.removeItem('medikiosk_user');
          setCurrentUser(null);
          setActiveRoleView('patient');
        }}
        activePatientProfile={patientProfile}
        activeHistory={historyObject}
        activeDocuments={documents}
        selectedLanguage={selectedLanguage}
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
        createdToken={createdToken}
      />
    );
  }

  // Role Gate: Administrator Command Center
  if (activeRoleView === 'admin' && currentUser) {
    return (
      <AdminPanelPage
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('medikiosk_token');
          localStorage.removeItem('medikiosk_user');
          setCurrentUser(null);
          setActiveRoleView('patient');
        }}
        onBackToKiosk={() => setActiveRoleView('patient')}
      />
    );
  }

  return (
    <div
      className={`min-h-screen kiosk-mesh-bg text-slate-900 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900 transition-all duration-200 relative overflow-x-hidden ${
        isHighContrast ? 'contrast-125 brightness-110 bg-white text-black' : ''
      } ${isLargeFont ? 'text-lg' : 'text-base'}`}
    >
      {/* Ambient background glow elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[450px] h-[450px] bg-violet-500/5 rounded-full blur-[160px]" />
      </div>

      <RedFlagNotificationListener />

      {/* Offline Status Pill */}
      <OfflineIndicator isSimulatedOffline={isOfflineSimulated} />

      {/* Patient-Facing Clean Clinical Header */}
      <PatientHeader
        currentStep={currentStep}
        onNavigateToIntake={() => setCurrentStep('LANGUAGE')}
        onNavigateToPortal={() => setCurrentStep('PATIENT_PORTAL_AUTH')}
        onReset={handleResetKiosk}
        isAudioMuted={!isAudioNarration}
        onToggleAudio={() => setIsAudioNarration(!isAudioNarration)}
        onOpenStaffLogin={() => setActiveRoleView('staff_login')}
        language={selectedLanguage}
        opdType={opdType}
        onNavigateStep={(step) => setCurrentStep(step)}
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
        isLargeFont={isLargeFont}
        onToggleLargeFont={() => setIsLargeFont(!isLargeFont)}
        isSignAvatar={isSignAvatar}
        onToggleSignAvatar={() => setIsSignAvatar(!isSignAvatar)}
      />

      {/* Inline Kiosk Banner (WCAG / Touch-Friendly Non-Blocking Alerts) */}
      {kioskBanner && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-3 z-30">
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
              kioskBanner.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : kioskBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-indigo-50 border-indigo-300 text-indigo-800'
            }`}
          >
            <span className="text-sm font-semibold">{kioskBanner.message}</span>
            <button
              onClick={() => setKioskBanner(null)}
              className="ml-4 px-3 py-1 rounded-xl bg-white/80 hover:bg-white text-xs font-bold border border-current shadow-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Kiosk Content Stage */}
      <main className="flex-1 flex flex-col justify-start py-2 relative z-10">
        {/* Dynamic View Router */}
        {currentStep === 'LANGUAGE' && (
          <LanguagePicker
            selectedLanguage={selectedLanguage}
            onSelectLanguage={(lang) => setSelectedLanguage(lang)}
            onContinue={() => setCurrentStep('CONSENT')}
            isAudioNarration={isAudioNarration}
          />
        )}

        {currentStep === 'CONSENT' && (
          <ConsentScreen
            consent={consent}
            onUpdateConsent={(c) => setConsent(c)}
            onContinue={() => setCurrentStep('IDENTITY')}
            onBack={() => setCurrentStep('LANGUAGE')}
            onGoToSummary={() => setCurrentStep('PHYSICIAN_CONSOLE')}
            selectedLanguage={selectedLanguage}
            isAudioNarration={isAudioNarration}
          />
        )}

        {currentStep === 'IDENTITY' && (
          <IdentityScreen
            patientProfile={patientProfile}
            onSelectProfile={(p) => {
              setPatientProfile(p);
            }}
            onContinue={() => setCurrentStep('VITALS')}
            onBack={() => setCurrentStep('CONSENT')}
            selectedLanguage={selectedLanguage}
          />
        )}

        {currentStep === 'VITALS' && (
          <VitalsCaptureScreen
            patientProfile={patientProfile}
            onUpdateProfile={(p) => setPatientProfile(p)}
            onContinue={() => setCurrentStep('COMPLAINT_SELECT')}
            onBack={() => setCurrentStep('IDENTITY')}
            selectedLanguage={selectedLanguage}
            isAudioNarration={isAudioNarration}
          />
        )}

        {currentStep === 'COMPLAINT_SELECT' && (
          <ChiefComplaintPicker
            opdType={opdType}
            onSelectOpdType={(type) => {
              setOpdType(type);
              setHistoryObject((prev) => ({ ...prev, opdType: type }));
            }}
            selectedComplaintId={selectedComplaintId}
            onSelectComplaint={handleComplaintSelection}
            onContinue={() => setCurrentStep('CONVERSATION')}
            onBack={() => setCurrentStep('VITALS')}
            selectedLanguage={selectedLanguage}
          />
        )}

        {currentStep === 'CONVERSATION' && (
          <SocratesConversationEngine
            complaintId={selectedComplaintId}
            historyObject={historyObject}
            onUpdateHistory={(h) => setHistoryObject(h)}
            onComplete={() => {
              setCurrentStep('FAMILY_HISTORY');
            }}
            onBack={() => setCurrentStep('COMPLAINT_SELECT')}
            selectedLanguage={selectedLanguage}
            isAudioNarration={isAudioNarration}
          />
        )}

        {currentStep === 'FAMILY_HISTORY' && (
          <FamilyPersonalHistoryScreen
            historyObject={historyObject}
            patientGender={patientProfile?.gender || 'Male'}
            onUpdateHistory={(h) => setHistoryObject(h)}
            onContinue={() => {
              if (opdType === 'ayurveda') {
                setCurrentStep('AYUSH_PARIKSHA');
              } else {
                setCurrentStep('DOC_SCAN');
              }
            }}
            onBack={() => setCurrentStep('CONVERSATION')}
            selectedLanguage={selectedLanguage}
            isAudioNarration={isAudioNarration}
          />
        )}

        {currentStep === 'AYUSH_PARIKSHA' && (
          <AyushParikshaCards
            historyObject={historyObject}
            onUpdateHistory={(h) => setHistoryObject(h)}
            onContinue={() => setCurrentStep('DOC_SCAN')}
            onBack={() => setCurrentStep('FAMILY_HISTORY')}
            selectedLanguage={selectedLanguage}
          />
        )}

        {currentStep === 'DOC_SCAN' && (
          <DocumentDigitization
            documents={documents}
            patientProfile={patientProfile}
            onUpdateDocuments={(docs) => setDocuments(docs)}
            onContinue={() => {
              triggerRedFlagQueueElevate();
              setCurrentStep('SESSION_PURGE');
            }}
            onBack={() => {
              if (opdType === 'ayurveda') {
                setCurrentStep('AYUSH_PARIKSHA');
              } else {
                setCurrentStep('FAMILY_HISTORY');
              }
            }}
            selectedLanguage={selectedLanguage}
          />
        )}

        {currentStep === 'SESSION_PURGE' && (
          <SessionPurgeScreen
            createdToken={createdToken}
            onProceed={() => setCurrentStep('PHYSICIAN_CONSOLE')}
            selectedLanguage={selectedLanguage}
          />
        )}

        {(currentStep === 'PHYSICIAN_CONSOLE' || currentStep === 'SUMMARY_REVIEW') && (
          <PhysicianSummaryConsole
            patientProfile={patientProfile}
            historyObject={historyObject}
            documents={documents}
            selectedLanguage={selectedLanguage}
            onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
            onOpenQueue={() => setCurrentStep('QUEUE_DISPLAY')}
            createdToken={createdToken}
          />
        )}

        {currentStep === 'QUEUE_DISPLAY' && (
          <OpdQueueTriageView
            queue={queue}
            onUpdateQueue={(q) => setQueue(q)}
            onBackToKiosk={() => setCurrentStep('LANGUAGE')}
          />
        )}

        {currentStep === 'ANALYTICS' && (
          <AnalyticsDashboard
            onBackToKiosk={() => setCurrentStep('LANGUAGE')}
            queue={queue}
            sessionCount={sessionCount}
          />
        )}

        {currentStep === 'PATIENT_PORTAL_AUTH' && (
          <PatientPortalAuth
            onAuthSuccess={(patient) => {
              setPatientProfile(patient);
              setCurrentStep('PATIENT_PORTAL_DASHBOARD');
            }}
            onBackToKiosk={() => setCurrentStep('LANGUAGE')}
          />
        )}

        {currentStep === 'PATIENT_PORTAL_DASHBOARD' && (
          <PatientPortalDashboard
            patient={patientProfile}
            onLogout={() => setCurrentStep('LANGUAGE')}
          />
        )}
      </main>

      {/* Indian Sign Language Avatar Assistant */}
      <SignLanguageAvatar
        currentPromptText={
          currentStep === 'LANGUAGE'
            ? 'Please select your preferred language.'
            : currentStep === 'CONSENT'
            ? 'Review health privacy consent terms.'
            : currentStep === 'IDENTITY'
            ? 'Scan ABHA card or select patient persona.'
            : currentStep === 'VITALS'
            ? 'Measure and enter your blood pressure and vitals.'
            : currentStep === 'COMPLAINT_SELECT'
            ? 'Select your primary symptoms or department.'
            : currentStep === 'CONVERSATION'
            ? 'Explain your symptoms and pain severity.'
            : currentStep === 'FAMILY_HISTORY'
            ? 'Disclose family medical background and personal habits.'
            : currentStep === 'AYUSH_PARIKSHA'
            ? 'Select Ayurvedic constitution and Dashavidha cards.'
            : currentStep === 'DOC_SCAN'
            ? 'Digitize prescriptions and laboratory reports.'
            : currentStep === 'SESSION_PURGE'
            ? 'Your temporary files are being cleared from memory.'
            : 'Reviewing clinical summary and triage token.'
        }
        currentStep={currentStep}
        opdType={opdType}
        isOpen={isSignAvatar}
        onClose={() => setIsSignAvatar(false)}
      />

      {/* WhatsApp Post-Consult Continuity Modal */}
      <WhatsAppContinuityModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        patientProfile={patientProfile}
        selectedLanguage={selectedLanguage}
        historyObject={historyObject}
        createdToken={createdToken}
        documents={documents}
      />

      {/* Real-Time Live Floating Queue Serving Token */}
      <FloatingCurrentToken />

      {/* Floating Action Button & AI Kiosk Chat Assistant */}
      <ChatWidget onNavigateToStep={(step) => setCurrentStep(step)} />
    </div>
  );
}

export default App;
