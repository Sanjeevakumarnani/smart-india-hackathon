import { apiFetch, apiUrl } from '../config/api';
import React from 'react';
import { ArrowLeft, Clock, FileText, Calendar, Download, Stethoscope, Inbox } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PatientProfile, DigitizedDocument } from '../types';

export const PatientPortalDashboard: React.FC<{
  patient: PatientProfile | null;
  onLogout: () => void;
}> = ({ patient, onLogout }) => {
  const [documents, setDocuments] = React.useState<DigitizedDocument[]>([]);
  const [recordCounts, setRecordCounts] = React.useState({ visits: 0, documents: documents.length, prescriptions: 0 });
  const [isLoadingRecords, setIsLoadingRecords] = React.useState(true);

  React.useEffect(() => {
    if (!patient?.id) return;
    let active = true;
    setIsLoadingRecords(true);
    const portalToken = sessionStorage.getItem('medikiosk_patient_portal_token');
    if (!portalToken) {
      setIsLoadingRecords(false);
      return;
    }
    apiFetch(`/api/patients/${encodeURIComponent(patient.id)}/records`, {
      headers: { Authorization: `Bearer ${portalToken}` },
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Failed to load records')))
      .then((data) => {
        if (!active) return;
        const serverDocuments = Array.isArray(data.documents) ? data.documents : [];
        const summaries = Array.isArray(data.summaries) ? data.summaries : [];
        setRecordCounts(data.counts || { visits: 0, documents: serverDocuments.length, prescriptions: 0 });
        setDocuments([
          ...summaries.map((summary: any, index: number) => ({
            id: summary.id || `SUM-${index + 1}`,
            title: 'Clinical visit summary',
            date: summary.updated_at?.split('T')[0] || summary.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            documentType: 'discharge_summary' as const,
            hospitalOrClinic: 'MediKiosk OPD',
            doctorName: 'Attending Physician',
            diagnoses: summary.differentialDiagnosis || [],
            medications: [],
            labValues: [],
            rawOcrText: summary.summary?.hpi || summary.hpi || summary.provisional_plan || '',
            abnormalCount: Array.isArray(summary.redFlags) ? summary.redFlags.length : 0,
            isSample: false,
          })),
          ...serverDocuments.map((document: any, index: number) => ({
            id: document.id || `DOC-${index + 1}`,
            title: document.title || 'OPD Clinical Encounter Report',
            date: document.document_date || document.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            documentType: document.document_type || 'discharge_summary',
            hospitalOrClinic: document.hospital_or_clinic || 'OPD Centre',
            doctorName: document.doctor_name || 'Attending Physician',
            diagnoses: document.diagnoses || [],
            medications: document.medications || [],
            labValues: document.labValues || [],
            rawOcrText: document.raw_ocr_text || '',
            abnormalCount: document.abnormalCount || 0,
            isSample: false,
          })),
        ]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoadingRecords(false);
      });
    return () => { active = false; };
  }, [patient?.id]);

  const handleDownloadPdf = (docItem: DigitizedDocument) => {
    if (!patient) return;
    const pdf = new jsPDF();

    // Header bar
    pdf.setFillColor(67, 56, 202);
    pdf.rect(0, 0, 210, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MediKiosk+ Ayushman Digital OPD', 14, 18);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Official Clinical Encounter Summary & Record', 14, 25);

    // Patient Information Block
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Patient Information', 14, 42);

    pdf.setDrawColor(226, 232, 240);
    pdf.line(14, 45, 196, 45);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Patient Name: ${patient.fullName}`, 14, 53);
    pdf.text(`ABHA ID: ${patient.abhaId}`, 110, 53);
    pdf.text(`Age / Gender: ${patient.age}Y / ${patient.gender}`, 14, 60);
    pdf.text(`Contact: ${patient.phone || 'N/A'}`, 110, 60);
    pdf.text(`Blood Group: ${patient.bloodGroup || 'N/A'}`, 14, 67);
    pdf.text(`Encounter Date: ${docItem.date || new Date().toISOString().split('T')[0]}`, 110, 67);

    // Clinical Summary Block
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Clinical Encounter Details', 14, 80);
    pdf.line(14, 83, 196, 83);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Document Title: ${docItem.title}`, 14, 91);
    pdf.text(`Category: ${docItem.documentType.toUpperCase()}`, 110, 91);
    pdf.text(`Facility: ${docItem.hospitalOrClinic}`, 14, 98);
    pdf.text(`Attending Physician: ${docItem.doctorName}`, 110, 98);

    // Vitals block
    if (patient.vitals) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recorded Vitals', 14, 112);
      pdf.line(14, 115, 196, 115);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Blood Pressure: ${patient.vitals.bpSystolic}/${patient.vitals.bpDiastolic} mmHg`, 14, 123);
      pdf.text(`Heart Rate: ${patient.vitals.heartRate} bpm`, 75, 123);
      pdf.text(`SpO2: ${patient.vitals.spO2}%`, 130, 123);
      pdf.text(`Temperature: ${patient.vitals.temperature}°F`, 165, 123);
    }

    const textStartY = patient.vitals ? 138 : 112;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Clinical Record Transcript / Summary', 14, textStartY);
    pdf.line(14, textStartY + 3, 196, textStartY + 3);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(
      docItem.rawOcrText || 'Digital health record securely verified and synchronized with ABDM Health Locker under DPDP Act 2023.',
      180
    );
    pdf.text(splitNotes, 14, textStartY + 12);

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Digitally generated via MediKiosk+ Ayushman Digital OPD Kiosk System. DPDP Act 2023 Compliant.', 14, 285);

    pdf.save(`MediKiosk_${docItem.id || 'Summary'}.pdf`);
  };

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
                <span className="text-sm font-black text-slate-900 font-mono">{recordCounts.visits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Digitized Records</span>
                <span className="text-sm font-black text-slate-900 font-mono">{recordCounts.documents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Active Prescriptions</span>
                <span className="text-sm font-black text-slate-900 font-mono">{recordCounts.prescriptions}</span>
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

            {isLoadingRecords ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading your records...</div>
            ) : documents.length === 0 ? (
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
                        onClick={() => handleDownloadPdf(doc)}
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
