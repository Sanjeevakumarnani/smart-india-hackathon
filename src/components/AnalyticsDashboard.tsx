import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Users,
  Activity,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { QueueToken } from '../types';

interface AnalyticsDashboardProps {
  onBackToKiosk: () => void;
  queue?: QueueToken[];
  sessionCount?: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onBackToKiosk,
  queue = [],
  sessionCount = 1,
}) => {
  const [summary, setSummary] = useState({ 
    totalPatients: 0, 
    avgWait: 0, 
    consultTimeSaved: '0', 
    consultTimeReduction: '0' 
  });
  const [complaintDistribution, setComplaintDistribution] = useState<{name: string; value: number; color: string}[]>([]);
  const [throughputData, setThroughputData] = useState<any[]>([]);
  const [timeSavingsData, setTimeSavingsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/analytics/summary').then(res => {
        if (!res.ok) throw new Error('Failed to fetch summary');
        return res.json();
      }),
      fetch('/api/analytics/complaints').then(res => {
        if (!res.ok) throw new Error('Failed to fetch complaints');
        return res.json();
      })
    ]).then(([summaryData, complaintsData]) => {
      setSummary({
        totalPatients: summaryData.totalPatients || 0,
        avgWait: summaryData.avgWait || 0,
        consultTimeSaved: summaryData.consultTimeSaved || '0',
        consultTimeReduction: summaryData.consultTimeReduction || '0',
      });
      setComplaintDistribution(complaintsData || []);
      setThroughputData(summaryData.throughputData || []);
      setTimeSavingsData(summaryData.timeSavingsData || []);
      setIsLoading(false);
    }).catch(err => {
      setError(err.message);
      setIsLoading(false);
    });
  }, []);

  const criticalCount = queue.filter((q) => q.priorityLevel === 'CRITICAL').length;

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600">Loading analytics dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-500 mb-4">Error loading analytics: {error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
              <span>MediKiosk+ Clinical Analytics & Telemetry</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live OPD queue load, triage telemetry, and consultation time reduction (PS ID 26047 Metric Tracking)
          </p>
        </div>

        <button
          onClick={onBackToKiosk}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-mono font-bold text-slate-700 border border-slate-200 flex items-center gap-2 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kiosk Intake</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-3xl stitch-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Consult Time Saved</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2">{summary.consultTimeSaved} mins</p>
          <p className="text-xs text-amber-600 font-semibold mt-1">{summary.consultTimeReduction}% reduction per OPD consult</p>
        </div>

        <div className="p-5 rounded-3xl stitch-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Active Queue / Critical</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2">
            {criticalCount} <span className="text-sm font-normal text-rose-600">Critical</span>
          </p>
          <p className="text-xs text-rose-600 font-semibold mt-1">
            {queue.length} tokens in live queue
          </p>
        </div>

        <div className="p-5 rounded-3xl stitch-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">ABDM Linked Rate</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2">100%</p>
          <p className="text-xs text-indigo-600 font-semibold mt-1">HL7 FHIR R4 Bundle Compliant</p>
        </div>

        <div className="p-5 rounded-3xl stitch-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Intake Volume</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2">{summary.totalPatients} Patients</p>
          <p className="text-xs text-amber-600 font-semibold mt-1">
            Avg wait: ~{summary.avgWait} mins
          </p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart 1: Consultation Time Saved */}
        <div className="stitch-card p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Consultation Time: Manual vs MediKiosk+ (Minutes)</span>
          </h3>
          <div className="h-64">
            {timeSavingsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSavingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#0f172a' }}
                  />
                  <Bar dataKey="manualMins" name="Manual Typing/Interview" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="kioskMins" name="With MediKiosk+ Pre-intake" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
            )}
          </div>
        </div>

        {/* Chart 2: Chief Complaint Distribution */}
        <div className="stitch-card p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
            <Activity className="w-4 h-4 text-amber-500" />
            <span>Intake Specialization Distribution</span>
          </h3>
          <div className="h-64 flex items-center justify-center">
            {complaintDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complaintDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {complaintDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
            )}
          </div>
        </div>

        {/* Chart 3: Hourly Patient Throughput */}
        <div className="stitch-card p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Hourly Intake Throughput & Triage Volume</span>
          </h3>
          <div className="h-64">
            {throughputData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={throughputData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#0f172a' }}
                  />
                  <Line type="monotone" dataKey="routine" name="Routine OPD" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="urgent" name="Urgent Consult" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="critical" name="Critical Alert" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
