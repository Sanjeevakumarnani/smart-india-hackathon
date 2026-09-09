import { apiFetch, apiUrl } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
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
  Scan,
  History,
  Sparkles,
  ExternalLink,
  Pill,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { DigitizedDocument, InteractionResult, LanguageCode, PatientProfile } from '../types';
import { checkDrugInteractions } from '../services/aiClientService';
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
  const [activeTab, setActiveTab] = useState<'current_scan' | 'previous_sessions'>('current_scan');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [activeDocPreview, setActiveDocPreview] = useState<DigitizedDocument | null>(
    documents[0] || null
  );
  const [interactions, setInteractions] = useState<InteractionResult[]>([]);
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);
  const [editingMedName, setEditingMedName] = useState('');
  const [transcribedTextDraft, setTranscribedTextDraft] = useState('');

  // Previous Sessions State
  const [previousDocs, setPreviousDocs] = useState<DigitizedDocument[]>([]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);

  // Live WebRTC Kiosk Camera Scanner state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load previous sessions documents on mount or tab change
  const fetchPreviousSessions = async () => {
    setIsLoadingPrevious(true);
    try {
      const pId = patientProfile?.id || 'PAT-DEFAULT';
      const res = await apiFetch(`/api/documents/patient/${encodeURIComponent(pId)}`);
      if (res.ok) {
        const data = await res.json();
        setPreviousDocs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error loading previous documents:', err);
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  useEffect(() => {
    fetchPreviousSessions();
  }, [patientProfile]);

  useEffect(() => {
    if (activeDocPreview) {
      setTranscribedTextDraft(activeDocPreview.rawOcrText || '');
    }
  }, [activeDocPreview]);

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
      setCameraError('Unable to access kiosk scanner camera. Please ensure camera permissions are granted or use scan file input.');
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

  // Perform AI OCR and Handwriting recognition + Database persistence
  const handleOcrAndSave = async (base64Data: string, mimeType: string = 'image/jpeg', title?: string) => {
    setIsProcessingOcr(true);
    try {
      const res = await apiFetch('/api/documents/scan-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          patientId: patientProfile?.id || 'PAT-DEFAULT',
          encounterId: 'ENC-CURRENT',
          documentType: 'prescription',
          title: title || `Prescription Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newDoc: DigitizedDocument = data.document;
        const updated = [newDoc, ...documents];
        onUpdateDocuments(updated);
        setActiveDocPreview(newDoc);
        setTranscribedTextDraft(newDoc.rawOcrText);
        // Refresh previous sessions cache
        fetchPreviousSessions();
      }
    } catch (err) {
      console.error('OCR processing error:', err);
    } finally {
      setIsProcessingOcr(false);
    }
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64Data = dataUrl.split(',')[1];

    stopCamera();
    handleOcrAndSave(base64Data, 'image/jpeg');
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
      d.medications?.forEach((m) => allMeds.push(m.name));
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

  const handleScanFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = (evt.target?.result as string)?.split(',')[1];
      const title = file.name.replace(/\.[^/.]+$/, '');
      await handleOcrAndSave(base64Data, file.type, title);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveDoc = (docId: string) => {
    const updated = documents.filter((d) => d.id !== docId);
    onUpdateDocuments(updated);
    if (activeDocPreview?.id === docId) {
      setActiveDocPreview(updated[0] || null);
    }
  };

  const handleSaveMedEdit = (index: number) => {
    if (!activeDocPreview) return;
    const updatedMeds = [...activeDocPreview.medications];
    updatedMeds[index] = { ...updatedMeds[index], name: editingMedName };
    const updatedDoc = { ...activeDocPreview, medications: updatedMeds };
    const updatedDocs = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    onUpdateDocuments(updatedDocs);
    setActiveDocPreview(updatedDoc);
    setEditingMedIndex(null);
  };

  const handleSaveTranscribedText = () => {
    if (!activeDocPreview) return;
    const updatedDoc = { ...activeDocPreview, rawOcrText: transcribedTextDraft };
    const updatedDocs = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    onUpdateDocuments(updatedDocs);
    setActiveDocPreview(updatedDoc);
  };

  const handleImportPreviousDoc = (prevDoc: DigitizedDocument) => {
    if (documents.some((d) => d.id === prevDoc.id)) {
      setActiveDocPreview(prevDoc);
      setActiveTab('current_scan');
      return;
    }
    const updated = [prevDoc, ...documents];
    onUpdateDocuments(updated);
    setActiveDocPreview(prevDoc);
    setActiveTab('current_scan');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4">
      {/* Title Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Scan className="w-4 h-4 text-indigo-600" />
          <span>Step 5: {translate('documents', selectedLanguage)}</span>
          {selectedLanguage !== 'en' && <span className="text-[10px] opacity-75">(Document Scanner)</span>}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          {translate('docScanTitle', selectedLanguage)}
        </h2>
        {selectedLanguage !== 'en' && (
          <p className="text-sm font-semibold text-indigo-700 mt-0.5">
            {translate('docScanTitle', 'en')}
          </p>
        )}
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          {translate('docScanSub', selectedLanguage)}
        </p>
        {selectedLanguage !== 'en' && (
          <p className="text-xs text-slate-400 mt-0.5">
            {translate('docScanSub', 'en')}
          </p>
        )}
      </div>

      {/* Tabs: Current Scan vs Previous Sessions */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex gap-2 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('current_scan')}
            className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'current_scan'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Scan className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <span>{translate('scanDocsTab', selectedLanguage)} ({documents.length})</span>
              {selectedLanguage !== 'en' && (
                <span className={`block text-[10px] font-normal ${activeTab === 'current_scan' ? 'text-white/80' : 'text-slate-400'}`}>
                  {translate('scanDocsTab', 'en')}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('previous_sessions');
              fetchPreviousSessions();
            }}
            className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'previous_sessions'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <span>{translate('previousDocsTab', selectedLanguage)} ({previousDocs.length})</span>
              {selectedLanguage !== 'en' && (
                <span className={`block text-[10px] font-normal ${activeTab === 'previous_sessions' ? 'text-white/80' : 'text-slate-400'}`}>
                  {translate('previousDocsTab', 'en')}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Drug-Drug Interaction Warning Banner */}
      {interactions.length > 0 && (
        <div className="mb-5 p-4 rounded-3xl bg-rose-50 border-2 border-rose-400 shadow-sm flex items-start gap-3.5 text-rose-900">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <h3 className="text-sm font-black text-rose-800 uppercase tracking-wide">
              Critical Drug Interactions Detected Across Scanned Prescriptions
            </h3>
            <div className="mt-1 space-y-1">
              {interactions.map((inter, idx) => (
                <p key={idx} className="text-xs font-semibold text-rose-900">
                  • <strong>{inter.drug1} + {inter.drug2}:</strong> {inter.description} ({inter.severity})
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW A: Current Scan Tab */}
      {activeTab === 'current_scan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column: Scanner Actions + Document List */}
          <div className="lg:col-span-5 space-y-4">
            {/* Scan Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: Live Kiosk Camera Scanner */}
              <button
                type="button"
                onClick={startCamera}
                className="p-5 rounded-3xl bg-violet-50 border-2 border-indigo-200 hover:bg-indigo-100/70 transition flex flex-col items-center justify-center text-center shadow-xs group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition border border-indigo-200 shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {translate('cameraScan', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' ? (
                  <p className="text-[11px] text-indigo-700 mt-0.5 font-medium">
                    {translate('cameraScan', 'en')}
                  </p>
                ) : (
                  <p className="text-[11px] text-indigo-700 mt-0.5">Physical scanner tray</p>
                )}
              </button>

              {/* Button 2: Scan from File Scanner */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-3xl bg-white border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 transition flex flex-col items-center justify-center text-center shadow-xs group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleScanFileInput}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition border border-slate-200 shadow-xs">
                  <Scan className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {translate('uploadDoc', selectedLanguage)}
                </p>
                {selectedLanguage !== 'en' ? (
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {translate('uploadDoc', 'en')}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5">Capture prescription photo</p>
                )}
              </button>
            </div>

            {/* OCR Scanning Overlay Indicator */}
            {isProcessingOcr && (
              <div className="p-4 rounded-2xl bg-indigo-950 text-white border border-indigo-400 flex items-center gap-3 shadow-lg animate-pulse">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <div className="text-xs">
                  <strong className="block text-cyan-300 font-mono">
                    AI Handwriting OCR in progress...
                  </strong>
                  <span>Transcribing doctor cursive handwriting &amp; medicine dosages</span>
                </div>
              </div>
            )}

            {/* Scanned Documents Timeline */}
            <div className="stitch-card p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Session Documents ({documents.length})</span>
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No documents scanned yet. Use the camera or scan buttons above to digitize prescriptions.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {documents.map((doc) => {
                    const isSelected = activeDocPreview?.id === doc.id;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => setActiveDocPreview(doc)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'stitch-card-active shadow-xs'
                            : 'stitch-card hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 line-clamp-1">
                                {doc.title}
                              </p>
                              {doc.ocrConfidenceScore && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {doc.ocrConfidenceScore}% OCR
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {doc.date} • {doc.hospitalOrClinic}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDoc(doc.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Transcribed Text & Extracted Details */}
          <div className="lg:col-span-7">
            {activeDocPreview ? (
              <div className="stitch-card p-6 shadow-sm space-y-5">
                {/* Header Info */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {activeDocPreview.title}
                    </h3>
                    <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                      {activeDocPreview.hospitalOrClinic} • {activeDocPreview.doctorName}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono font-bold">
                    {activeDocPreview.date}
                  </span>
                </div>

                {/* Low Confidence OCR Review Panel (M5) */}
                {activeDocPreview && (activeDocPreview.ocrConfidenceScore ?? 95) < 85 && (
                  <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">⚠️</span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                            Low OCR Confidence Score ({activeDocPreview.ocrConfidenceScore}%) — Verification Required
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-tight">
                            Doctor cursive score is below threshold (&lt;85%). Please review and verify medication names before final submission.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedDocs = documents.map(d => d.id === activeDocPreview.id ? { ...d, ocrConfidenceScore: 92, pendingReview: false } : d);
                          onUpdateDocuments(updatedDocs);
                          setActiveDocPreview({ ...activeDocPreview, ocrConfidenceScore: 92, pendingReview: false });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 shadow-xs transition active:scale-95"
                      >
                        Confirm Accuracy ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Scanned Image Thumbnail if present */}
                {activeDocPreview.thumbnailUrl && (
                  <div className="rounded-2xl border border-slate-200 p-2 bg-slate-50 flex items-center gap-3">
                    <img
                      src={activeDocPreview.thumbnailUrl}
                      alt="Scanned prescription"
                      className="w-20 h-20 object-cover rounded-xl border border-slate-200"
                    />
                    <div className="flex-1 text-xs text-slate-600">
                      <p className="font-bold text-slate-900">Physical Prescription Image Stored</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Encrypted and persisted to hospital database along with patient summary.
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Handwriting & OCR Transcription Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-violet-50/70 border-2 border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Transcribed Text (AI Handwriting &amp; OCR Recognition)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveTranscribedText}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Save Corrections
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={transcribedTextDraft}
                    onChange={(e) => setTranscribedTextDraft(e.target.value)}
                    className="w-full p-3 bg-white rounded-xl border border-indigo-200 text-xs text-slate-900 leading-relaxed font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="AI Transcribed handwriting text will appear here..."
                  />
                  <p className="text-[10px] text-indigo-700 mt-1">
                    ✓ Verbatim handwriting &amp; printed text extracted by hospital AI Vision model.
                  </p>
                </div>

                {/* Extracted Medications */}
                {activeDocPreview.medications && activeDocPreview.medications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      <span>Extracted Medications ({activeDocPreview.medications.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeDocPreview.medications.map((med, mIdx) => {
                        const isEditing = editingMedIndex === mIdx;

                        return (
                          <div
                            key={mIdx}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              {isEditing ? (
                                <div className="flex-1 flex gap-1.5">
                                  <input
                                    type="text"
                                    value={editingMedName}
                                    onChange={(e) => setEditingMedName(e.target.value)}
                                    className="flex-1 bg-white border border-indigo-400 rounded px-2 py-0.5 text-xs text-slate-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveMedEdit(mIdx)}
                                    className="p-1 bg-indigo-600 text-white rounded font-bold"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <p className="font-black text-slate-900">{med.name}</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMedIndex(mIdx);
                                      setEditingMedName(med.name);
                                    }}
                                    className="text-slate-400 hover:text-indigo-600 transition"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-indigo-700 font-bold mt-0.5 font-mono">
                              {med.dosage} • {med.frequency}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Duration: {med.duration}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lab Values Table */}
                {activeDocPreview.labValues && activeDocPreview.labValues.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-600" />
                      <span>Extracted Laboratory Biomarkers</span>
                    </h4>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="px-3 py-2.5">Test</th>
                            <th className="px-3 py-2.5">Observed Value</th>
                            <th className="px-3 py-2.5">Reference</th>
                            <th className="px-3 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {activeDocPreview.labValues.map((lab, lIdx) => (
                            <tr key={lIdx} className={lab.isAbnormal ? 'bg-amber-50/60' : 'bg-white'}>
                              <td className="px-3 py-2 font-bold text-slate-900">{lab.test}</td>
                              <td className="px-3 py-2 font-mono font-black text-slate-900">
                                {lab.value} {lab.unit}
                              </td>
                              <td className="px-3 py-2 text-slate-500 text-[11px]">{lab.reference}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  lab.isAbnormal ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
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
              </div>
            ) : (
              <div className="h-full min-h-[300px] rounded-3xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-400 mb-3" />
                <p className="font-bold text-sm text-slate-600">
                  Scan a prescription or select a document to view AI handwriting transcription
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW B: Previous Sessions Tab */
        <div className="stitch-card p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>Previous Sessions Document Archive</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Retrieve historical medical documents, prescriptions, and lab tests saved in the database
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPreviousSessions}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingPrevious ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Loading stored documents from database...
            </div>
          ) : previousDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No historical records found for this patient. Any document you scan will be automatically stored in the database for future sessions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previousDocs.map((prevDoc) => (
                <div
                  key={prevDoc.id}
                  className="p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-300 bg-white shadow-xs transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{prevDoc.title}</h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {prevDoc.date} • {prevDoc.hospitalOrClinic}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold uppercase">
                        {prevDoc.documentType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px] mb-3">
                      "{prevDoc.rawOcrText || 'No transcription available'}"
                    </p>

                    {prevDoc.medications && prevDoc.medications.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {prevDoc.medications.slice(0, 3).map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold"
                          >
                            💊 {m.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Doctor: {prevDoc.doctorName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleImportPreviousDoc(prevDoc)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <span>Load into Session</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live WebRTC Camera Capture Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative">
            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-400" />
              <span>Kiosk Document Scanner Tray</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 text-center">
              Position handwritten prescription or lab report flat inside the scanning guide
            </p>

            {cameraError ? (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs text-center mb-4">
                {cameraError}
              </div>
            ) : (
              <div className="w-full h-72 rounded-2xl overflow-hidden relative border-2 border-dashed border-emerald-400 bg-black flex items-center justify-center mb-4 shadow-inner">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-emerald-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                  <span className="text-[10px] font-mono text-emerald-300 bg-black/60 px-2 py-0.5 rounded w-fit">
                    ALIGNED SCAN TRAY
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 w-full justify-center">
              <button
                onClick={stopCamera}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={captureCameraPhoto}
                disabled={!!cameraError}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Capture &amp; OCR Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <div className="text-left">
            <span>{translate('back', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] text-slate-400 font-normal">
                {translate('back', 'en')}
              </span>
            )}
          </div>
        </button>

        <button
          id="doc-proceed-summary-btn"
          onClick={onContinue}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98"
        >
          <div className="text-left">
            <span>{translate('confirmDocuments', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-xs text-indigo-200 font-normal">
                {translate('confirmDocuments', 'en')}
              </span>
            )}
          </div>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
