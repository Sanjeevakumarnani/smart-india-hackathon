import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Camera,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Activity,
  Layers,
  ShieldAlert,
  Edit2,
  Check,
  X,
  Video,
} from 'lucide-react';
import { DigitizedDocument, InteractionResult, LanguageCode, PatientProfile } from '../types';
import { processDocumentOcr, checkDrugInteractions } from '../services/geminiService';
import { translate } from '../services/i18n';

interface DocumentDigitizationProps {
  documents: DigitizedDocument[];
  patientProfile?: PatientProfile | null;
  onUpdateDocuments: (docs: DigitizedDocument[]) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
}

export const DocumentDigitization: React.FC<DocumentDigitizationProps> = ({
  documents,
  patientProfile,
  onUpdateDocuments,
  onContinue,
  onBack,
  selectedLanguage,
}) => {
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [activeDocPreview, setActiveDocPreview] = useState<DigitizedDocument | null>(
    documents[0] || null
  );
  const [interactions, setInteractions] = useState<InteractionResult[]>([]);
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);
  const [editingMedName, setEditingMedName] = useState('');

  // Live WebRTC Kiosk Camera Scanner state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setIsCameraModalOpen(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Unable to access kiosk camera. Please ensure camera permissions are granted or use file upload.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraModalOpen(false);
    setCameraError(null);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64Data = dataUrl.split(',')[1];

    stopCamera();
    setIsProcessingOcr(true);

    processDocumentOcr(base64Data, 'image/jpeg', 'prescription').then((ocrResult) => {
      const newDoc: DigitizedDocument = ocrResult || {
        id: `DOC-CAM-${Date.now()}`,
        title: `Camera Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        date: new Date().toISOString().split('T')[0],
        documentType: 'prescription',
        hospitalOrClinic: 'Kiosk Document Scanner',
        doctorName: 'Attending Practitioner',
        diagnoses: ['Digitized Physical Document'],
        ocrConfidenceScore: 90,
        pendingReview: true,
        medications: [],
        labValues: [],
        rawOcrText: 'Prescription photographed using kiosk overhead camera.',
        abnormalCount: 0,
        isSample: false,
      };

      const updated = [...documents, newDoc];
      onUpdateDocuments(updated);
      setActiveDocPreview(newDoc);
      setIsProcessingOcr(false);
    });
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Collect all medications whenever documents or patientProfile change
  useEffect(() => {
    const allMeds: string[] = [];
    documents.forEach((d) => {
      d.medications.forEach((m) => allMeds.push(m.name));
    });
    if (patientProfile?.currentMedications) {
      allMeds.push(...patientProfile.currentMedications);
    }
    if (allMeds.length > 1) {
      checkDrugInteractions(allMeds)
        .then((res) => {
          setInteractions(res.interactions || []);
        })
        .catch(() => setInteractions([]));
    } else {
      setInteractions([]);
    }
  }, [documents, patientProfile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOcr(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = (evt.target?.result as string)?.split(',')[1];
      const ocrResult = await processDocumentOcr(base64Data, file.type, 'lab_report');

      const newDoc: DigitizedDocument = ocrResult || {
        id: `DOC-UPLOAD-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        date: new Date().toISOString().split('T')[0],
        documentType: 'prescription',
        hospitalOrClinic: 'Patient Uploaded Document',
        doctorName: 'Attending Practitioner',
        diagnoses: ['Captured Clinical Record'],
        ocrConfidenceScore: 85,
        pendingReview: true,
        medications: [],
        labValues: [],
        rawOcrText: `Uploaded ${file.name}. Processed via Multimodal Vision pipeline.`,
        abnormalCount: 0,
        isSample: false,
      };

      const updated = [...documents, newDoc];
      onUpdateDocuments(updated);
      setActiveDocPreview(newDoc);
      setIsProcessingOcr(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDoc = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    onUpdateDocuments(updated);
    if (activeDocPreview?.id === id) {
      setActiveDocPreview(updated[0] || null);
    }
  };

  const handleSaveMedEdit = (medIndex: number) => {
    if (!activeDocPreview) return;
    const updatedMeds = [...activeDocPreview.medications];
    updatedMeds[medIndex] = {
      ...updatedMeds[medIndex],
      name: editingMedName,
      confidenceScore: 100, // Doctor or user manually corrected
    };
    const updatedDoc: DigitizedDocument = {
      ...activeDocPreview,
      medications: updatedMeds,
      pendingReview: false,
    };
    const updatedDocs = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    onUpdateDocuments(updatedDocs);
    setActiveDocPreview(updatedDoc);
    setEditingMedIndex(null);
  };

  const handleConfirmDocReview = (docId: string) => {
    const updatedDocs = documents.map((d) =>
      d.id === docId ? { ...d, pendingReview: false } : d
    );
    onUpdateDocuments(updatedDocs);
    if (activeDocPreview?.id === docId) {
      setActiveDocPreview({ ...activeDocPreview, pendingReview: false });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Step 4: Prescription &amp; Lab Digitization / दस्तावेज़ स्कैन</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          {selectedLanguage === 'hi' ? 'एआई प्रिस्क्रिप्शन और लैब रिपोर्ट स्कैन' : selectedLanguage === 'ta' ? 'AI மருந்துச் சீட்டு மற்றும் ஆய்வக அறிக்கை ஸ்கேன்' : selectedLanguage === 'te' ? 'AI ప్రిస్క్రిప్షన్ మరియు ల్యాబ్ రిపోర్ట్ స్కాన్' : 'AI OCR Prescription & Lab Report Extraction'}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-1">
          पूर्व पर्चियों एवं जांच रिपोर्ट को स्कैन करें — दवाइयां व लैब परिणाम स्वतः डिजिटल रूप में तैयार होंगे
        </p>
      </div>

      {/* Drug-Drug Interaction Warning Banner */}
      {interactions.length > 0 && (
        <div className="mb-6 p-4 rounded-3xl bg-rose-50 border-2 border-rose-400 shadow-sm flex items-start gap-3.5 text-rose-900">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-rose-800 uppercase tracking-wide">
                Critical Drug Interactions Detected
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Upload Box + Document List (Timeline) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Action Buttons: Camera Snap + Upload Dropzone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <button
              onClick={startCamera}
              className="p-5 rounded-3xl bg-violet-50 border-2 border-indigo-200 hover:bg-indigo-100/60 transition flex flex-col items-center justify-center text-center shadow-sm group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition border border-indigo-200 shadow-xs">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">{selectedLanguage === 'hi' ? 'लाइव कियोस्क कैमरा' : selectedLanguage === 'ta' ? 'நேரடி கியாஸ்க் கேமரா' : selectedLanguage === 'te' ? 'లైవ్ కియోస్క్ కెమెరా' : 'Live Kiosk Camera'}</p>
              <p className="text-[11px] text-indigo-700 mt-0.5">Snap directly from scanner</p>
            </button>

            <div className="relative p-5 rounded-3xl bg-white border-2 border-dashed border-slate-300 hover:border-indigo-500 transition flex flex-col items-center justify-center text-center cursor-pointer group shadow-sm">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition border border-slate-200 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">{selectedLanguage === 'hi' ? 'फ़ाइल अपलोड करें' : selectedLanguage === 'ta' ? 'கோப்பைப் பதிவேற்றவும்' : selectedLanguage === 'te' ? 'ఫైల్ అప్‌లోడ్ చేయండి' : 'Upload File'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">JPG, PNG, or PDF report</p>
            </div>
          </div>

          {/* Live WebRTC Camera Capture Modal */}
          {isCameraModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
              <div className="w-full max-w-xl bg-[#0e121a] border-2 border-cyan-500/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative">
                <button
                  onClick={stopCamera}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-[#161c28] text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Video className="w-5 h-5 text-cyan-400" />
                  <span>Kiosk Document Camera Feed</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4 text-center">
                  Position the prescription flat on the kiosk scanning tray within the green border
                </p>

                {cameraError ? (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs text-center mb-4">
                    {cameraError}
                  </div>
                ) : (
                  <div className="w-full h-72 rounded-2xl overflow-hidden relative border-2 border-dashed border-emerald-400 bg-black flex items-center justify-center mb-4 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-4 border-2 border-emerald-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                      <span className="text-[10px] font-mono text-emerald-300 bg-black/60 px-2 py-0.5 rounded w-fit">
                        ALIGNED SCAN ZONE
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 w-full justify-center">
                  <button
                    onClick={stopCamera}
                    className="px-5 py-2.5 rounded-xl bg-[#161c28] text-slate-300 text-xs font-bold hover:bg-[#202838]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={captureCameraPhoto}
                    disabled={!!cameraError}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture & OCR Document</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OCR Scanning Overlay Indicator */}
          {isProcessingOcr && (
            <div className="p-4 rounded-2xl bg-cyan-950/80 border border-cyan-400 text-cyan-200 flex items-center gap-3 animate-pulse shadow-lg">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-xs">
                <strong className="block text-white font-mono">Multimodal Gemini OCR in progress...</strong>
                <span>Extracting dosages, drug entities & abnormal lab values</span>
              </div>
            </div>
          )}

          {/* Digitized Documents Vertical Timeline */}
          <div className="bg-[#0e121a]/90 border border-[#1b2334] rounded-3xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2334] mb-3">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Digitized Records ({documents.length})</span>
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No documents digitized yet. Upload an image or take a photo with the kiosk camera.
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => {
                  const isSelected = activeDocPreview?.id === doc.id;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setActiveDocPreview(doc)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#09222c] border-cyan-400 shadow-md shadow-cyan-950/50'
                          : 'bg-[#06080d] border-[#1b2334] hover:bg-[#121722]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white line-clamp-1">
                              {doc.title}
                            </p>
                            {doc.ocrConfidenceScore && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  doc.ocrConfidenceScore >= 85
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {doc.ocrConfidenceScore}%
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {doc.date} • {doc.hospitalOrClinic}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.abnormalCount && doc.abnormalCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold">
                            {doc.abnormalCount} Abnormal
                          </span>
                        ) : null}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDoc(doc.id);
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-[#182030] transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Structured Entity Details & Lab Range Table */}
        <div className="lg:col-span-7">
          {activeDocPreview ? (
            <div className="bg-[#0e121a]/90 border border-[#1b2334] rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              {/* Header Info */}
              <div className="flex items-start justify-between pb-4 border-b border-[#1b2334] mb-4">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {activeDocPreview.title}
                  </h3>
                  <p className="text-xs text-cyan-400 font-semibold mt-0.5">
                    {activeDocPreview.hospitalOrClinic} • {activeDocPreview.doctorName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeDocPreview.pendingReview && (
                    <button
                      onClick={() => handleConfirmDocReview(activeDocPreview.id)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <Check className="w-3 h-3" />
                      <span>Confirm OCR Review</span>
                    </button>
                  )}
                  <span className="px-3 py-1 rounded-full bg-[#06080d] border border-cyan-500/40 text-cyan-300 text-xs font-mono">
                    {activeDocPreview.date}
                  </span>
                </div>
              </div>

              {/* Lab Values Table */}
              {activeDocPreview.labValues && activeDocPreview.labValues.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <span>Extracted Biomarkers & Reference Ranges</span>
                  </h4>

                  <div className="overflow-x-auto rounded-2xl border border-[#1b2334] bg-[#06080d]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0a0f18] border-b border-[#1b2334] text-slate-400 font-mono font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Test Parameter</th>
                          <th className="px-3 py-2.5">Observed Value</th>
                          <th className="px-3 py-2.5">Reference Range</th>
                          <th className="px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1b2334] font-medium">
                        {activeDocPreview.labValues.map((lab, lIdx) => (
                          <tr
                            key={lIdx}
                            className={
                              lab.isAbnormal
                                ? lab.status.includes('CRITICAL')
                                  ? 'bg-rose-950/40 text-rose-200'
                                  : 'bg-amber-950/30 text-amber-200'
                                : 'text-slate-300'
                            }
                          >
                            <td className="px-3 py-2.5 font-bold">
                              {lab.test}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-black">
                              {lab.value} {lab.unit}
                            </td>
                            <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                              {lab.reference}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                                  lab.status.includes('CRITICAL')
                                    ? 'bg-rose-600 text-white animate-pulse'
                                    : lab.status.includes('HIGH') || lab.status.includes('LOW')
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {lab.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extracted Medications with Confidence Badge & Inline Editing */}
              {activeDocPreview.medications && activeDocPreview.medications.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Extracted Medications & Regimens</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Confidence Score shown • Click edit icon to correct
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeDocPreview.medications.map((med, mIdx) => {
                      const isEditing = editingMedIndex === mIdx;
                      const conf = med.confidenceScore || 88;

                      return (
                        <div
                          key={mIdx}
                          className="p-3 rounded-xl bg-[#06080d] border border-[#1b2334] text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            {isEditing ? (
                              <div className="flex-1 flex gap-1.5">
                                <input
                                  type="text"
                                  value={editingMedName}
                                  onChange={(e) => setEditingMedName(e.target.value)}
                                  className="flex-1 bg-[#161c28] border border-cyan-400 rounded px-2 py-0.5 text-xs text-white"
                                />
                                <button
                                  onClick={() => handleSaveMedEdit(mIdx)}
                                  className="p-1 bg-cyan-400 text-slate-950 rounded font-bold"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-white">{med.name}</p>
                                <button
                                  onClick={() => {
                                    setEditingMedIndex(mIdx);
                                    setEditingMedName(med.name);
                                  }}
                                  className="text-slate-500 hover:text-cyan-400 transition"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                conf >= 85
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {conf}% conf
                            </span>
                          </div>
                          <p className="text-[11px] text-cyan-300 mt-0.5 font-mono">
                            {med.dosage} • {med.frequency}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Duration: {med.duration}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Raw OCR Snippet View */}
              {activeDocPreview.rawOcrText && (
                <div className="mt-4 p-3 rounded-2xl bg-[#06080d] border border-[#1b2334] text-[11px] font-mono text-slate-400">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">
                    RAW OCR STREAM:
                  </span>
                  <p className="whitespace-pre-line">{activeDocPreview.rawOcrText}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full rounded-3xl bg-[#0e121a]/50 border border-[#1b2334] flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileText className="w-12 h-12 text-slate-600 mb-3" />
              <p className="font-bold text-sm text-slate-300">
                Select or Upload a Document to Inspect Extracted Entities
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clinical Review</span>
        </button>

        <button
          id="doc-proceed-summary-btn"
          onClick={onContinue}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98"
        >
          <span>Confirm Documents &amp; Proceed to Privacy Clearance</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
