import React from "react";

interface StepProgressProps {
  currentStep: number;
  steps: string[];
  onStepClick?: (index: number) => void;
}

export function StepProgress({ currentStep, steps, onStepClick }: StepProgressProps) {
  return (
    <nav
      className="flex items-center justify-center gap-2 sm:gap-4 mb-12 border-b border-slate-200 dark:border-slate-800 pb-6 overflow-x-auto px-1"
      aria-label="Character creation steps"
    >
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        return (
          <React.Fragment key={step}>
            <button
              type="button"
              onClick={() => onStepClick?.(idx)}
              aria-current={isActive ? "step" : undefined}
              className={`text-[11px] sm:text-[12px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-colors whitespace-nowrap rounded-lg px-2 py-2 sm:px-3 border-2 border-transparent ${
                isActive
                  ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800"
                  : "text-slate-600 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              } ${onStepClick ? "cursor-pointer" : "cursor-default"}`}
            >
              {idx + 1}. {step}
            </button>
            {idx < steps.length - 1 && (
              <div
                className="hidden sm:block w-4 lg:w-6 h-[2px] shrink-0 bg-slate-300 dark:bg-slate-700"
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
