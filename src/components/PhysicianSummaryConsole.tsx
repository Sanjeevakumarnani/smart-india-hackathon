import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Send,
  Printer,
  Copy,
  Check,
  Edit3,
  AlertOctagon,
  Code2,
  CheckCircle2,
  RefreshCw,
  MessageCircle,
  Download,
} from 'lucide-react';
import {
  ClinicalSummary,
  DigitizedDocument,
  HistoryObject,
  LanguageCode,
  PatientProfile,
  QueueToken,
} from '../types';
import { generateClinicalSummary, pushFhirToAbdm, logPhysicianCorrection } from '../services/geminiService';
import { generateFhirR4Bundle } from '../services/fhirGenerator';
import { broadcastManager } from '../services/broadcastChannel';
import { generateClinicalReportPdf } from '../services/pdfService';

interface PhysicianSummaryConsoleProps {
  patientProfile: PatientProfile | null;
  historyObject: HistoryObject;
  documents: DigitizedDocument[];
  selectedLanguage: LanguageCode;
  onOpenWhatsApp: () => void;
  onOpenQueue: () => void;
  createdToken: QueueToken | null;
}

export const PhysicianSummaryConsole: React.FC<PhysicianSummaryConsoleProps> = ({
  patientProfile,
  historyObject,
  documents,
  selectedLanguage,
  onOpenWhatsApp,
  onOpenQueue,
  createdToken,
}) => {
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState('');
  const [editedHpi, setEditedHpi] = useState('');
  const [correctionsCount, setCorrectionsCount] = useState(0);
  const [activeLangTab, setActiveLangTab] = useState<'EN' | 'REGIONAL'>('EN');
  const [consoleNotification, setConsoleNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [showFhirInspector, setShowFhirInspector] = useState(false);
  const [fhirBundle, setFhirBundle] = useState<any>(null);
  const [isPushingAbdm, setIsPushingAbdm] = useState(false);
  const [abdmPushResult, setAbdmPushResult] = useState<any>(null);
  const [copiedFhir, setCopiedFhir] = useState(false);

  // Generate summary on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      setIsLoading(true);
      try {
        const res = await generateClinicalSummary(
          historyObject,
          documents,
          patientProfile,
          selectedLanguage
        );
        if (isMounted && res.summary) {
          setSummary(res.summary);
          setEditedHpi(res.summary.hpi);
          setEditedPlan(res.summary.provisionalPlan);

          // Build FHIR Bundle
          const bundle = generateFhirR4Bundle(
            patientProfile,
            historyObject,
            res.summary,
            documents
          );
          setFhirBundle(bundle);
        }
      } catch (err) {
        console.error("Failed to generate clinical summary:", err);
        setConsoleNotification({
          type: 'error',
          message: 'Failed to generate clinical summary. Attending physician may edit manually or refresh.',
        });
      }
      if (isMounted) setIsLoading(false);
    }
    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [historyObject, documents, patientProfile, selectedLanguage]);

  const handleSaveEdits = async () => {
    if (summary) {
      if (editedHpi !== summary.hpi) {
        logPhysicianCorrection('hpi', summary.hpi, editedHpi);
      }
      if (editedPlan !== summary.provisionalPlan) {
        logPhysicianCorrection('provisionalPlan', summary.provisionalPlan, editedPlan);
      }

      setSummary({
        ...summary,
        hpi: editedHpi,
        provisionalPlan: editedPlan,
      });
      setCorrectionsCount((prev) => prev + 1);
      setIsEditing(false);

      // Re-generate FHIR Bundle
      const bundle = generateFhirR4Bundle(
        patientProfile,
        historyObject,
        { ...summary, hpi: editedHpi, provisionalPlan: editedPlan },
        documents
      );
      setFhirBundle(bundle);

      try {
        const authToken = localStorage.getItem('medikiosk_token') || 'session-token';
        await fetch('/api/physician/corrections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            encounterId: createdToken?.tokenId || 'UNKNOWN',
            corrections: [
              ...(editedHpi !== summary.hpi ? [{ section: 'hpi', originalValue: summary.hpi, correctedValue: editedHpi }] : []),
              ...(editedPlan !== summary.provisionalPlan ? [{ section: 'provisionalPlan', originalValue: summary.provisionalPlan, correctedValue: editedPlan }] : [])
            ]
          })
        });
      } catch (error) {
        console.error("Failed to save physician correction:", error);
      }
    }
  };

  const handlePushToAbdm = async () => {
    setIsPushingAbdm(true);
    try {
      const result = await pushFhirToAbdm(fhirBundle);
      setAbdmPushResult(result);
      
      // Broadcast update
      broadcastManager.postMessage({
        type: 'TOKEN_STATUS_UPDATED',
        token: createdToken || undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to push to ABDM:", error);
      setConsoleNotification({
        type: 'error',
        message: 'Failed to push to ABDM Gateway. Please check ABDM Bridge or Network connectivity.',
      });
    } finally {
      setIsPushingAbdm(false);
    }
  };

  const handleCopyFhir = () => {
    if (fhirBundle) {
      navigator.clipboard.writeText(JSON.stringify(fhirBundle, null, 2));
      setCopiedFhir(true);
      setTimeout(() => setCopiedFhir(false), 2000);
    }
  };

  const handleDownloadPdf = () => {
    generateClinicalReportPdf({
      patientProfile,
      historyObject,
      documents,
      summary,
      createdToken,
    });
  };

  const hasRedFlags =
    (historyObject.redFlags && historyObject.redFlags.length > 0) ||
    documents.some((d) => d.labValues.some((l) => l.status.includes('CRITICAL')));

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Inline Non-Blocking Notification Banner */}
      {consoleNotification && (
        <div className={`p-4 rounded-2xl mb-6 border flex items-center justify-between shadow-sm transition-all ${
          consoleNotification.type === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-800'
            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}>
          <span className="text-sm font-semibold">{consoleNotification.message}</span>
          <button
            onClick={() => setConsoleNotification(null)}
            className="ml-4 px-3 py-1 rounded-xl bg-white text-xs font-bold border border-current shadow-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner with Patient Bar & Quick Actions */}
      <div className="stitch-card p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-indigo-500/20">
              {patientProfile?.fullName.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {patientProfile?.fullName || 'Not provided'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
                  {patientProfile?.age || '35'}Y / {patientProfile?.gender || 'Other'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold">
                  Room: {createdToken?.roomNumber || '104'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ABHA ID: {patientProfile?.abhaId || 'Not provided'} | Contact:{' '}
                {patientProfile?.phone || 'Not provided'}
              </p>
            </div>
          </div>

          {/* Quick Doctor Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveLangTab(activeLangTab === 'EN' ? 'REGIONAL' : 'EN')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-mono font-bold text-indigo-700 border border-slate-200 transition shadow-xs"
            >
              Translate: {activeLangTab === 'EN' ? (selectedLanguage === 'en' ? 'Regional' : selectedLanguage.toUpperCase()) : 'English'}
            </button>

            <button
              onClick={onOpenWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Rx</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Report</span>
            </button>

            <button
              onClick={onOpenQueue}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition shadow-sm"
            >
              <span>Live Queue Monitor</span>
            </button>

            <button
              id="push-abdm-btn"
              onClick={handlePushToAbdm}
              disabled={isPushingAbdm || abdmPushResult}
              className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm transition active:scale-95 ${
                abdmPushResult
                  ? 'bg-indigo-700 text-white'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-600/20'
              }`}
            >
              {isPushingAbdm ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : abdmPushResult ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{abdmPushResult ? 'Pushed to ABDM / FHIR' : 'Sign & Push ABDM'}</span>
            </button>
          </div>
        </div>

        {/* ABDM Success Alert Pill */}
        {abdmPushResult && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>ABDM Gateway Transaction Success:</strong> TxID #{' '}
                {abdmPushResult.gatewayResponse?.transactionId} • Linked to ABHA Locker
              </span>
            </div>
            <button
              onClick={() => setShowFhirInspector(!showFhirInspector)}
              className="text-[11px] underline font-bold text-emerald-300 font-mono"
            >
              View FHIR R4 Bundle
            </button>
          </div>
        )}
      </div>

      {/* Critical Red-Flag Banner */}
      {hasRedFlags && (
        <div className="mb-6 p-4 rounded-3xl bg-rose-950/70 border-2 border-rose-500 shadow-2xl flex items-start gap-3.5 text-white">
          <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-rose-200 uppercase tracking-wide">
                Critical Red-Flag Triage Alerts Active
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-[10px] font-black uppercase font-mono">
                EMERGENCY PRIORITY 1
              </span>
            </div>
            <ul className="mt-1.5 space-y-1 text-xs text-rose-200 font-medium">
              {historyObject.redFlags?.map((flag, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>{flag}</span>
                </li>
              ))}
              {documents.flatMap((d) =>
                d.labValues
                  .filter((l) => l.status.includes('CRITICAL'))
                  .map((l, idx) => (
                    <li key={`crit-${idx}`} className="flex items-center gap-1.5 text-amber-200 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>
                        Critical Biomarker: {l.test} observed {l.value} {l.unit} (Reference: {l.reference})
                      </span>
                    </li>
                  ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-[#0e121a]/90 border border-[#1b2334] text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-white">
            Synthesizing Clinical Intake, OCR & AYUSH Rogi Pariksha...
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Applying ICD-10 and SNOMED clinical mapping via Gemini server engine
          </p>
        </div>
      ) : summary ? (
        /* Clinical Summary Document Body */
        <div className="stitch-card p-6 sm:p-8 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1b2334] mb-6">
            <div className="flex items-center gap-2.5">
              <Stethoscope className="w-6 h-6 text-cyan-400" />
              <div>
                <h3 className="text-lg font-black text-white">
                  Physician Case-Taking & Triage Summary
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Synthesized via MediKiosk+ Clinical Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {correctionsCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold">
                  {correctionsCount} Physician Edit{correctionsCount > 1 ? 's' : ''} Logged
                </span>
              )}

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161c28] hover:bg-[#202838] text-xs font-mono font-bold text-slate-200 border border-[#263044] transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Note'}</span>
              </button>
            </div>
          </div>

          {/* Regional Summary Tab View if toggled */}
          {activeLangTab === 'REGIONAL' && ((summary as any).regionalSummary || summary.hindiSummary) ? (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 text-sm leading-relaxed mb-6">
              <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400 mb-1 font-mono">
                Regional Patient Summary ({selectedLanguage.toUpperCase()})
              </h4>
              <p className="whitespace-pre-line">{(summary as any).regionalSummary || summary.hindiSummary}</p>
            </div>
          ) : null}

          {/* Main SOAP / Structured Sections */}
          <div className="space-y-6">
            {/* 1. Chief Complaint & HPI */}
            <div>
              <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
                1. Chief Complaint & History of Present Illness (HPI / SOCRATES)
              </h4>
              <div className="p-4 rounded-2xl bg-[#06080d] border border-[#1b2334] text-sm text-slate-200 leading-relaxed">
                <p className="font-bold text-white mb-1.5">
                  <strong className="text-cyan-300">Complaint:</strong> {summary.chiefComplaint}
                </p>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={editedHpi}
                    onChange={(e) => setEditedHpi(e.target.value)}
                    className="w-full mt-2 p-3 rounded-xl bg-[#06080d] border border-cyan-500 text-white font-sans text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                ) : (
                  <p>{summary.hpi}</p>
                )}
              </div>
            </div>

            {/* 2. Medical Background & Allergies */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#06080d] border border-[#1b2334]">
                <p className="text-[11px] font-mono font-bold text-slate-400 uppercase">Past History</p>
                <p className="text-xs font-semibold text-slate-200 mt-1">
                  {summary.pastHistory || 'Nil significant'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#06080d] border border-[#1b2334]">
                <p className="text-[11px] font-mono font-bold text-slate-400 uppercase">Current Medications</p>
                <p className="text-xs font-semibold text-slate-200 mt-1">
                  {summary.medications || 'Nil reported'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#06080d] border border-[#1b2334]">
                <p className="text-[11px] font-mono font-bold text-slate-400 uppercase">Allergies</p>
                <p className="text-xs font-semibold text-rose-300 mt-1">
                  {summary.allergies || 'NKDA'}
                </p>
              </div>
            </div>

            {/* 3. AYUSH Rogi Pariksha Card (if Ayurveda mode) */}
            {summary.ayushAssessment && (
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs">
                <h4 className="font-mono font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>AYUSH Dashavidha Pariksha Findings</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Deha Prakriti</span>
                    <strong className="text-white">{summary.ayushAssessment.prakriti}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Agni Status</span>
                    <strong className="text-white">{summary.ayushAssessment.agni}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Koshtha</span>
                    <strong className="text-white">{summary.ayushAssessment.koshtha}</strong>
                  </div>
                  {historyObject.ayush?.jihva && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Jihva (Tongue)</span>
                      <strong className="text-white">{historyObject.ayush.jihva}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Dosha Dushti</span>
                    <strong className="text-amber-300">{summary.ayushAssessment.doshaImbalance}</strong>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-500/30 text-amber-200">
                  <strong>Chikitsa Guidance:</strong> {summary.ayushAssessment.chikitsaGuidance}
                </div>
              </div>
            )}

            {/* 4. Investigations & Lab Digitization */}
            <div>
              <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
                4. OCR Digitized Biomarkers & Prior Records
              </h4>
              <div className="p-4 rounded-2xl bg-[#06080d] border border-[#1b2334] text-xs text-slate-300">
                <p>{summary.investigationsSummary}</p>
              </div>
            </div>

            {/* 5. Differential Diagnoses & Provisional Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#06080d] border border-[#1b2334]">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  Differential Diagnoses
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-200 font-semibold">
                  {summary.differentialDiagnosis?.map((ddx, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{ddx}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-[#06080d] border border-[#1b2334]">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  Provisional Clinical Plan
                </h4>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editedPlan}
                    onChange={(e) => setEditedPlan(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#06080d] border border-cyan-500 text-white font-sans text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                ) : (
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {summary.provisionalPlan}
                  </p>
                )}
              </div>
            </div>

            {/* Save edits button */}
            {isEditing && (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveEdits}
                  className="px-5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs shadow-lg hover:bg-cyan-300 transition"
                >
                  Save Physician Modifications
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* HL7 FHIR R4 Inspector (Collapsible) */}
      <div className="bg-[#0e121a] border border-[#1b2334] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span>Under the Hood: HL7 FHIR R4 Bundle Payload</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono">
              ABDM NRCES Standard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFhir}
              className="px-3 py-1.5 rounded-lg bg-[#161c28] hover:bg-[#202838] text-xs font-mono font-bold text-slate-300 border border-[#263044] flex items-center gap-1.5 transition"
            >
              {copiedFhir ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFhir ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={() => setShowFhirInspector(!showFhirInspector)}
              className="px-3 py-1.5 rounded-lg bg-[#161c28] hover:bg-[#202838] text-xs font-mono font-bold text-cyan-300 border border-[#263044] transition"
            >
              {showFhirInspector ? 'Hide FHIR' : 'Inspect FHIR'}
            </button>
          </div>
        </div>

        {showFhirInspector && fhirBundle && (
          <div className="mt-4 p-4 rounded-2xl bg-[#06080d] border border-[#1b2334] text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-96">
            <pre>{JSON.stringify(fhirBundle, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
