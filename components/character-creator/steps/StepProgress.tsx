import React from "react";

interface StepProgressProps {
  currentStep: number;
  steps: string[];
  onStepClick?: (index: number) => void;
}

export function StepProgress({ currentStep, steps, onStepClick }: StepProgressProps) {
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:gap-x-1.5 mb-10 border-b border-slate-200 dark:border-slate-800 pb-5 px-1"
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
              title={`${idx + 1}. ${step}`}
              className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wide sm:tracking-wider transition-colors whitespace-nowrap rounded-md px-1.5 py-1 sm:px-2 sm:py-1.5 border-2 border-transparent ${
                isActive
                  ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800"
                  : "text-slate-600 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              } ${onStepClick ? "cursor-pointer" : "cursor-default"}`}
            >
              {idx + 1}. {step}
            </button>
            {idx < steps.length - 1 && (
              <div
                className="hidden xl:block w-2 h-[2px] shrink-0 bg-slate-300 dark:bg-slate-700"
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
