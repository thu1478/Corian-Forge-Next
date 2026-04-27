import React, { useEffect } from 'react';
import { rules } from './rules';
import { ChevronRightIcon, ChevronLeftIcon, InfoIcon } from 'lucide-react';
interface OccupationStepProps {
  occupationSkills: string[];
  occupationLanguages: string[];
  onToggleSkill: (id: string) => void;
  onToggleLanguage: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}
export function OccupationStep({
  occupationSkills,
  occupationLanguages,
  onToggleSkill,
  onToggleLanguage,
  onNext,
  onBack
}: OccupationStepProps) {
  // Auto-grant Common language if not already present
  useEffect(() => {
    if (!occupationLanguages.includes('common')) {
      onToggleLanguage('common');
    }
  }, [occupationLanguages, onToggleLanguage]);
  const isComplete =
  occupationSkills.length === 2 && occupationLanguages.length >= 1;
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-100 mb-2">Occupation</h2>
        <p className="text-gray-400">
          Choose your profession, additional skills, and languages.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6 mb-8 flex items-start gap-4">
        <InfoIcon className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-amber-400 font-bold mb-1">
            Occupation Data Coming Soon
          </h3>
          <p className="text-amber-200/70 text-sm">
            The full occupation rules are currently being written. For now, you
            may select <strong>2 additional skills</strong> of your choice and{' '}
            <strong>1 additional language</strong> (Common is granted
            automatically).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Skills Section */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-100">
                Additional Skills
              </h3>
              <p className="text-sm text-gray-400">Select 2 skills</p>
            </div>
            <div className="text-2xl font-black text-amber-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
              {2 - occupationSkills.length} left
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(rules.system.skills).map(([id, skill]) => {
              const isSelected = occupationSkills.includes(id);
              const canSelect = occupationSkills.length < 2 || isSelected;
              return (
                <button
                  key={id}
                  onClick={() => onToggleSkill(id)}
                  disabled={!canSelect}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${isSelected ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/20' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'}`}>
                  
                  {skill.name}
                </button>);

            })}
          </div>
        </div>

        {/* Languages Section */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-100">Languages</h3>
              <p className="text-sm text-gray-400">
                Common is automatic. Select 1 more.
              </p>
            </div>
            <div className="text-2xl font-black text-amber-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
              {Math.max(0, 2 - occupationLanguages.length)} left
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {Object.entries(rules.system.languages).map(([id, lang]) => {
              const isSelected = occupationLanguages.includes(id);
              const isCommon = id === 'common';
              // Allow 2 languages total (Common + 1 other)
              const canSelect = occupationLanguages.length < 2 || isSelected;
              return (
                <button
                  key={id}
                  onClick={() => !isCommon && onToggleLanguage(id)} // Can't toggle common off
                  disabled={isCommon || !canSelect}
                  className={`flex flex-col items-start p-3 rounded-lg border transition-all text-left ${isSelected ? isCommon ? 'bg-gray-800 border-gray-600 text-gray-300 cursor-default' : 'bg-purple-900/40 border-purple-500 ring-1 ring-purple-500/50 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'}`}>
                  
                  <div className="flex justify-between w-full mb-1">
                    <span className="font-bold">{lang.name}</span>
                    {isCommon &&
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                        Automatic
                      </span>
                    }
                  </div>
                  <span className="text-xs opacity-80">{lang.description}</span>
                </button>);

            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8 pt-4 border-t border-gray-800/50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
          
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isComplete}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${isComplete ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
          
          Next Step <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>);

}