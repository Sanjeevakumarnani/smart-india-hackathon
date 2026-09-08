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
  HelpCircle,
  Wind,
  Sparkles,
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

const OTHER_DISEASE_ITEM: Complaint = {
  id: 'other_disease',
  title: 'Other Disease / Condition',
  regionalTitles: {
    en: 'Other Disease / Condition',
    hi: 'अन्य बीमारी / समस्या',
    te: 'ఇతర వ్యాధి / సమస్య',
    ta: 'மற்ற நோய் / பிரச்சனை',
    kn: 'ಇತರ ರೋಗ / ಸಮಸ್ಯೆ',
    ml: 'മറ്റ് രോഗം / പ്രശ്നം',
    mr: 'इतर आजार / समस्या',
  },
  icon: 'HelpCircle',
  color: 'text-violet-600 bg-violet-50 border-violet-200',
  badge: 'OTHER DISEASE',
  isRedFlagPotential: false,
};

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
        const mapped: Complaint[] = data.map((item) => ({
          id: item.complaint_key,
          title: item.display_name_en,
          regionalTitles: {
            te: item.display_name_te,
            ta: item.display_name_ta,
            kn: item.display_name_kn,
            ml: item.display_name_ml,
            mr: item.display_name_mr,
            hi: item.display_name_hi,
          },
          icon: item.icon,
          color: item.color_class,
          badge: item.opd_type.toUpperCase(),
          isRedFlagPotential: item.is_red_flag_trigger,
        }));
        const hasOther = mapped.some((item: any) => item.id === 'other_disease');
        if (!hasOther) {
          mapped.push(OTHER_DISEASE_ITEM);
        }
        setComplaints(mapped);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setComplaints([OTHER_DISEASE_ITEM]);
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
      case 'Zap':
        return <Brain className="w-8 h-8" />;
      case 'Activity':
      case 'Bone':
        return <Activity className="w-8 h-8" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-8 h-8" />;
      case 'HelpCircle':
        return <HelpCircle className="w-8 h-8" />;
      case 'Wind':
        return <Wind className="w-8 h-8" />;
      case 'Sparkles':
        return <Sparkles className="w-8 h-8" />;
      default:
        return <HeartPulse className="w-8 h-8" />;
        return <HelpCircle className="w-8 h-8" />;
    }
  };

  const handleCardClick = (id: string, title: string) => {
    onSelectComplaint(id, title);
    setTimeout(() => {
      onContinue();
    }, 200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Stethoscope className="w-4 h-4 text-indigo-600" />
          <span>Step 3: {translate('complaint', selectedLanguage)}</span>
          {selectedLanguage !== 'en' && <span className="text-[10px] opacity-75">(Primary Complaint)</span>}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          {translate('selectComplaint', selectedLanguage)}
        </h2>
        {selectedLanguage !== 'en' && (
          <p className="text-sm font-semibold text-indigo-700 mt-0.5">
            {translate('selectComplaint', 'en')}
          </p>
        )}
        <p className="text-slate-600 text-sm sm:text-base mt-1.5 leading-relaxed">
          {translate('selectComplaintSub', selectedLanguage)}
        </p>
        {selectedLanguage !== 'en' && (
          <p className="text-xs text-slate-400 mt-0.5">
            {translate('selectComplaintSub', 'en')}
          </p>
        )}
      </div>

      {/* OPD Mode Selector Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex gap-2 shadow-sm">
          <button
            id="opd-allopathic-btn"
            onClick={() => onSelectOpdType('allopathic')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
              opdType === 'allopathic'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Stethoscope className="w-5 h-5" />
            <div className="text-left">
              <div>{translate('allopathicOpd', selectedLanguage)}</div>
              {selectedLanguage !== 'en' && (
                <div className="text-[10px] opacity-80 font-normal">
                  {translate('allopathicOpd', 'en')}
                </div>
              )}
            </div>
          </button>

          <button
            id="opd-ayush-btn"
            onClick={() => onSelectOpdType('ayurveda')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
              opdType === 'ayurveda'
                ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Leaf className="w-5 h-5 text-emerald-200" />
            <div className="text-left">
              <div>{translate('ayushOpd', selectedLanguage)}</div>
              {selectedLanguage !== 'en' && (
                <div className="text-[10px] opacity-80 font-normal">
                  {translate('ayushOpd', 'en')}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh]">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-600">{translate('loading', selectedLanguage)}</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
          <p className="text-rose-700 font-bold mb-3">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
            {translate('retry', selectedLanguage)}
          </button>
        </div>
      ) : (
        /* Complaint Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {complaints.map((comp) => {
            const isSelected = selectedComplaintId === comp.id;
            const primaryTitle = selectedLanguage !== 'en' && comp.regionalTitles[selectedLanguage]
              ? comp.regionalTitles[selectedLanguage]
              : comp.title;
            const englishSubtitle = selectedLanguage !== 'en' && comp.regionalTitles[selectedLanguage]
              ? comp.title
              : undefined;

            return (
              <div
                key={comp.id}
                id={`complaint-card-${comp.id}`}
                onClick={() => handleCardClick(comp.id, comp.title)}
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
                    {primaryTitle}
                  </h3>
                  {englishSubtitle && (
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {englishSubtitle}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {comp.isRedFlagPotential ? (
                    <span className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      Cardiac / Red-Flag Pathway
                    </span>
                  ) : comp.id === 'other_disease' ? (
                    <span className="text-[10px] font-bold text-violet-600">
                      Open Narration & Assessment
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
          className="py-2.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <div className="text-left">
            <span>{translate('backToIdentity', selectedLanguage)}</span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[10px] text-slate-400 font-medium">Back to Identity</span>
            )}
          </div>
        </button>

        <button
          id="complaint-proceed-btn"
          onClick={onContinue}
          className={`py-3 px-8 rounded-2xl font-black text-base flex items-center gap-3 shadow-lg transition active:scale-98 ${
            opdType === 'ayurveda'
              ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white shadow-emerald-600/25'
              : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-600/25'
          }`}
        >
          <div className="text-left">
            <span>
              {opdType === 'ayurveda'
                ? (selectedLanguage === 'hi' ? 'आयुर्वेदिक रोगी परीक्षा प्रारंभ करें' :
                   selectedLanguage === 'te' ? 'ఆయుర్వేద రోగి పరీక్ష ప్రారంభించండి' :
                   selectedLanguage === 'ta' ? 'ஆயுர்வேத நோயாளி பரிசோதனை தொடங்கவும்' :
                   selectedLanguage === 'kn' ? 'ಆಯುರ್ವೇದ ರೋಗಿ ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ' :
                   selectedLanguage === 'ml' ? 'ആയുർവേദ രോഗി പരീക്ഷ ആരംഭിക്കുക' :
                   selectedLanguage === 'mr' ? 'आयुर्वेदिक रुग्ण परीक्षा सुरू करा' :
                   'Proceed to Ayurvedic Rogi Pariksha')
                : translate('startInterview', selectedLanguage)}
            </span>
            {selectedLanguage !== 'en' && (
              <span className="block text-[11px] font-normal opacity-85">
                {opdType === 'ayurveda'
                  ? 'Proceed to Ayurvedic Rogi Pariksha'
                  : 'Start Clinical Interview'}
              </span>
            )}
          </div>
          <ArrowRight className="w-5 h-5 stroke-[2.5] shrink-0" />
        </button>
      </div>
    </div>
  );
};
