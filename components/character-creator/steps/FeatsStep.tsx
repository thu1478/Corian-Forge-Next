import React, { useMemo } from "react";
import rulesData from "@/lib/rules.json";
import { CharacterClass } from "@/lib/rules";
import { FeatLevelPick, TraitRef } from "@/lib/baseRefs";
import { formatTraitEffectChoiceLabel } from "@/lib/trait-selection";
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible";
import {
  evaluateFeatPrerequisitesForCreator,
  describeFeatPrerequisitesForCreator,
  type CreatorFeatPrereqContext,
} from "@/lib/feat-prereqs";
import { ChevronRightIcon, ChevronLeftIcon, LockIcon } from "lucide-react";

const FEAT_LEVELS = [1, 3, 5, 7, 9, 10];

type ClassSelection = { id: string; source: string; selectedEffectIndices?: number[] };

interface FeatsStepProps {
  selectedFeats: Partial<Record<number, FeatLevelPick>>;
  adventurerLevel: number;
  classes: CharacterClass[];
  classSelections: ClassSelection[];
  characterTraits: TraitRef[];
  attributes: {
    might: number;
    dexterity: number;
    reason: number;
    willpower: number;
    presence: number;
  };
  onSelectFeat: (level: number, pick: FeatLevelPick | null) => void;
  onNext: () => void;
  onBack: () => void;
}

function needsEffectChoice(feat: any) {
  return (
    typeof feat.selectAmount === "number" &&
    feat.selectAmount > 0 &&
    Array.isArray(feat.effects) &&
    feat.effects.length > feat.selectAmount
  );
}

function toggleEffectIndex(current: number[] | undefined, idx: number, selectAmount: number): number[] {
  const cur = [...(current ?? [])];
  const pos = cur.indexOf(idx);
  if (pos >= 0) {
    cur.splice(pos, 1);
    return cur;
  }
  if (selectAmount <= 0) return cur;
  if (selectAmount === 1) return [idx];
  if (cur.length < selectAmount) {
    cur.push(idx);
    return cur;
  }
  return cur;
}

function featPickComplete(
  level: number,
  selectedFeats: Partial<Record<number, FeatLevelPick>>,
  featsRegistry: Record<string, any>
): boolean {
  const p = selectedFeats[level];
  if (!p?.id) return false;
  const feat = featsRegistry[p.id];
  if (!feat) return false;
  if (needsEffectChoice(feat)) {
    const n = feat.selectAmount ?? 0;
    const idx = p.selectedEffectIndices;
    return Array.isArray(idx) && idx.length === n && new Set(idx).size === n;
  }
  return true;
}

export function FeatsStep({
  selectedFeats,
  adventurerLevel,
  classes,
  classSelections,
  characterTraits,
  attributes,
  onSelectFeat,
  onNext,
  onBack,
}: FeatsStepProps) {
  const featsRegistry = rulesData.system.feats as Record<string, any>;
  const prereqCtx: CreatorFeatPrereqContext = useMemo(
    () => ({
      adventurerLevel,
      classes,
      classSelections,
      traits: characterTraits,
    }),
    [adventurerLevel, classes, classSelections, characterTraits]
  );

  const availableFeatLevels = FEAT_LEVELS.filter((l) => l <= adventurerLevel);
  const allFeatsAssigned =
    availableFeatLevels.length === 0 ||
    availableFeatLevels.every((l) => featPickComplete(l, selectedFeats, featsRegistry));

  const cardClass = (isSelected: boolean, canSelect: boolean) =>
    `flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
      isSelected
        ? "bg-purple-100 border-purple-600 ring-1 ring-purple-500/40 shadow-md dark:bg-purple-900/30 dark:border-purple-500 dark:ring-purple-500/50 dark:shadow-lg dark:shadow-purple-900/20"
        : !canSelect
          ? "bg-muted border-border opacity-60 cursor-not-allowed"
          : "bg-card border-border hover:border-muted-foreground/50 hover:bg-muted/20"
    }`;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-4xl font-black tracking-tight italic uppercase mb-2">Feats</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          Select powerful passive abilities gained as you level up.
        </p>
      </div>

      {availableFeatLevels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-card rounded-xl border border-border max-w-md">
            <h3 className="text-xl font-bold text-foreground mb-2">No Feats Available Yet</h3>
            <p className="text-muted-foreground">
              You gain your first feat at Adventurer Level 1. Please allocate levels in the Class step.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          {availableFeatLevels.map((level) => {
            const selectedPick = selectedFeats[level];
            const selectedFeatId = selectedPick?.id;
            const selectedIndices = selectedPick?.selectedEffectIndices;
            const featsForLevel = Object.entries(featsRegistry).filter(
              ([_, feat]: [string, any]) => feat.minLevel <= level
            );
            return (
              <div key={level} className="bg-card border border-border rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
                  <h3 className="text-lg font-bold text-purple-800 uppercase tracking-wider dark:text-purple-400">
                    Level {level} Feat
                  </h3>
                  {featPickComplete(level, selectedFeats, featsRegistry) ? (
                    <span className="text-xs font-bold bg-green-100 text-green-900 px-2 py-1 rounded border border-green-300 dark:bg-green-900/25 dark:text-green-400 dark:border-green-600/40">
                      Selected
                    </span>
                  ) : (
                    <span className="text-xs font-bold bg-amber-100 text-amber-950 px-2 py-1 rounded border border-amber-400 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-600/50">
                      Pending
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featsForLevel.map(([id, feat]: [string, any]) => {
                    const prereqCheck = evaluateFeatPrerequisitesForCreator(feat, prereqCtx, rulesData as any);
                    const isSelected = selectedFeatId === id;
                    const isSelectedElsewhere = Object.entries(selectedFeats).some(
                      ([l, p]) => Number(l) !== level && p?.id === id
                    );
                    const canSelect = prereqCheck.met && !isSelectedElsewhere;
                    const requiresChoice = needsEffectChoice(feat);
                    const prereqLines = describeFeatPrerequisitesForCreator(feat, prereqCtx, rulesData as any);

                    const header = (
                      <>
                        <div className="flex justify-between items-start w-full mb-2">
                          <h4
                            className={`font-bold ${
                              isSelected ? "text-purple-950 dark:text-white" : "text-foreground"
                            }`}
                          >
                            {feat.name}
                          </h4>
                          {!prereqCheck.met && (
                            <LockIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <ul className="text-[10px] space-y-0.5 mb-2">
                          {prereqLines.map((line, i) => (
                            <li
                              key={i}
                              className={
                                line.met
                                  ? "text-green-800 dark:text-green-400 font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {line.met ? "✓" : "○"} {line.text}
                            </li>
                          ))}
                        </ul>
                        <p
                          className={`text-sm mb-3 flex-grow leading-snug whitespace-pre-line ${
                            isSelected ? "text-purple-950/85 dark:text-gray-300" : "text-muted-foreground"
                          }`}
                        >
                          {feat.description}
                        </p>
                      </>
                    );

                    const footer = (
                      <>
                        {!prereqCheck.met && (
                          <div className="text-[11px] font-bold text-red-900 bg-red-100 border border-red-200 px-2 py-1.5 rounded mt-auto w-full dark:text-red-300 dark:bg-red-950/60 dark:border-red-800/50">
                            {prereqCheck.reason}
                          </div>
                        )}
                        {isSelectedElsewhere && (
                          <div className="text-[10px] font-bold text-foreground bg-muted px-2 py-1 rounded mt-auto w-full border border-border">
                            Selected at another level
                          </div>
                        )}
                        {feat.effects && !requiresChoice && prereqCheck.met && (
                          <div className="text-[10px] font-bold text-sky-950 bg-sky-100 border border-sky-200 px-2 py-1 rounded mt-auto w-fit dark:text-sky-200 dark:bg-sky-950/50 dark:border-sky-700/60">
                            Grants Stats
                          </div>
                        )}
                      </>
                    );

                    if (requiresChoice) {
                      const nPick = feat.selectAmount ?? 1;
                      const pickedHere =
                        isSelected && Array.isArray(selectedIndices) ? selectedIndices : [];
                      return (
                        <div key={id} className={cardClass(isSelected, canSelect || isSelected)}>
                          {header}
                          {feat.powerRoll && (
                            <div className="mb-2">
                              <TraitPowerRollCollapsible roll={feat.powerRoll} attributes={attributes} />
                            </div>
                          )}
                          {prereqCheck.met && !isSelectedElsewhere && Array.isArray(feat.effects) && (
                            <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border/60">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground w-full mb-1">
                                Choose {nPick}:
                              </span>
                              {feat.effects.map((eff: any, idx: number) => {
                                const on = pickedHere.includes(idx);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    disabled={(!canSelect && !isSelected) || isSelectedElsewhere}
                                    onClick={() => {
                                      if (!isSelected) {
                                        onSelectFeat(level, {
                                          id,
                                          selectedEffectIndices: toggleEffectIndex([], idx, nPick),
                                        });
                                        return;
                                      }
                                      if (selectedFeatId !== id) return;
                                      onSelectFeat(level, {
                                        id,
                                        selectedEffectIndices: toggleEffectIndex(selectedIndices, idx, nPick),
                                      });
                                    }}
                                    className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
                                      on
                                        ? "bg-purple-600 text-white border-purple-500 dark:bg-purple-600"
                                        : "bg-muted border-border text-foreground hover:bg-muted/80 disabled:opacity-50"
                                    }`}
                                  >
                                    {formatTraitEffectChoiceLabel(eff, rulesData as any)}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {isSelected && pickedHere.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-2">
                              Active:{" "}
                              <span className="font-semibold text-foreground">
                                {pickedHere
                                  .filter((i) => feat.effects[i])
                                  .map((i) => formatTraitEffectChoiceLabel(feat.effects[i], rulesData as any))
                                  .join(", ")}
                              </span>
                              {pickedHere.length < nPick ? (
                                <span className="block text-amber-700 dark:text-amber-400 mt-1">
                                  Pick {nPick - pickedHere.length} more.
                                </span>
                              ) : null}
                            </p>
                          )}
                          {isSelected && (
                            <button
                              type="button"
                              onClick={() => onSelectFeat(level, null)}
                              className="text-xs font-bold text-muted-foreground hover:text-foreground mt-2 underline"
                            >
                              Clear feat
                            </button>
                          )}
                          {footer}
                        </div>
                      );
                    }

                    return (
                      <div key={id} className={cardClass(isSelected, canSelect)}>
                        <button
                          type="button"
                          onClick={() => onSelectFeat(level, isSelected ? null : { id })}
                          disabled={!canSelect && !isSelected}
                          className="w-full text-left bg-transparent disabled:opacity-60 disabled:cursor-not-allowed rounded-lg"
                        >
                          {header}
                        </button>
                        {feat.powerRoll && (
                          <div className="mt-1 -mx-1">
                            <TraitPowerRollCollapsible roll={feat.powerRoll} attributes={attributes} />
                          </div>
                        )}
                        {footer}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between mt-8 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-secondary-foreground bg-secondary hover:opacity-90 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!allFeatsAssigned && availableFeatLevels.length > 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
            allFeatsAssigned || availableFeatLevels.length === 0
              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          Review Character <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
