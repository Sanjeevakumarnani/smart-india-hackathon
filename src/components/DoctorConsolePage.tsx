import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Users,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  LogOut,
  ChevronRight,
  Shield,
  Activity,
  Phone,
  FileText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { QueueToken, PatientProfile, HistoryObject, DigitizedDocument, LanguageCode } from '../types';
import { PhysicianSummaryConsole } from './PhysicianSummaryConsole';
import { AuthUser } from './StaffLoginScreen';

interface DoctorConsolePageProps {
  currentUser: AuthUser;
  onLogout: () => void;
  activePatientProfile: PatientProfile | null;
  activeHistory: HistoryObject;
  activeDocuments: DigitizedDocument[];
  selectedLanguage: LanguageCode;
  onOpenWhatsApp: () => void;
  createdToken: QueueToken | null;
}

export const DoctorConsolePage: React.FC<DoctorConsolePageProps> = ({
  currentUser,
  onLogout,
  activePatientProfile,
  activeHistory,
  activeDocuments,
  selectedLanguage,
  onOpenWhatsApp,
  createdToken,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'console'>('queue');
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [selectedToken, setSelectedToken] = useState<QueueToken | null>(null);

  // Reprioritize Modal State
  const [reprioModalOpen, setReprioModalOpen] = useState(false);
  const [targetToken, setTargetToken] = useState<QueueToken | null>(null);
  const [overrideReason, setOverrideReason] = useState('Severe clinical presentation requiring immediate medical attention');
  const [isSubmittingReprio, setIsSubmittingReprio] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch('/api/queue');
      if (res.ok) {
        const data = await res.json();
        setQueueTokens(data);
      }
    } catch {
      // Fallback handled quietly
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenReprioritizeModal = (token: QueueToken) => {
    setTargetToken(token);
    setReprioModalOpen(true);
  };

  const handleConfirmReprioritize = async () => {
    if (!targetToken) return;
    setIsSubmittingReprio(true);

    try {
      const res = await fetch(`/api/queue/${targetToken.tokenId || (targetToken as any).id}/reprioritize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPosition: 1,
          priorityLevel: 'CRITICAL',
          reason: overrideReason,
          doctorId: currentUser.employeeId || currentUser.username,
        }),
      });

      if (res.ok) {
        setActionNotice(`Patient ${targetToken.patientName} (${targetToken.tokenNumber}) elevated to Top Priority #1`);
        setReprioModalOpen(false);
        await fetchQueue();
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch {
      setActionNotice('Failed to reprioritize patient');
    } finally {
      setIsSubmittingReprio(false);
    }
  };

  const handleCallPatient = async (token: QueueToken) => {
    const id = token.tokenId || (token as any).id;
    try {
      await fetch(`/api/queue/${id}/call`, { method: 'PATCH' });
      setActionNotice(`Called ${token.patientName} (${token.tokenNumber}) to Room`);
      await fetchQueue();
      setTimeout(() => setActionNotice(null), 4000);
    } catch {
      // Fallback
    }
  };

  const handleOpenPatientConsole = (token: QueueToken) => {
    setSelectedToken(token);
    setActiveTab('console');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Doctor Console Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  {currentUser.fullName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{currentUser.department || 'General Medicine'}</span>
                <span>•</span>
                <span>ID: {currentUser.employeeId || 'DOC-001'}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>OPD Queue & Triage</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-[10px] text-teal-300">
                {queueTokens.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'console'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Clinical Summary Console</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchQueue}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingQueue ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Action Notice */}
      {actionNotice && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 text-center flex items-center justify-center gap-2 shadow-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        {activeTab === 'queue' ? (
          <div>
            {/* Queue Summary Header Banner */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>OPD Triage Queue & Clinical Reprioritization</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    Live Sync
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Doctors can review incoming vitals, identify red flags, and instantly promote high-risk patients to the top of the queue.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-rose-600">Critical Red Flags</div>
                  <div className="text-lg font-black text-rose-700">
                    {queueTokens.filter((t) => t.priorityLevel === 'CRITICAL').length}
                  </div>
                </div>

                <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Waiting</div>
                  <div className="text-lg font-black text-slate-800">
                    {queueTokens.filter((t) => t.status === 'WAITING').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Queue Table / Card List */}
            <div className="space-y-3">
              {queueTokens.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700">No patients currently in queue</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    New kiosk intakes will automatically populate this triage list in real-time.
                  </p>
                </div>
              ) : (
                queueTokens.map((token, index) => {
                  const isCritical = token.priorityLevel === 'CRITICAL';
                  const isUrgent = token.priorityLevel === 'URGENT';
                  const isWaiting = token.status === 'WAITING';
                  const isTop = index === 0;

                  return (
                    <div
                      key={token.tokenId || (token as any).id || index}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isCritical
                          ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                          : isUrgent
                          ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {/* Left: Token Position & Patient Info */}
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm shrink-0 border ${
                            isCritical
                              ? 'bg-rose-600 text-white border-rose-700'
                              : isUrgent
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-extrabold leading-tight">
                            {token.tokenNumber || 'A-01'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-900">
                              {token.patientName}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              ({token.age}y / {token.gender})
                            </span>
                            {isCritical && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Critical Red Flag
                              </span>
                            )}
                            {isUrgent && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wide">
                                Urgent
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                            <span className="font-medium text-slate-800">
                              Chief Complaint: <span className="font-semibold">{token.chiefComplaint}</span>
                            </span>
                            {token.redFlagReason && (
                              <span className="text-rose-600 font-bold bg-rose-100/80 px-2 py-0.5 rounded">
                                {token.redFlagReason}
                              </span>
                            )}
                            <span className="text-slate-400">•</span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              Est. Wait: {token.waitMinutes} mins
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (Reprioritize, Call, Examine) */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                        {/* Jump to Top Button (Doctor Reprioritization) */}
                        {!isTop && isWaiting && (
                          <button
                            onClick={() => handleOpenReprioritizeModal(token)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm"
                            title="Reprioritize: Move this patient ahead to position #1"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                            <span>Jump to Top (#1)</span>
                          </button>
                        )}

                        {/* Call Patient Button */}
                        {isWaiting && (
                          <button
                            onClick={() => handleCallPatient(token)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call In</span>
                          </button>
                        )}

                        {/* Examine & Open Console Button */}
                        <button
                          onClick={() => handleOpenPatientConsole(token)}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm"
                        >
                          <span>Examine</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Embedded Clinical Summary Console */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setActiveTab('queue')}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                ← Back to OPD Queue
              </button>
              {selectedToken && (
                <div className="text-xs font-semibold text-slate-600">
                  Currently Reviewing: <span className="font-bold text-slate-900">{selectedToken.patientName}</span> ({selectedToken.tokenNumber})
                </div>
              )}
            </div>

            <PhysicianSummaryConsole
              patientProfile={activePatientProfile}
              historyObject={activeHistory}
              documents={activeDocuments}
              selectedLanguage={selectedLanguage}
              onOpenWhatsApp={onOpenWhatsApp}
              onOpenQueue={() => setActiveTab('queue')}
              createdToken={selectedToken || createdToken}
            />
          </div>
        )}
      </main>

      {/* Reprioritize Confirmation Modal */}
      {reprioModalOpen && targetToken && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <ArrowUpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Reprioritize Patient to Position #1
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              This action promotes <strong>{targetToken.patientName} (Token {targetToken.tokenNumber})</strong> directly to the front of the queue ahead of other patients.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Justification / Audit Reason
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="State clinical rationale for emergency elevation..."
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReprioModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingReprio}
                onClick={handleConfirmReprioritize}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {isSubmittingReprio ? 'Promoting...' : 'Confirm Elevation to #1'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

