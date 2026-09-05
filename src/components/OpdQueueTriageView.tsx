import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertOctagon,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { QueueToken } from '../types';
import { broadcastManager, KioskBroadcastMessage } from '../services/broadcastChannel';

interface OpdQueueTriageViewProps {
  queue: QueueToken[];
  onUpdateQueue: (queue: QueueToken[]) => void;
  onBackToKiosk: () => void;
}

export const OpdQueueTriageView: React.FC<OpdQueueTriageViewProps> = ({
  queue,
  onUpdateQueue,
  onBackToKiosk,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRITICAL' | 'ALLOPATHIC' | 'AYUSH'>('ALL');
  const [lastAlertTime, setLastAlertTime] = useState<string | null>(null);

  // Poll live queue from DB
  useEffect(() => {
    let isMounted = true;
    const fetchQueue = async () => {
      try {
        const response = await fetch('/api/queue');
        if (response.ok) {
          const data = await response.json();
          if (isMounted) onUpdateQueue(data);
        }
      } catch (error) {
        console.error("Failed to fetch live queue:", error);
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onUpdateQueue]);

  // Subscribe to BroadcastChannel for multi-tab live sync
  useEffect(() => {
    const unsubscribe = broadcastManager.subscribe((msg: KioskBroadcastMessage) => {
      if (msg.type === 'RED_FLAG_TRIGGERED' && msg.token) {
        // Insert at top of queue with CRITICAL
        onUpdateQueue([
          msg.token,
          ...queue.filter((q) => q.tokenId !== msg.token?.tokenId),
        ]);
        setLastAlertTime(new Date().toLocaleTimeString());
      } else if (msg.type === 'TOKEN_CREATED' && msg.token) {
        onUpdateQueue([
          ...queue.filter((q) => q.tokenId !== msg.token?.tokenId),
          msg.token,
        ]);
      }
    });

    return () => unsubscribe();
  }, [queue, onUpdateQueue]);

  const handleCallNext = async (token: QueueToken) => {
    const updated = queue.map((t) =>
      t.tokenId === token.tokenId
        ? { ...t, status: 'IN_CONSULT' as const }
        : t.status === 'IN_CONSULT'
        ? { ...t, status: 'COMPLETED' as const }
        : t
    );
    onUpdateQueue(updated);
    
    try {
      const res = await fetch(`/api/queue/${token.tokenId}/call`, { method: 'PATCH' });
      if (!res.ok) throw new Error("Server error");
    } catch (error) {
      console.error("Failed to call next token in DB:", error);
      alert("Error updating token status on server.");
    }
  };

  const handleComplete = async (token: QueueToken) => {
    const updated = queue.map((t) =>
      t.tokenId === token.tokenId ? { ...t, status: 'COMPLETED' as const } : t
    );
    onUpdateQueue(updated);
    
    try {
      const res = await fetch(`/api/queue/${token.tokenId}/complete`, { method: 'PATCH' });
      if (!res.ok) throw new Error("Server error");
    } catch (error) {
      console.error("Failed to complete token in DB:", error);
      alert("Error updating token status on server.");
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (selectedFilter === 'CRITICAL') return item.priorityLevel === 'CRITICAL';
    if (selectedFilter === 'ALLOPATHIC') return item.opdType === 'allopathic';
    if (selectedFilter === 'AYUSH') return item.opdType === 'ayurveda';
    return true;
  });

  const criticalCount = queue.filter((q) => q.priorityLevel === 'CRITICAL').length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600" />
              <span>OPD Triage &amp; Live Queue Display</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold animate-pulse">
              LIVE SYNC
            </span>
            {lastAlertTime && (
              <span className="text-[10px] text-slate-500 font-mono">Alert: {lastAlertTime}</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time patient queue re-ordering with automated emergency triage priority elevation
          </p>
        </div>

        <button
          onClick={onBackToKiosk}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-mono font-bold text-slate-700 border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kiosk Intake</span>
        </button>
      </div>

      {/* Emergency Active Banner */}
      {criticalCount > 0 && (
        <div className="mb-6 p-4 rounded-3xl bg-rose-50 border-2 border-rose-400 shadow-sm flex items-center justify-between text-rose-900 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-600 text-white">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-rose-800">
                CRITICAL TRIAGE ALERT: {criticalCount} RED-FLAG PATIENT(S) IN QUEUE
              </p>
              <p className="text-xs text-rose-700">
                Automatic priority override applied — Token moved to head of consult list
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black font-mono">
            HIGH ATTENTION
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={selectedFilter === 'ALL'}
          onClick={() => setSelectedFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition shadow-xs ${
            selectedFilter === 'ALL'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
          }`}
        >
          All Patients ({queue.length})
        </button>

        <button
          role="tab"
          aria-selected={selectedFilter === 'CRITICAL'}
          onClick={() => setSelectedFilter('CRITICAL')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-xs ${
            selectedFilter === 'CRITICAL'
              ? 'bg-rose-600 text-white'
              : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Critical Emergency ({criticalCount})</span>
        </button>

        <button
          role="tab"
          aria-selected={selectedFilter === 'ALLOPATHIC'}
          onClick={() => setSelectedFilter('ALLOPATHIC')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition shadow-xs ${
            selectedFilter === 'ALLOPATHIC'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
          }`}
        >
          Allopathic OPD
        </button>

        <button
          role="tab"
          aria-selected={selectedFilter === 'AYUSH'}
          onClick={() => setSelectedFilter('AYUSH')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition shadow-xs ${
            selectedFilter === 'AYUSH'
              ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
          }`}
        >
          AYUSH / Ayurveda OPD
        </button>
      </div>

      {/* Queue Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQueue.map((token) => {
          const isCritical = token.priorityLevel === 'CRITICAL';
          const isInConsult = token.status === 'IN_CONSULT';
          const isCompleted = token.status === 'COMPLETED';

          return (
            <div
              key={token.tokenId}
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between shadow-sm ${
                isCritical
                  ? 'bg-rose-50 border-rose-400'
                  : isInConsult
                  ? 'stitch-card-active'
                  : isCompleted
                  ? 'bg-slate-100 border-slate-200 opacity-60'
                  : 'stitch-card'
              }`}
            >
              <div>
                {/* Card Top Pill */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl font-black font-mono ${
                        isCritical
                          ? 'text-rose-600'
                          : isInConsult
                          ? 'text-indigo-700'
                          : 'text-slate-900'
                      }`}
                    >
                      #{token.tokenNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase ${
                        isCritical
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {token.priorityLevel}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isInConsult
                        ? 'bg-indigo-600 text-white font-black'
                        : isCompleted
                        ? 'bg-slate-200 text-slate-600 border border-slate-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {token.status}
                  </span>
                </div>

                {/* Patient Details */}
                <h3 className="text-base font-black text-slate-900">
                  {token.patientName}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {token.age} Y / {token.gender} • ABHA: {token.abhaId}
                </p>

                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">
                    Chief Complaint:
                  </span>
                  <p className="text-slate-800 font-semibold mt-0.5">
                    {token.chiefComplaint}
                  </p>
                  {token.redFlagReason && (
                    <p className="text-rose-600 font-bold mt-1 text-[11px] font-mono">
                      ⚠️ {token.redFlagReason}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>{token.roomNumber}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>~{token.waitMinutes} mins wait</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons for Kiosk/Nurse Station */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                {isInConsult ? (
                  <button
                    onClick={() => handleComplete(token)}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    Mark Consult Finished
                  </button>
                ) : !isCompleted ? (
                  <button
                    onClick={() => handleCallNext(token)}
                    className="w-full py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition shadow"
                  >
                    Call into Consult Room
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold text-center w-full">
                    ✓ Consult Completed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
