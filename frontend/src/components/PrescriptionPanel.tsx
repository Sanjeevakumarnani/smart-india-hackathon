import { apiFetch, apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import {
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Sparkles,
  Stethoscope,
  Send,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { PatientProfile, HistoryObject, LanguageCode, PrescriptionMedicationItem } from '../types';

interface PrescriptionPanelProps {
  patientProfile: PatientProfile | null;
  historyObject: HistoryObject;
  selectedLanguage: LanguageCode;
  doctorName?: string;
  doctorDepartment?: string;
  encounterId?: string;
}

const COMMON_PRESCRIPTION_TEMPLATES = [
  {
    name: 'Fever & Viral Cold Protocol',
    meds: [
      { medicineName: 'Paracetamol 650mg', dosage: '650mg', frequency: '1-0-1 (After meals)', duration: '3 Days', instructions: 'Take when fever > 100°F' },
      { medicineName: 'Cetirizine 10mg', dosage: '10mg', frequency: '0-0-1 (Bedtime)', duration: '5 Days', instructions: 'May cause mild drowsiness' },
      { medicineName: 'Pantoprazole 40mg', dosage: '40mg', frequency: '1-0-0 (Before breakfast)', duration: '5 Days', instructions: 'Empty stomach' },
    ],
  },
  {
    name: 'Acid Peptic & Gastritis Protocol',
    meds: [
      { medicineName: 'Rabeprazole 20mg + Domperidone 30mg', dosage: '20/30mg', frequency: '1-0-0 (Before food)', duration: '14 Days', instructions: 'Take 30 mins before breakfast' },
      { medicineName: 'Sucralfate Suspension', dosage: '10ml', frequency: '1-0-1 (2 hours after meals)', duration: '7 Days', instructions: 'Shake well before use' },
    ],
  },
  {
    name: 'Ayurvedic Deepana-Pachana & Joint Protocol',
    meds: [
      { medicineName: 'Yograj Guggulu', dosage: '2 Tablets', frequency: '1-0-1 (After food with warm water)', duration: '30 Days', instructions: 'Avoid cold and sour food' },
      { medicineName: 'Dashamularishta', dosage: '15ml', frequency: '1-0-1 (Equal water mixed)', duration: '20 Days', instructions: 'After lunch and dinner' },
      { medicineName: 'Triphala Churna', dosage: '3 grams', frequency: '0-0-1 (At bedtime)', duration: '30 Days', instructions: 'With lukewarm water' },
    ],
  },
];

export const PrescriptionPanel: React.FC<PrescriptionPanelProps> = ({
  patientProfile,
  historyObject,
  selectedLanguage,
  doctorName = 'Dr. Priya Sharma (MD)',
  doctorDepartment = 'General Medicine & AYUSH OPD',
  encounterId,
}) => {
  const [medications, setMedications] = useState<PrescriptionMedicationItem[]>([
    {
      id: 'med-1',
      medicineName: 'Tab. Paracetamol',
      dosage: '650mg',
      frequency: '1-0-1 (After Food)',
      duration: '3 Days',
      instructions: 'Take when fever or severe body pain occurs',
    },
    {
      id: 'med-2',
      medicineName: 'Tab. Pantoprazole',
      dosage: '40mg',
      frequency: '1-0-0 (Before Breakfast)',
      duration: '5 Days',
      instructions: 'Empty stomach with plain water',
    },
  ]);

  const [generalInstructions, setGeneralInstructions] = useState(
    'Drink plenty of warm fluids. Avoid heavy, oily, and outside food. Follow up in OPD after 5 days if symptoms persist.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [issuedPrescriptions, setIssuedPrescriptions] = useState<any[]>([]);

  // Load existing prescriptions for this patient
  const loadExistingPrescriptions = async () => {
    try {
      const pId = patientProfile?.id || 'PAT-DEFAULT';
      const res = await apiFetch(`/api/prescriptions/patient/${encodeURIComponent(pId)}`);
      if (res.ok) {
        const data = await res.json();
        setIssuedPrescriptions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error loading patient prescriptions:', err);
    }
  };

  useEffect(() => {
    loadExistingPrescriptions();
  }, [patientProfile]);

  const handleAddMedication = () => {
    const newMed: PrescriptionMedicationItem = {
      id: `med-${Date.now()}`,
      medicineName: '',
      dosage: '1 Tablet / 5ml',
      frequency: '1-0-1 (After Food)',
      duration: '5 Days',
      instructions: 'Take with water after meals',
    };
    setMedications([...medications, newMed]);
  };

  const handleUpdateMedication = (index: number, field: keyof PrescriptionMedicationItem, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleApplyTemplate = (tmpl: typeof COMMON_PRESCRIPTION_TEMPLATES[0]) => {
    const mapped: PrescriptionMedicationItem[] = tmpl.meds.map((m, i) => ({
      id: `med-${Date.now()}-${i}`,
      medicineName: m.medicineName,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      instructions: m.instructions,
    }));
    setMedications(mapped);
  };

  const handleSavePrescription = async () => {
    if (medications.length === 0) return;
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const res = await apiFetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: encounterId || ('ENC-CONSULT-' + Date.now().toString().slice(-4)),
          patientId: patientProfile?.id || 'PAT-DEFAULT',
          prescribedBy: doctorName,
          doctorDepartment,
          medications,
          instructions: generalInstructions,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        await loadExistingPrescriptions();
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Save prescription error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Doctor Electronic Prescription &amp; Medication Order
              </h2>
              <p className="text-xs text-slate-500">
                Prescribe medications, set dosages &amp; duration, and issue digital prescriptions to patient ABHA PHR
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Rx Slip</span>
          </button>

          <button
            type="button"
            disabled={isSaving || medications.length === 0}
            onClick={handleSavePrescription}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Issue &amp; Save Prescription</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 flex items-center gap-3 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong className="block text-xs uppercase tracking-wider font-black">
              Prescription Successfully Issued &amp; Saved
            </strong>
            <span className="text-xs">
              Medication order stored in hospital database and synchronized with the patient's consultation report.
            </span>
          </div>
        </div>
      )}

      {/* Patient & Doctor Context Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">Patient Details</span>
          <p className="text-base font-black text-white mt-0.5">
            {patientProfile?.fullName || 'Walk-in Patient'}
          </p>
          <p className="text-xs text-slate-400 font-mono">
            {patientProfile?.age || 35} Y / {patientProfile?.gender || 'Male'} • ID: {patientProfile?.id || 'PAT-DEFAULT'}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">Chief Complaint</span>
          <p className="text-sm font-bold text-slate-200 mt-0.5">
            {historyObject.chiefComplaint || 'General Consultation'}
          </p>
          <p className="text-xs text-slate-400">
            OPD Type: <span className="font-bold text-teal-300 uppercase">{historyObject.opdType || 'Allopathic'}</span>
          </p>
        </div>

        <div>
          <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">Prescribing Physician</span>
          <p className="text-sm font-bold text-white mt-0.5">{doctorName}</p>
          <p className="text-xs text-slate-400">{doctorDepartment}</p>
        </div>
      </div>

      {/* Quick Prescription Templates */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Quick Prescription Templates (तेज़ प्रिस्क्रिप्शन टेम्पलेट)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {COMMON_PRESCRIPTION_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyTemplate(tmpl)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>+ {tmpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Medications Table Builder */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Prescribed Medicines &amp; Regimens ({medications.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={handleAddMedication}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {medications.map((med, idx) => (
            <div
              key={med.id}
              className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
            >
              <div className="sm:col-span-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Medicine Name &amp; Strength
                </label>
                <input
                  type="text"
                  value={med.medicineName}
                  onChange={(e) => handleUpdateMedication(idx, 'medicineName', e.target.value)}
                  placeholder="e.g. Tab. Paracetamol 650mg"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Dosage / Unit
                </label>
                <input
                  type="text"
                  value={med.dosage}
                  onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                  placeholder="e.g. 650mg / 1 Tab"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Frequency (खुराक का समय)
                </label>
                <select
                  value={med.frequency}
                  onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                >
                  <option value="1-0-1 (After Food)">1-0-1 (Morning &amp; Night after food)</option>
                  <option value="1-1-1 (After Food)">1-1-1 (Three times a day)</option>
                  <option value="1-0-0 (Before Breakfast)">1-0-0 (Morning empty stomach)</option>
                  <option value="0-0-1 (Bedtime)">0-0-1 (Bedtime at night)</option>
                  <option value="SOS / As Needed">SOS (When needed for pain/fever)</option>
                  <option value="Once Weekly">Once Weekly</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  value={med.duration}
                  onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                  placeholder="e.g. 5 Days"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                <button
                  type="button"
                  onClick={() => handleRemoveMedication(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Remove Medicine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="sm:col-span-12">
                <input
                  type="text"
                  value={med.instructions}
                  onChange={(e) => handleUpdateMedication(idx, 'instructions', e.target.value)}
                  placeholder="Special instructions (e.g. take with lukewarm milk or avoid milk)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* General Advice & Dietary Guidance */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Physician Advice &amp; Lifestyle / Pathya Guidance (परामर्श व परहेज)</span>
        </label>
        <textarea
          rows={3}
          value={generalInstructions}
          onChange={(e) => setGeneralInstructions(e.target.value)}
          className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 leading-relaxed focus:border-teal-500 focus:outline-none"
          placeholder="Enter patient dietary restrictions, lifestyle guidance, and emergency precautions..."
        />
      </div>

      {/* Past Prescriptions History */}
      {issuedPrescriptions.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Prescription History for this Patient ({issuedPrescriptions.length})</span>
          </h3>
          <div className="space-y-2">
            {issuedPrescriptions.map((rx) => (
              <div key={rx.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">Rx Ref: {rx.id}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(rx.issuedAt || rx.issued_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-700 font-medium mt-0.5">
                    Prescribed by {rx.prescribedBy || rx.prescribed_by} ({rx.doctorDepartment || rx.doctor_department})
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {Array.isArray(rx.medications)
                      ? rx.medications.map((m: any) => `${m.medicineName} (${m.dosage})`).join(', ')
                      : 'Prescription details logged'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase font-mono">
                  Issued
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
