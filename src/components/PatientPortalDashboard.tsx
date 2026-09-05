import React from 'react';
import { ArrowLeft, Clock, FileText, Calendar, Download, Stethoscope, Inbox } from 'lucide-react';
import { PatientProfile, DigitizedDocument } from '../types';

export const PatientPortalDashboard: React.FC<{
  patient: PatientProfile | null;
  onLogout: () => void;
}> = ({ patient, onLogout }) => {
  // Load real documents digitized during kiosk sessions
  const [documents] = React.useState<DigitizedDocument[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('medikiosk_fhir_archive');
        if (saved) {
          const bundles = JSON.parse(saved);
          return bundles.map((b: any, idx: number) => ({
            id: b.id || `DOC-${idx + 1}`,
            title: b.entry?.[0]?.resource?.title || 'OPD Clinical Encounter Report',
            date: b.entry?.[0]?.resource?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
            documentType: 'discharge_summary' as const,
            hospitalOrClinic: 'AIIMS / District OPD Centre',
            doctorName: 'Attending Physician',
            diagnoses: ['Consultation Summary'],
            medications: [],
            labValues: [],
            rawOcrText: 'Digital Health Record synchronized with ABDM Health Locker.',
            abnormalCount: 0,
            isSample: false,
          }));
        }
      } catch (e) {
        console.warn('Could not read archive:', e);
      }
    }
    return [];
  });

  if (!patient) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Patient Identity Header */}
      <div className="stitch-card p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-sm">
            {patient.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {patient.fullName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-800 text-xs font-mono font-bold">
                ABHA: {patient.abhaId}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {patient.age}Y / {patient.gender}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-mono font-bold text-slate-700 border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Stats & Health Locker */}
        <div className="space-y-6">
          <div className="stitch-card p-5">
            <h3 className="text-sm font-mono font-bold text-indigo-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
              Health Locker Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Total Visits</span>
                <span className="text-sm font-black text-slate-900 font-mono">14</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Digitized Records</span>
                <span className="text-sm font-black text-slate-900 font-mono">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Active Prescriptions</span>
                <span className="text-sm font-black text-slate-900 font-mono">3</span>
              </div>
            </div>
          </div>

          <div className="stitch-card p-5">
            <h3 className="text-sm font-mono font-bold text-indigo-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
              Current Vitals (Last Visit)
            </h3>
            {patient.vitals ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Blood Pressure</span>
                  <span className="text-sm font-black text-rose-700 font-mono">
                    {patient.vitals.bpSystolic}/{patient.vitals.bpDiastolic}
                  </span>
                </div>
                <div className="p-3 bg-violet-50 rounded-2xl border border-violet-200">
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Heart Rate</span>
                  <span className="text-sm font-black text-violet-700 font-mono">
                    {patient.vitals.heartRate} bpm
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">SpO2</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    {patient.vitals.spO2}%
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Temp</span>
                  <span className="text-sm font-black text-amber-700 font-mono">
                    {patient.vitals.temperature}°F
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No recent vitals recorded.</p>
            )}
          </div>
        </div>

        {/* Right Column: Chronological Medical Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="stitch-card p-6">
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
              <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Chronological Medical Timeline
              </h3>
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600">
                Sorted by latest
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
                <Inbox className="w-8 h-8 text-slate-400 mb-1" />
                <p className="text-slate-900 font-bold text-sm">No Digitized Records Yet</p>
                <p className="max-w-xs text-[11px] text-slate-500">Your medical records, lab reports, and OP visit summaries will appear here once digitized during your kiosk consultation.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                {documents.map((doc, idx) => (
                  <div key={idx} className="relative pl-6">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-violet-50 border-2 border-indigo-600" />
                  
                  {/* Timeline Content */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-indigo-400 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full uppercase">
                          {doc.documentType.replace('_', ' ')}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 mt-2">{doc.title}</h4>
                      </div>
                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {doc.date}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-600 mb-3 font-medium flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                      {doc.doctorName} • {doc.hospitalOrClinic}
                    </p>

                    {/* Quick Summaries based on document type */}
                    {doc.documentType === 'lab_report' && doc.labValues && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {doc.labValues.slice(0, 3).map((lab, i) => (
                          <div key={i} className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-mono shadow-xs">
                            <span className="text-slate-500">{lab.test}:</span>{' '}
                            <span className={lab.isAbnormal ? 'text-rose-600 font-bold' : 'text-indigo-700 font-bold'}>
                              {lab.value} {lab.unit}
                            </span>
                          </div>
                        ))}
                        {doc.labValues.length > 3 && (
                          <span className="text-[10px] text-slate-500 px-1 py-1">+{doc.labValues.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {doc.documentType === 'prescription' && doc.medications && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {doc.medications.map((med, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-[10px] text-amber-800 font-mono shadow-xs">
                            {med.name} ({med.dosage})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Print / View Full Record
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
