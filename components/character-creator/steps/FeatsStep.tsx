import React from 'react';
import rulesData from "@/lib/rules.json";
import { CharacterClass } from "@/lib/rules";
import { ChevronRightIcon, ChevronLeftIcon, LockIcon } from 'lucide-react';

const FEAT_LEVELS = [1, 3, 5, 7, 9, 10];
interface FeatsStepProps {
  selectedFeats: Partial<Record<number, string>>;
  adventurerLevel: number;
  classes: CharacterClass[];
  onSelectFeat: (level: number, featId: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}
export function FeatsStep({
  selectedFeats,
  adventurerLevel,
  classes,
  onSelectFeat,
  onNext,
  onBack
}: FeatsStepProps) {
  const availableFeatLevels = FEAT_LEVELS.filter((l) => l <= adventurerLevel);
  const allFeatsAssigned = availableFeatLevels.every((l) => selectedFeats[l]);
  // Helper to check if a feat's prerequisites are met
  const checkPrereqs = (feat: any) => {
    if (feat.minLevel > adventurerLevel) {
      return {
        met: false,
        reason: `Requires Adventurer Level ${feat.minLevel}`
      };
    }
    if (feat.prereqs) {
      if (feat.prereqs.classes && feat.prereqs.level) {
        const hasClassLevel = classes.some(
          (c) =>
          feat.prereqs.classes.includes(c.id) &&
          c.level >= feat.prereqs.level
        );
        if (!hasClassLevel) {
          const classNames = feat.prereqs.classes.
          map((cId: string) => (rulesData.classes as Record<string, any>)[cId]?.name || cId).
          join(' or ');
          return {
            met: false,
            reason: `Requires Level ${feat.prereqs.level} in ${classNames}`
          };
        }
      }
    }
    return {
      met: true,
      reason: ''
    };
  };
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-4xl font-black tracking-tight italic uppercase mb-2">Feats</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          Select powerful passive abilities gained as you level up.
        </p>
      </div>

      {availableFeatLevels.length === 0 ?
      <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-card rounded-xl border border-border max-w-md">
            <h3 className="text-xl font-bold text-foreground mb-2">
              No Feats Available Yet
            </h3>
            <p className="text-muted-foreground">
              You gain your first feat at Adventurer Level 1. Please allocate
              levels in the Class step.
            </p>
          </div>
        </div> :

      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          {availableFeatLevels.map((level) => {
          const selectedFeatId = selectedFeats[level];
          const featsForLevel = Object.entries(rulesData.system.feats).filter(([_, feat]) => feat.minLevel <= level);
          return (
            <div
              key={level}
              className="bg-card border border-border rounded-xl p-6">
              
                <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
                  <h3 className="text-lg font-bold text-purple-400 uppercase tracking-wider">
                    Level {level} Feat
                  </h3>
                  {selectedFeatId ?
                <span className="text-xs font-bold bg-green-900/20 text-green-500 px-2 py-1 rounded border border-green-500/30">
                      Selected
                    </span> :

                <span className="text-xs font-bold bg-amber-900/20 text-amber-500 px-2 py-1 rounded border border-amber-500/30">
                      Pending
                    </span>
                }
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featsForLevel.map(([id, feat]) => {
                  const prereqCheck = checkPrereqs(feat);
                  const isSelected = selectedFeatId === id;
                  const isSelectedElsewhere = Object.entries(selectedFeats).some(([l, fId]) => Number(l) !== level && fId === id);
                  const canSelect = prereqCheck.met && !isSelectedElsewhere;
return (
                    <button
                      key={id}
                      onClick={() => onSelectFeat(level, isSelected ? null : id)}
                      disabled={!canSelect && !isSelected}
                      className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "bg-purple-900/30 border-purple-500 ring-1 ring-purple-500/50 shadow-lg shadow-purple-900/20"
                          : !canSelect
                            ? "bg-muted border-border opacity-60 cursor-not-allowed"
                            : "bg-card border-border hover:border-gray-500 hover:bg-muted/20"
                      }`}>
                      <div className="flex justify-between items-start w-full mb-2">
                        <h4
                        className={`font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                          {feat.name}
                        </h4>
                        {!prereqCheck.met &&
                        <LockIcon className="w-4 h-4 text-muted-foreground" />}
                      </div>

                      <p
                      className={`text-xs mb-3 flex-grow ${isSelected ? 'text-gray-300' : 'text-muted-foreground'}`}>
                        {feat.description}
                      </p>

                        {!prereqCheck.met &&
                      <div className="text-[10px] font-bold text-red-400 bg-red-950/50 px-2 py-1 rounded mt-auto w-full">
                            {prereqCheck.reason}
                          </div>
                      }
                        {isSelectedElsewhere && (
                          <div className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded mt-auto w-full">
                            Selected at another level
                          </div>
                        )}
                        {feat.effects &&
                      prereqCheck.met &&
                      <div className="text-[10px] font-bold text-blue-400 bg-blue-950/50 px-2 py-1 rounded mt-auto w-fit">
                              Grants Stats
                            </div>
                      }
                      </button>);

                })}
                </div>
              </div>);

        })}
        </div>
      }

      <div className="flex justify-between mt-8 pt-4 border-t border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-secondary-foreground bg-secondary hover:opacity-90 transition-colors">
          
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!allFeatsAssigned && availableFeatLevels.length > 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${allFeatsAssigned || availableFeatLevels.length === 0 ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
          
          Review Character <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>);

}