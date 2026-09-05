import React, { useEffect, useState } from 'react';
import { Bell, Activity, ArrowRight, UserCheck } from 'lucide-react';
import { QueueToken } from '../types';

interface FloatingCurrentTokenProps {
  onViewQueue?: () => void;
}

export const FloatingCurrentToken: React.FC<FloatingCurrentTokenProps> = ({ onViewQueue }) => {
  const [currentToken, setCurrentToken] = useState<QueueToken | null>(null);
  const [waitingCount, setWaitingCount] = useState<number>(0);

  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const res = await fetch('/api/queue');
        if (res.ok) {
          const list: QueueToken[] = await res.json();
          // Find currently called or in-consult token
          const active = list.find((t) => t.status === 'IN_CONSULT' || (t as any).status === 'CALLED');
          if (active) {
            setCurrentToken(active);
          } else if (list.length > 0) {
            // First waiting token
            setCurrentToken(list[0]);
          }
          setWaitingCount(list.filter((t) => t.status === 'WAITING').length);
        }
      } catch {
        // Quiet fallback
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!currentToken) {
    return null;
  }

  const tokenBadge = `A-${currentToken.tokenNumber ? String(currentToken.tokenNumber).padStart(3, '0') : '041'}`;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full animate-bounce-short">
      <div className="bg-slate-900/95 backdrop-blur text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                Now Serving
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black tracking-tight text-white">{tokenBadge}</span>
              <span className="text-xs font-medium text-slate-300">
                {currentToken.roomNumber || 'Room 104'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 border-l border-slate-800 pl-3">
          <div className="text-[10px] font-medium text-slate-400">Queue Behind</div>
          <div className="text-xs font-bold text-teal-400 flex items-center justify-end gap-1">
            <Activity className="w-3 h-3" />
            <span>{waitingCount} waiting</span>
          </div>
        </div>
      </div>
    </div>
  );
};

