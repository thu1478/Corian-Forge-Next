import React from 'react';
interface StepProgressProps {
  currentStep: number;
  steps: string[];
}
export function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12 border-b border-slate-200 dark:border-slate-800 pb-6 overflow-x-auto">
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        return (
          <React.Fragment key={step}>
            <div
              className={`text-[12px] font-black uppercase tracking-[0.2em] transition-colors whitespace-nowrap ${
                isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-600 dark:text-slate-500"
              }`}
            >
              {idx + 1}. {step}
            </div>
            {idx < steps.length - 1 && <div className="w-6 h-[2px] bg-slate-300 dark:bg-slate-700" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}