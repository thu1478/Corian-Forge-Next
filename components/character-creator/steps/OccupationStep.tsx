import React, { useEffect, useMemo } from "react";
import rulesData from "@/lib/rules.json";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
    collectUnlockedSkillIdsForOccupation,
    getOccupationDefinition,
    getOccupationSourceChips,
    type OccupationRule,
    resolveOccupationLanguagePicks,
    resolveOccupationSkillsCount,
    skillSourceChipClassName,
} from "@/lib/occupation";

interface OccupationStepProps {
    occupationId: string | null;
    occupationSkills: string[];
    occupationLanguages: string[];
    globalSkillCounts: Record<string, number>;
    onSelectOccupation: (id: string) => void;
    onToggleSkill: (id: string) => void;
    onToggleLanguage: (id: string) => void;
    onNext: () => void;
    onBack: () => void;
}

export function OccupationStep({
    occupationId,
    occupationSkills,
    occupationLanguages,
    globalSkillCounts,
    onSelectOccupation,
    onToggleSkill,
    onToggleLanguage,
    onNext,
    onBack,
}: OccupationStepProps) {
    const system = rulesData.system as {
        occupation?: Record<string, OccupationRule>;
        skills: Record<string, { name: string; description?: string; categories?: string[] }>;
        languages: Record<string, { name: string; description?: string }>;
    };
    const occupationRoot = system.occupation ?? {};
    const allSkills = system.skills;
    const allLanguages = system.languages;

    const def = useMemo(
        () => getOccupationDefinition(occupationRoot, occupationId),
        [occupationRoot, occupationId]
    );

    const skillsCap = resolveOccupationSkillsCount(def);
    const languagePicks = resolveOccupationLanguagePicks(def);

    const unlockedSkillIds = useMemo(
        () => collectUnlockedSkillIdsForOccupation(def, allSkills),
        [def, allSkills]
    );

    useEffect(() => {
        if (!occupationLanguages.includes("common")) {
            onToggleLanguage("common");
        }
    }, [occupationLanguages, onToggleLanguage]);

    const additionalLanguages = occupationLanguages.filter((l) => l !== "common");

    const availableSkills = useMemo(() => {
        return Object.entries(allSkills)
            .filter(([id]) => {
                if (occupationSkills.includes(id)) return true;
                if (!def) return false;
                return unlockedSkillIds.has(id);
            })
            .sort((a, b) => {
                const na = a[1].name ?? a[0];
                const nb = b[1].name ?? b[0];
                const cmp = na.localeCompare(nb, undefined, { sensitivity: "base" });
                if (cmp !== 0) return cmp;
                return a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
            });
    }, [allSkills, occupationSkills, def, unlockedSkillIds]);

    const isComplete =
        Boolean(occupationId && def) &&
        occupationSkills.length === skillsCap &&
        additionalLanguages.length === languagePicks;

    const selectionChips = useMemo(
        () => (def ? getOccupationSourceChips(def, allSkills) : []),
        [def, allSkills]
    );

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h2 className="text-4xl font-black tracking-tight italic uppercase mb-2">Occupation</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                    Choose an occupation, then pick skills from the categories it unlocks and your extra languages.
                </p>
            </div>

            <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    1. Occupation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(occupationRoot).map(([id, occ]) => {
                        const selected = occupationId === id;
                        const sourceChips = getOccupationSourceChips(occ, allSkills);
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onSelectOccupation(id)}
                                className={`text-left p-5 rounded-xl transition-all duration-200 border-2 flex flex-col ${
                                    selected
                                        ? "bg-purple-100/60 dark:bg-purple-900/20 border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-900/20"
                                        : "bg-card border-border hover:border-muted-foreground/50 hover:bg-muted/20"
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-foreground">{occ.name}</h3>
                                    {selected && <CheckIcon className="w-5 h-5 text-purple-400" />}
                                </div>
                                <p className="text-sm text-muted-foreground mb-3 flex-grow whitespace-pre-line">
                                    {occ.description ?? ""}
                                </p>
                                {sourceChips.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {sourceChips.map((chip, i) => (
                                            <span
                                                key={`${id}-${chip.kind}-${chip.label}-${i}`}
                                                className={skillSourceChipClassName(chip.kind)}
                                            >
                                                {chip.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 mt-auto text-xs font-semibold">
                                    <span className="px-2 py-1 rounded border bg-muted/50 border-border">
                                        {resolveOccupationSkillsCount(occ)} skills
                                    </span>
                                    <span className="px-2 py-1 rounded border bg-muted/50 border-border">
                                        {resolveOccupationLanguagePicks(occ)} languages
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {occupationId && def && (
                <div className="mt-2 pt-8 border-t border-border animate-in fade-in duration-500 space-y-10">
                    <div>
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Occupation skills</h3>
                                <p className="text-sm text-muted-foreground">
                                    Choose {skillsCap} skills from unlocked categories and picks. Selecting a skill
                                    twice grants Expertise (same rules as culture).
                                </p>
                                {selectionChips.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {selectionChips.map((chip, i) => (
                                            <span
                                                key={`${chip.kind}-${chip.label}-${i}`}
                                                className={skillSourceChipClassName(chip.kind)}
                                            >
                                                {chip.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="bg-card border border-border rounded-xl p-3 text-center min-w-[100px]">
                                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Picks left</div>
                                <div
                                    className={`text-2xl font-black tabular-nums ${
                                        skillsCap - occupationSkills.length === 0
                                            ? "text-green-700 dark:text-green-500"
                                            : "text-foreground"
                                    }`}
                                >
                                    {skillsCap - occupationSkills.length}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {availableSkills.map(([id, skill]) => {
                                const count = globalSkillCounts[id] || 0;
                                const inOcc = occupationSkills.includes(id);
                                const wouldGainExpertise = count === 1 && !inOcc;
                                const atExpertiseCap = count >= 2 && !inOcc;
                                const canAdd = !atExpertiseCap && occupationSkills.length < skillsCap;
                                const canInteract = inOcc || canAdd;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => {
                                            if (inOcc) onToggleSkill(id);
                                            else if (canAdd) onToggleSkill(id);
                                        }}
                                        disabled={!canInteract}
                                        className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] ${
                                            count >= 2
                                                ? "bg-purple-100 border-purple-600 text-foreground ring-1 ring-purple-500/30 dark:bg-purple-900/40 dark:border-purple-500 dark:ring-purple-500/50"
                                                : count === 1
                                                  ? "bg-muted border-purple-400/60 dark:border-purple-500/50"
                                                  : "bg-card border-border hover:border-muted-foreground/60"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <div className="flex justify-between items-start w-full mb-1">
                                            <span className="font-bold text-foreground">{skill.name}</span>
                                            {count > 0 && (
                                                <span
                                                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                        count === 2
                                                            ? "bg-purple-700 text-white dark:bg-purple-500"
                                                            : "bg-muted text-purple-900 dark:text-purple-300"
                                                    }`}
                                                >
                                                    {count === 2 ? "Expertise" : "Proficient"}
                                                </span>
                                            )}
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
                                            {(skill.categories ?? []).join(", ")}
                                        </span>
                                        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                                            {skill.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                        {availableSkills.length === 0 && (
                            <p className="text-sm text-muted-foreground italic mt-4">
                                No skills match this occupation&apos;s categories in the catalog yet.
                            </p>
                        )}
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex justify-between items-end mb-6 border-b border-border pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Languages</h3>
                                <p className="text-sm text-muted-foreground">
                                    Common is automatic. Pick {languagePicks} additional{" "}
                                    {languagePicks === 1 ? "language" : "languages"}.
                                </p>
                            </div>
                            <div className="text-2xl font-black tabular-nums text-foreground bg-muted px-3 py-1 rounded-lg border border-border">
                                {Math.max(0, languagePicks - additionalLanguages.length)}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {Object.entries(allLanguages).map(([id, lang]) => {
                                const isSelected = occupationLanguages.includes(id);
                                const isCommon = id === "common";
                                const canSelect =
                                    isCommon ||
                                    isSelected ||
                                    additionalLanguages.length < languagePicks;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => !isCommon && onToggleLanguage(id)}
                                        disabled={isCommon || !canSelect}
                                        className={`flex flex-col items-start p-3 rounded-lg border transition-all text-left ${
                                            isSelected
                                                ? isCommon
                                                    ? "bg-muted border-border text-foreground cursor-default"
                                                    : "bg-purple-100 border-purple-600 text-foreground ring-1 ring-purple-500/25 dark:bg-purple-900/35 dark:border-purple-500 dark:text-purple-50 dark:ring-purple-500/40"
                                                : "bg-card border-border text-muted-foreground hover:bg-muted/20 hover:border-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="flex justify-between w-full mb-1">
                                            <span className="font-bold text-foreground">{lang.name}</span>
                                            {isCommon && (
                                                <span className="text-xs bg-background/80 dark:bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border/60">
                                                    Automatic
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`text-xs whitespace-pre-line ${
                                                isSelected && !isCommon
                                                    ? "text-purple-900/80 dark:text-purple-100/85"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {lang.description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
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
                    disabled={!isComplete}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                        isComplete
                            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                >
                    Next Step <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
