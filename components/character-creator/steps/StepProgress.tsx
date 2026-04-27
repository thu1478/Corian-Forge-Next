import React from 'react';
import { CheckIcon } from 'lucide-react';
interface StepProgressProps {
  currentStep: number;
  steps: string[];
}
export function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="w-full py-6 mb-8 overflow-x-auto">
      <div className="flex items-center justify-between relative min-w-[600px] px-4">
        <div className="absolute left-4 right-4 top-1/2 transform -translate-y-1/2 h-1 bg-gray-800 z-0 rounded-full"></div>
        <div
          className="absolute left-4 top-1/2 transform -translate-y-1/2 h-1 bg-purple-600 z-0 rounded-full transition-all duration-300"
          style={{
            width: `calc(${(currentStep - 1) / (steps.length - 1) * 100}% - 2rem)`
          }}>
        </div>

        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={step}
              className="relative z-10 flex flex-col items-center group">
              
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isCompleted ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : isCurrent ? 'bg-slate-900 border-2 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-900 border-2 border-gray-700 text-gray-500'}`}>
                
                {isCompleted ? <CheckIcon className="w-5 h-5" /> : stepNum}
              </div>
              <span
                className={`absolute -bottom-7 text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${isCurrent ? 'text-purple-400' : isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>
                
                {step}
              </span>
            </div>);

        })}
      </div>
    </div>);

}