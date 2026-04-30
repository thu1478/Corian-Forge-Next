import React, { useEffect } from 'react';
import rulesData from "@/lib/rules.json";
import { ChevronRightIcon, ChevronLeftIcon, InfoIcon } from 'lucide-react';
interface OccupationStepProps {
  occupationSkills: string[];
  occupationLanguages: string[];
  globalSkillCounts: Record<string, number>;
  onToggleSkill: (id: string) => void;
  onToggleLanguage: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}
export function OccupationStep({
  occupationSkills,
  occupationLanguages,
  globalSkillCounts,
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
        <h2 className="text-4xl font-black tracking-tight italic uppercase mb-2">Occupation</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          Choose your profession, additional skills, and languages.
        </p>
      </div>

      <div className="rounded-xl p-6 mb-8 flex items-start gap-4 border border-border bg-muted/60 dark:bg-muted/30">
        <InfoIcon className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" aria-hidden />
        <div>
          <h3 className="text-foreground font-bold mb-1.5">
            Occupation data coming soon
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed">
            The full occupation rules are currently being written. For now, you
            may select <strong className="font-semibold text-foreground">2 additional skills</strong> of your choice and{' '}
            <strong className="font-semibold text-foreground">1 additional language</strong> (Common is granted
            automatically).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Skills Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex justify-between items-end mb-6 border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                Additional Skills
              </h3>
              <p className="text-sm text-muted-foreground">Select 2 skills</p>
            </div>
            <div className="text-2xl font-black tabular-nums text-foreground bg-muted px-3 py-1 rounded-lg border border-border">
              {2 - occupationSkills.length} left
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(rulesData.system.skills).map(([id, skill]) => {
              const isSelected = occupationSkills.includes(id);
              const count = globalSkillCounts[id] || 0;
              const wouldGainExpertise = count === 1 && !isSelected;
              const atExpertiseCap = count >= 2 && !isSelected;
              const canSelect = !atExpertiseCap && (occupationSkills.length < 2 || isSelected);
              return (
                <button
                  key={id}
                  onClick={() => onToggleSkill(id)}
                  disabled={!canSelect}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                    isSelected
                      ? count >= 2
                        ? "bg-purple-100 border-purple-600 text-purple-950 shadow-sm dark:bg-purple-600 dark:border-purple-500 dark:text-white dark:shadow-md dark:shadow-purple-900/20"
                        : "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/20 dark:bg-purple-600"
                      : atExpertiseCap
                        ? "bg-muted border-border text-muted-foreground"
                        : "bg-card border-border text-foreground hover:bg-muted/20 hover:border-muted-foreground/60"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}>
                  
                  {skill.name} {count >= 2 ? "(Expertise)" : wouldGainExpertise ? "(+Expertise)" : ""}
                </button>);

            })}
          </div>
        </div>

        {/* Languages Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex justify-between items-end mb-6 border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">Languages</h3>
              <p className="text-sm text-muted-foreground">
                Common is automatic. Select 1 more.
              </p>
            </div>
            <div className="text-2xl font-black tabular-nums text-foreground bg-muted px-3 py-1 rounded-lg border border-border">
              {Math.max(0, 2 - occupationLanguages.length)} left
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {Object.entries(rulesData.system.languages).map(([id, lang]) => {
              const isSelected = occupationLanguages.includes(id);
              const isCommon = id === 'common';
              // Allow 2 languages total (Common + 1 other)
              const canSelect = occupationLanguages.length < 2 || isSelected;
              return (
                <button
                  key={id}
                  onClick={() => !isCommon && onToggleLanguage(id)} // Can't toggle common off
                  disabled={isCommon || !canSelect}
                  className={`flex flex-col items-start p-3 rounded-lg border transition-all text-left ${
                    isSelected
                      ? isCommon
                        ? "bg-muted border-border text-foreground cursor-default"
                        : "bg-purple-100 border-purple-600 text-foreground ring-1 ring-purple-500/25 dark:bg-purple-900/35 dark:border-purple-500 dark:text-purple-50 dark:ring-purple-500/40"
                      : "bg-card border-border text-muted-foreground hover:bg-muted/20 hover:border-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}>
                  
                  <div className="flex justify-between w-full mb-1">
                    <span className="font-bold text-foreground">{lang.name}</span>
                    {isCommon &&
                    <span className="text-xs bg-background/80 dark:bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border/60">
                        Automatic
                      </span>
                    }
                  </div>
                  <span className={`text-xs ${isSelected && !isCommon ? "text-purple-900/80 dark:text-purple-100/85" : "text-muted-foreground"}`}>{lang.description}</span>
                </button>);

            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8 pt-4 border-t border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-secondary-foreground bg-secondary hover:opacity-90 transition-colors">
          
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isComplete}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${isComplete ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
          
          Next Step <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>);

}