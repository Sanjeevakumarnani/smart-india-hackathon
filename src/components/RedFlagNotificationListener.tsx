import React, { useEffect, useState } from 'react';
import { AlertOctagon, X } from 'lucide-react';
import { broadcastManager } from '../services/broadcastChannel';

interface RedFlagNotificationData {
  tokenNumber: number;
  patientName: string;
  reason: string;
}

export const RedFlagNotificationListener: React.FC = () => {
  const [activeAlerts, setActiveAlerts] = useState<RedFlagNotificationData[]>([]);

  useEffect(() => {
    const handleBroadcast = (data: any) => {
      if (data?.type === 'RED_FLAG_TRIGGERED') {
        const newAlert: RedFlagNotificationData = {
          tokenNumber: data.token?.tokenNumber,
          patientName: data.token?.patientName || 'Unknown',
          reason: data.redFlagReason || 'Critical Condition Detected',
        };
        setActiveAlerts((prev) => [...prev, newAlert]);
        
        // Auto-dismiss after 15 seconds
        setTimeout(() => {
          setActiveAlerts((prev) => prev.filter((a) => a.tokenNumber !== newAlert.tokenNumber));
        }, 15000);
      }
    };

    const unsubscribe = broadcastManager.subscribe(handleBroadcast);
    return () => {
      unsubscribe();
    };
  }, []);

  const dismissAlert = (tokenNum: number) => {
    setActiveAlerts((prev) => prev.filter((a) => a.tokenNumber !== tokenNum));
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {activeAlerts.map((alert, idx) => (
        <div
          key={idx}
          className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl shadow-rose-900/50 backdrop-blur-md animate-in slide-in-from-right-10 fade-in duration-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">
                Emergency Alert
              </span>
            </div>
            <button
              onClick={() => dismissAlert(alert.tokenNumber)}
              className="text-rose-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-2 text-white">
            <p className="text-sm font-bold">
              Token #{alert.tokenNumber} - {alert.patientName}
            </p>
            <p className="text-xs text-rose-200 mt-1 font-mono">
              {alert.reason}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
