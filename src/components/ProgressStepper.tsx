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
import { KioskStep, OpdType } from '../types';

interface ProgressStepperProps {
  currentStep: KioskStep;
  opdType: OpdType;
  onStepClick?: (step: KioskStep) => void;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  opdType,
  onStepClick,
}) => {
  const steps = [
    {
      id: 'step-1',
      key: 'IDENTITY' as KioskStep,
      related: ['LANGUAGE', 'CONSENT', 'IDENTITY', 'VITALS'],
      label: '1. Identify',
      labelHi: 'पहचान (ABHA)',
      icon: UserCheck,
    },
    {
      id: 'step-2',
      key: 'CONVERSATION' as KioskStep,
      related: ['COMPLAINT_SELECT', 'CONVERSATION'],
      label: '2. Converse',
      labelHi: 'लक्षण संवाद',
      icon: MessageSquarePlus,
    },
    {
      id: 'step-3',
      key: opdType === 'ayurveda' ? 'AYUSH_PARIKSHA' as KioskStep : 'FAMILY_HISTORY' as KioskStep,
      related: ['FAMILY_HISTORY', 'AYUSH_PARIKSHA'],
      label: opdType === 'ayurveda' ? '3. AYUSH Pariksha' : '3. History',
      labelHi: opdType === 'ayurveda' ? 'दशविध परीक्षा' : 'पारिवारिक इतिहास',
      icon: opdType === 'ayurveda' ? Stethoscope : Users,
    },
    {
      id: 'step-4',
      key: 'DOC_SCAN' as KioskStep,
      related: ['DOC_SCAN'],
      label: '4. Scan Docs',
      labelHi: 'दस्तावेज़ स्कैन',
      icon: FileSearch,
    },
    {
      id: 'step-5',
      key: 'SESSION_PURGE' as KioskStep,
      related: ['SESSION_PURGE'],
      label: '5. Privacy',
      labelHi: 'डेटा सुरक्षा',
      icon: ShieldCheck,
    },
    {
      id: 'step-6',
      key: 'SUMMARY_REVIEW' as KioskStep,
      related: ['SUMMARY_REVIEW', 'PHYSICIAN_CONSOLE'],
      label: '6. Summary',
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
    <div className="w-full max-w-5xl mx-auto px-4 py-3">
      <div className="bg-[#0e121a]/80 border border-[#1b2334] backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-xl">
        <div className="flex items-center justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-5 sm:top-6 left-8 right-8 h-0.5 bg-[#1e2738] -z-0" />

          {steps.map((s) => {
            const status = getStepStatus(s.related);
            const Icon = s.icon;

            return (
              <div
                key={s.id}
                onClick={() => onStepClick && onStepClick(s.key)}
                className="flex flex-col items-center relative z-10 cursor-pointer group"
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 shadow-lg ${
                    status === 'ACTIVE'
                      ? 'bg-gradient-to-tr from-amber-400 to-indigo-400 text-slate-950 scale-110 ring-4 ring-indigo-500/30 shadow-indigo-500/25'
                      : status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-[#121622] text-slate-500 border border-[#1e2738] group-hover:border-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={`text-[10px] sm:text-xs font-extrabold whitespace-nowrap ${
                      status === 'ACTIVE'
                        ? 'text-amber-400'
                        : status === 'COMPLETED'
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium hidden sm:block">
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
