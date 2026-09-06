import React from 'react';
import {
  UserCheck,
  MessageSquarePlus,
  Stethoscope,
  FileSearch,
  CheckCircle2,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { KioskStep, LanguageCode, OpdType } from '../types';
import { translate } from '../services/i18n';

interface ProgressStepperProps {
  currentStep: KioskStep;
  opdType: OpdType;
  language: LanguageCode;
  onStepClick?: (step: KioskStep) => void;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  opdType,
  language,
  onStepClick,
}) => {
  const steps = [
    {
      id: 'step-1',
      key: 'IDENTITY' as KioskStep,
      related: ['LANGUAGE', 'CONSENT', 'IDENTITY', 'VITALS'],
      label: translate('stepIdentify', language),
      labelHi: 'पहचान (ABHA)',
      icon: UserCheck,
    },
    {
      id: 'step-2',
      key: 'CONVERSATION' as KioskStep,
      related: ['COMPLAINT_SELECT', 'CONVERSATION'],
      label: translate('stepConverse', language),
      labelHi: 'लक्षण संवाद',
      icon: MessageSquarePlus,
    },
    {
      id: 'step-3',
      key: opdType === 'ayurveda' ? 'AYUSH_PARIKSHA' as KioskStep : 'FAMILY_HISTORY' as KioskStep,
      related: ['FAMILY_HISTORY', 'AYUSH_PARIKSHA'],
      label: opdType === 'ayurveda' ? `3. ${language === 'hi' ? 'आयुष परीक्षा' : 'AYUSH Pariksha'}` : translate('stepHistory', language),
      labelHi: opdType === 'ayurveda' ? 'दशविध परीक्षा' : 'पारिवारिक इतिहास',
      icon: opdType === 'ayurveda' ? Stethoscope : Users,
    },
    {
      id: 'step-4',
      key: 'DOC_SCAN' as KioskStep,
      related: ['DOC_SCAN'],
      label: translate('stepScanDocs', language),
      labelHi: 'दस्तावेज़ स्कैन',
      icon: FileSearch,
    },
    {
      id: 'step-5',
      key: 'SESSION_PURGE' as KioskStep,
      related: ['SESSION_PURGE'],
      label: translate('stepPrivacy', language),
      labelHi: 'डेटा सुरक्षा',
      icon: ShieldCheck,
    },
    {
      id: 'step-6',
      key: 'SUMMARY_REVIEW' as KioskStep,
      related: ['SUMMARY_REVIEW', 'PHYSICIAN_CONSOLE'],
      label: translate('stepSummary', language),
      labelHi: 'सारांश व टोकन',
      icon: CheckCircle2,
    },
  ];

  const stepOrder: KioskStep[] = [
    'LANGUAGE',
    'CONSENT',
    'IDENTITY',
    'VITALS',
    'COMPLAINT_SELECT',
    'CONVERSATION',
    'FAMILY_HISTORY',
    'AYUSH_PARIKSHA',
    'DOC_SCAN',
    'SESSION_PURGE',
    'SUMMARY_REVIEW',
    'PHYSICIAN_CONSOLE',
  ];

  const getStepStatus = (relatedSteps: string[]) => {
    if (relatedSteps.includes(currentStep)) return 'ACTIVE';
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = Math.max(...relatedSteps.map((s) => stepOrder.indexOf(s as KioskStep)));
    return currentIndex > stepIndex ? 'COMPLETED' : 'PENDING';
  };

  return (
    <div className="w-full max-w-[620px] mx-auto px-2 py-1 xl:py-0">
      <div className="bg-white/90 border border-slate-200/80 backdrop-blur-md rounded-2xl px-4 sm:px-6 py-2.5 shadow-sm">
        <div className="flex items-start justify-between relative gap-2">
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200" />

          {steps.map((s) => {
            const status = getStepStatus(s.related);
            const Icon = s.icon;

            return (
              <div
                key={s.id}
                onClick={() => onStepClick && onStepClick(s.key)}
                className="flex flex-col items-center relative z-10 cursor-pointer group min-w-0"
              >
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
                    status === 'ACTIVE'
                      ? 'bg-amber-400 text-slate-900 shadow-sm'
                      : status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:border-indigo-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="mt-1 text-center">
                  <p
                    className={`text-[10px] sm:text-[11px] font-extrabold whitespace-nowrap ${
                      status === 'ACTIVE'
                        ? 'text-slate-900'
                        : status === 'COMPLETED'
                        ? 'text-emerald-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-none">
                    {s.labelHi}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
