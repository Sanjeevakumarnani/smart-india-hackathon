import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Apple,
  Thermometer,
  Brain,
  Activity,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Stethoscope,
  Leaf,
  Loader2,
} from 'lucide-react';
import { OpdType, LanguageCode } from '../types';
import { translate } from '../services/i18n';

interface Complaint {
  id: string;
  title: string;
  regionalTitles: Partial<Record<LanguageCode, string>>;
  icon: string;
  color: string;
  badge: string;
  isRedFlagPotential: boolean;
}

interface ChiefComplaintPickerProps {
  opdType: OpdType;
  onSelectOpdType: (type: OpdType) => void;
  selectedComplaintId: string;
  onSelectComplaint: (id: string, title: string) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
}

export const ChiefComplaintPicker: React.FC<ChiefComplaintPickerProps> = ({
  opdType,
  onSelectOpdType,
  selectedComplaintId,
  onSelectComplaint,
  onContinue,
  onBack,
  selectedLanguage,
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/chief-complaints?opd_type=' + opdType)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch complaints');
        return res.json();
      })
      .then((data: any[]) => {
        const mapped = data.map((item) => ({
          id: item.complaint_key,
          title: item.display_name_en,
          regionalTitles: {
            te: item.display_name_te,
            ta: item.display_name_ta,
            kn: item.display_name_kn,
            ml: item.display_name_ml,
            mr: item.display_name_mr,
          },
          icon: item.icon,
          color: item.color_class,
          badge: item.opd_type.toUpperCase(),
          isRedFlagPotential: item.is_red_flag_trigger,
        }));
        setComplaints(mapped);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [opdType]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'HeartPulse':
        return <HeartPulse className="w-8 h-8" />;
      case 'Apple':
        return <Apple className="w-8 h-8" />;
      case 'Thermometer':
        return <Thermometer className="w-8 h-8" />;
      case 'Brain':
        return <Brain className="w-8 h-8" />;
      case 'Activity':
        return <Activity className="w-8 h-8" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-8 h-8" />;
      default:
        return <HeartPulse className="w-8 h-8" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Stethoscope className="w-4 h-4 text-indigo-600" />
          <span>Step 3: Primary Health Issue / मुख्य लक्षण</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          Select OPD Category & Primary Complaint
                  {translate('selectComplaint', selectedLanguage)}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-1">
          कृपया अस्पताल का विभाग और अपनी मुख्य शारीरिक तकलीफ चुनें
        </p>
      </div>

      {/* OPD Mode Selector Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex gap-2 shadow-sm">
          <button
            id="opd-allopathic-btn"
            onClick={() => onSelectOpdType('allopathic')}
            className={`px-5 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
              opdType === 'allopathic'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Stethoscope className="w-5 h-5" />
            <div className="text-left">
              <div>Allopathic General & Specialty OPD</div>
              <div className="text-[10px] opacity-80 font-normal">एलोपैथिक चिकित्सा</div>
            </div>
          </button>

          <button
            id="opd-ayush-btn"
            onClick={() => onSelectOpdType('ayurveda')}
            className={`px-5 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
              opdType === 'ayurveda'
                ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Leaf className="w-5 h-5 text-emerald-200" />
            <div className="text-left">
              <div>AYUSH & Ayurveda Rogi OPD</div>
              <div className="text-[10px] opacity-80 font-normal">आयुष एवं आयुर्वेद चिकित्सा (दशविध परीक्षा)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh]">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-600">Loading complaints...</p>
                  <p className="text-slate-600">{translate('loading', selectedLanguage)}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh]">
          <p className="text-red-500 mb-4">Error loading complaints: {error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{translate('retry', selectedLanguage)}</button>
        </div>
      ) : (
        /* Complaint Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {complaints.map((comp) => {
            const isSelected = selectedComplaintId === comp.id;

            return (
              <div
                key={comp.id}
                id={`complaint-card-${comp.id}`}
                onClick={() => onSelectComplaint(comp.id, comp.title)}
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between relative shadow-sm active:scale-98 ${
                  isSelected
                    ? 'stitch-card-active scale-[1.02]'
                    : 'stitch-card hover:border-indigo-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${comp.color} shadow-xs text-slate-800`}>
                    {getIcon(comp.icon)}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-700 border border-slate-200">
                    {comp.badge}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                    {comp.title}
                  </h3>
                  {selectedLanguage !== 'en' && comp.regionalTitles[selectedLanguage] && (
                    <p className="text-sm font-semibold text-indigo-700 mt-1">
                      {comp.regionalTitles[selectedLanguage]}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {comp.isRedFlagPotential ? (
                    <span className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      Cardiac / Red-Flag Pathway
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-indigo-600">
                      Comprehensive Guided Protocol
                    </span>
                  )}

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    ✓
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Identity</span>
                  <span>{translate('backToIdentity', selectedLanguage)}</span>
        </button>

        <button
          id="complaint-proceed-btn"
          onClick={onContinue}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98"
        >
          <span>Start SOCRATES Clinical Interview</span>
                    <span>{translate('startInterview', selectedLanguage)}</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
