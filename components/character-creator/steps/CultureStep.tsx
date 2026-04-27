import React, { useState } from 'react';
import { rules } from './rules';
import { ChevronRightIcon, ChevronLeftIcon, CheckIcon } from 'lucide-react';
interface CultureStepProps {
  cultureEnvironment: string | null;
  cultureOrganization: string | null;
  cultureUpbringing: string | null;
  selectedSkills: string[];
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
  // Gather unlocked categories
  const unlockedCategories = new Set<string>();
  if (cultureEnvironment) {
    rules.system.culture.environment[
    cultureEnvironment]?.
    skillCategories.forEach((c) => unlockedCategories.add(c));
  }
  if (cultureOrganization) {
    rules.system.culture.organization[
    cultureOrganization]?.
    skillCategories.forEach((c) => unlockedCategories.add(c));
  }
  if (cultureUpbringing) {
    rules.system.culture.upbringing[cultureUpbringing]?.skillCategories.forEach(
      (c) => unlockedCategories.add(c)
    );
  }
  // Filter skills based on unlocked categories
  const availableSkills = Object.entries(rules.system.skills).filter(
    ([_, skill]) => {
      return skill.categories.some((c) => unlockedCategories.has(c));
    }
  );
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
          className={`text-left p-5 rounded-xl transition-all duration-200 border-2 flex flex-col ${isSelected ? 'bg-gray-800/80 border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-900/20' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600 hover:bg-gray-800/50'}`}>
          
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-gray-100">{item.name}</h3>
              {isSelected && <CheckIcon className="w-5 h-5 text-purple-400" />}
            </div>
            <p className="text-sm text-gray-400 mb-4 flex-grow">
              {item.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              {item.skillCategories.map((cat: string) =>
            <span
              key={cat}
              className="text-xs font-semibold px-2 py-1 rounded bg-gray-950 text-amber-400 border border-gray-800 uppercase">
              
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
        <h2 className="text-3xl font-bold text-gray-100 mb-2">
          Culture & Background
        </h2>
        <p className="text-gray-400">
          Choose your environment, organization, and upbringing to unlock
          skills.
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('environment')}
          className={`px-4 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'environment' ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}>
          
          1. Environment {cultureEnvironment && '✓'}
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          disabled={!cultureEnvironment}
          className={`px-4 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'organization' ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
          
          2. Organization {cultureOrganization && '✓'}
        </button>
        <button
          onClick={() => setActiveTab('upbringing')}
          disabled={!cultureOrganization}
          className={`px-4 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'upbringing' ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
          
          3. Upbringing {cultureUpbringing && '✓'}
        </button>
      </div>

      <div className="flex-1">
        {activeTab === 'environment' &&
        renderSection(
          'Environment',
          rules.system.culture.environment,
          cultureEnvironment,
          onSelectEnvironment,
          'organization'
        )}
        {activeTab === 'organization' &&
        renderSection(
          'Organization',
          rules.system.culture.organization,
          cultureOrganization,
          onSelectOrganization,
          'upbringing'
        )}
        {activeTab === 'upbringing' &&
        renderSection(
          'Upbringing',
          rules.system.culture.upbringing,
          cultureUpbringing,
          onSelectUpbringing
        )}

        {allChoicesMade &&
        <div className="mt-8 pt-8 border-t border-gray-800 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-100 mb-1">
                  Skill Selection
                </h3>
                <p className="text-sm text-gray-400">
                  Choose 3 skills from your unlocked categories. Selecting a
                  skill twice grants Expertise.
                </p>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-center min-w-[100px]">
                <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                  Picks Left
                </div>
                <div
                className={`text-2xl font-black ${3 - selectedSkills.length === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                
                  {3 - selectedSkills.length}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {availableSkills.map(([id, skill]) => {
              const count = selectedSkills.filter((s) => s === id).length;
              const canSelect = selectedSkills.length < 3 || count > 0; // Can deselect if already picked
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (count === 2) {
                      // If expertise, clicking again removes both (or one depending on logic, let's remove one)
                      onToggleSkill(id);
                    } else if (selectedSkills.length < 3) {
                      onToggleSkill(id);
                    } else if (count > 0) {
                      onToggleSkill(id); // Deselect
                    }
                  }}
                  disabled={!canSelect && count === 0}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] ${count === 2 ? 'bg-purple-900/40 border-purple-500 ring-1 ring-purple-500/50' : count === 1 ? 'bg-gray-800 border-purple-500/50' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}>
                  
                    <div className="flex justify-between items-start w-full mb-1">
                      <span className="font-bold text-gray-200">
                        {skill.name}
                      </span>
                      {count > 0 &&
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${count === 2 ? 'bg-purple-500 text-white' : 'bg-gray-700 text-purple-300'}`}>
                      
                          {count === 2 ? 'Expertise' : 'Proficient'}
                        </span>
                    }
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-500 mb-2">
                      {skill.categories.join(', ')}
                    </span>
                    <p className="text-xs text-gray-400 line-clamp-2">
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