import React, { useMemo, useState } from "react";
import rulesData from "@/lib/rules.json";
import { ChevronRightIcon, ChevronLeftIcon, CheckIcon } from 'lucide-react';
interface CultureStepProps {
  cultureEnvironment: string | null;
  cultureOrganization: string | null;
  cultureUpbringing: string | null;
  selectedSkills: string[];
  globalSkillCounts: Record<string, number>;
  onSelectEnvironment: (id: string) => void;
  onSelectOrganization: (id: string) => void;
  onSelectUpbringing: (id: string) => void;
  onToggleSkill: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}
export function CultureStep({
  cultureEnvironment,
  cultureOrganization,
  cultureUpbringing,
  selectedSkills,
  globalSkillCounts,
  onSelectEnvironment,
  onSelectOrganization,
  onSelectUpbringing,
  onToggleSkill,
  onNext,
  onBack
}: CultureStepProps) {
  const [activeTab, setActiveTab] = useState<
    'environment' | 'organization' | 'upbringing'>(
    'environment');
  const allChoicesMade =
  cultureEnvironment && cultureOrganization && cultureUpbringing;
  const isComplete = allChoicesMade && selectedSkills.length === 3;
  const culture = rulesData.system.culture;
  const allSkills = rulesData.system.skills;

  // Gather unlocked categories
  const unlockedCategories = useMemo(() => {
    const set = new Set<string>();
    if (cultureEnvironment) {
      culture.environment[cultureEnvironment as keyof typeof culture.environment]?.skillCategories.forEach((c) => set.add(c));
    }
    if (cultureOrganization) {
      culture.organization[cultureOrganization as keyof typeof culture.organization]?.skillCategories.forEach((c) => set.add(c));
    }
    if (cultureUpbringing) {
      culture.upbringing[cultureUpbringing as keyof typeof culture.upbringing]?.skillCategories.forEach((c) => set.add(c));
    }
    return set;
  }, [cultureEnvironment, cultureOrganization, cultureUpbringing, culture.environment, culture.organization, culture.upbringing]);
  // Include current culture picks even if env/org/upbringing changed and categories no longer match (so they stay removable).
  const availableSkills = Object.entries(allSkills).filter(([id, skill]) => {
    if (selectedSkills.includes(id)) return true;
    return skill.categories.some(
      (c) =>
        unlockedCategories.has(c) ||
        (c === "intepersonal" && unlockedCategories.has("interpersonal"))
    );
  });
  const renderSection = (
  title: string,
  data: Record<string, any>,
  selectedId: string | null,
  onSelect: (id: string) => void,
  nextTab?: 'organization' | 'upbringing') =>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {Object.entries(data).map(([id, item]) => {
      const isSelected = selectedId === id;
      return (
        <button
          key={id}
          onClick={() => {
            onSelect(id);
            if (nextTab) setActiveTab(nextTab);
          }}
          className={`text-left p-5 rounded-xl transition-all duration-200 border-2 flex flex-col ${isSelected ? 'bg-purple-100/60 dark:bg-purple-900/20 border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-900/20' : 'bg-card border-border hover:border-muted-foreground/50 hover:bg-muted/20'}`}>
          
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-foreground">{item.name}</h3>
              {isSelected && <CheckIcon className="w-5 h-5 text-purple-400" />}
            </div>
            <p className="text-sm text-muted-foreground mb-4 flex-grow">
              {item.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              {item.skillCategories.map((cat: string) =>
<span
              key={cat}
              className="text-xs font-semibold px-2 py-1 rounded uppercase bg-muted text-foreground border border-border dark:bg-muted/50 dark:text-foreground">
                {cat}
              </span>
            )}
            </div>
          </button>);

    })}
    </div>;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-4xl font-black tracking-tight italic uppercase mb-2">
          Culture & Background
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          Choose your environment, organization, and upbringing to unlock
          skills.
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('environment')}
          className={`px-4 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'environment' ? 'bg-card text-purple-500 border-b-2 border-purple-500' : 'text-muted-foreground hover:text-foreground'}`}>
          
          1. Environment {cultureEnvironment && '✓'}
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          disabled={!cultureEnvironment}
          className={`px-4 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'organization' ? 'bg-card text-purple-500 border-b-2 border-purple-500' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-50 disabled:cursor-not-allowed`}>
          
          2. Organization {cultureOrganization && '✓'}
        </button>
        <button
          onClick={() => setActiveTab('upbringing')}
          disabled={!cultureOrganization}
          className={`px-4 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'upbringing' ? 'bg-card text-purple-500 border-b-2 border-purple-500' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-50 disabled:cursor-not-allowed`}>
          
          3. Upbringing {cultureUpbringing && '✓'}
        </button>
      </div>

      <div className="flex-1">
        {activeTab === 'environment' &&
        renderSection(
          'Environment',
          culture.environment,
          cultureEnvironment,
          onSelectEnvironment,
          'organization'
        )}
        {activeTab === 'organization' &&
        renderSection(
          'Organization',
          culture.organization,
          cultureOrganization,
          onSelectOrganization,
          'upbringing'
        )}
        {activeTab === 'upbringing' &&
        renderSection(
          'Upbringing',
          culture.upbringing,
          cultureUpbringing,
          onSelectUpbringing
        )}

        {allChoicesMade &&
        <div className="mt-8 pt-8 border-t border-border animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  Skill Selection
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose 3 skills from your unlocked categories. Selecting a
                  skill twice grants Expertise.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center min-w-[100px]">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">
                  Picks Left
                </div>
                <div
                  className={`text-2xl font-black tabular-nums ${3 - selectedSkills.length === 0 ? 'text-green-700 dark:text-green-500' : 'text-foreground'}`}>
                
                  {3 - selectedSkills.length}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {availableSkills.map(([id, skill]) => {
              const count = globalSkillCounts[id] || 0;
              const inCulture = selectedSkills.includes(id);
              const wouldGainExpertise = count === 1 && !inCulture;
              const atExpertiseCap = count >= 2 && !inCulture;
              const canAdd = !atExpertiseCap && selectedSkills.length < 3;
              const canInteract = inCulture || canAdd;
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (inCulture) {
                      onToggleSkill(id);
                    } else if (canAdd) {
                      onToggleSkill(id);
                    }
                  }}
                  disabled={!canInteract}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] ${
                    count >= 2
                      ? "bg-purple-100 border-purple-600 text-foreground ring-1 ring-purple-500/30 dark:bg-purple-900/40 dark:border-purple-500 dark:ring-purple-500/50"
                      : count === 1
                        ? "bg-muted border-purple-400/60 dark:border-purple-500/50"
                        : "bg-card border-border hover:border-muted-foreground/60"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}>
                  
                    <div className="flex justify-between items-start w-full mb-1">
                      <span className="font-bold text-foreground">
                        {skill.name}
                      </span>
                      {count > 0 &&
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${count === 2 ? 'bg-purple-700 text-white dark:bg-purple-500' : 'bg-muted text-purple-900 dark:text-purple-300'}`}>
                      
                          {count === 2 ? 'Expertise' : 'Proficient'}
                        </span>
                    }
                    </div>
                    {wouldGainExpertise && (
                      <span className="text-[10px] font-bold text-purple-800 mb-1 dark:text-purple-300">
                        Next pick grants Expertise
                      </span>
                    )}
                    {atExpertiseCap && (
                      <span className="text-[10px] font-bold text-red-800 mb-1 dark:text-red-300">
                        Expertise already reached
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-wide">
                      {skill.categories.join(', ')}
                    </span>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {skill.description}
                    </p>
                  </button>);

            })}
              {availableSkills.length === 0 &&
            <div className="text-gray-500 italic p-4">
                  No skills available for the selected categories.
                </div>
            }
            </div>
          </div>
        }
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