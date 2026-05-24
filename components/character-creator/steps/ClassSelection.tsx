"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ArrowLeftIcon, PlusIcon, MinusIcon, CheckCircleIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import rulesData from "@/lib/rules.json"
import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager"
import {
    getReactionResourceCostsForInlineRow,
    ReactionResourceCostBadges,
} from "@/components/reaction-resource-cost-badges"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import { unwrapEmbeddedActionCard } from "@/lib/embedded-action-card"
import { getDeityPassiveEntries, resolveDeityBoonDisplay } from "@/lib/priest-deities"
import { formatTraitEffectChoiceLabel } from "@/lib/trait-selection"
import type { SkillChooserRequirement } from "@/lib/grant-skill-effects"
import { allSkillChooserPicksComplete } from "@/lib/grant-skill-effects"
import { SkillGrantPickBlocks } from "@/components/character-creator/skill-grant-pick-blocks"
import {
    conjurerClassTraitRefsFromPicks,
    getConjurerSummonSchoolTag,
    getConjurerSummonSlotCount,
    getCreatureTemplates,
    getSummonMastery,
    listConjurerCatalogTemplateIdsForSlot,
} from "@/lib/creature-roster"
import {
    canAssignClassXpPicksSmallestFirst,
    calculateClassXPCost,
    getAdventurerXpBudget,
    getMaxClassXP,
    getStartingXpForAdventurerLevel,
    summarizeClassXpByAdventurerCutoff,
} from "@/lib/class-xp-display"
import {
    canAddFairytamerTalentPick,
    emptyFairyTamerContracts,
    getFairySpellPickMinLevel,
    isFairySpellAllowedForContractSlot,
    isFairyTamerPicksComplete,
    type FairyTamerContractsSave,
} from "@/lib/fairy-tamer"
import { FairyTamerContractsSection } from "@/components/character-creator/steps/FairyTamerContractsSection"
import {
    artificerHasSpecialInventionPassive,
    formatWeaponInfusionDamageLabel,
    isSpecialInventionSaveComplete,
} from "@/lib/creator-import"
import type {
    InventionVariant,
    SpecialInventionSave,
    WeaponInfusionDamageType,
} from "@/lib/character-data"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

type LevelKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";

type SpecialInventionRulesUi = {
    variants?: Record<string, { name?: string; description?: string; modulePick?: number }>;
    weaponInfusionDamageTypes?: string[];
    modules?: Record<string, { label?: string }>;
};

function toggleInventionModulePick(
    current: string[] | undefined,
    moduleId: string,
    max: number
): string[] {
    const list = [...(current ?? [])];
    const idx = list.indexOf(moduleId);
    if (idx >= 0) {
        list.splice(idx, 1);
        return list;
    }
    if (list.length >= max) return list;
    return [...list, moduleId];
}

export type ClassOptionPick = {
    id: string
    source: string
    selectedEffectIndices?: number[]
    /** Fairy contract spell: counts as a Fairy Tamer class XP pick (same budget as other class talents). */
    fairySpellSlot?: 0 | 1 | 2 | 3
}

function passiveNeedsEffectChoice(passiveDef: { selectAmount?: number; effects?: unknown[] } | null | undefined) {
    const n = passiveDef?.selectAmount
    return (
        typeof n === "number" &&
        n > 0 &&
        Array.isArray(passiveDef?.effects) &&
        passiveDef!.effects!.length > n
    )
}

/** True if `templateId` is chosen on a conjurer slot other than `slotIndex`. */
function isConjurerSummonTakenOnOtherSlot(
    picks: string[] | undefined,
    slotIndex: number,
    templateId: string
): boolean {
    const tid = templateId.trim()
    if (!tid) return false
    return (picks ?? []).some((raw, j) => j !== slotIndex && String(raw ?? "").trim() === tid)
}

function skillGrantRequirementsForClass(
    classId: string,
    requirements: SkillChooserRequirement[]
): SkillChooserRequirement[] {
    const passivePrefix = `classPassive::${classId}::`
    const trainingPrefix = `classTraining::${classId}::`
    return requirements.filter(
        (r) => r.key.startsWith(passivePrefix) || r.key.startsWith(trainingPrefix)
    )
}

interface ClassSelectionProps {
    selectedOptions: ClassOptionPick[];
    classes: { id: string; level: number }[];
    currentAdventurerLevel: number;
    /**
     * Actual XP available to spend on classes (e.g. from character data after earning XP post-creation).
     * Falls back to the threshold for `currentAdventurerLevel` when not provided.
     */
    availableXP?: number;
    attributes: {
        might: number; dexterity: number; reason: number; willpower: number; presence: number;
    };
    /** Priest: filters deity-specific actions in the talent grid. */
    priestDeity?: string | null;
    onPriestDeityChange?: (deityId: string | null) => void;
    /**
     * Total XP the character has earned (stored on save as `xp`).
     * Class budget uses `max(startingXP for adventurer level, totalXP)`.
     */
    totalXP?: number;
    onUpdateTotalXP?: (xp: number) => void;
    onUpdateLevel: (lvl: number) => void;
    onUpdateClassData: (classes: { id: string; level: number }[], traits: ClassOptionPick[]) => void;
    /** Conjurer Summoner: template id per slot (same length as slots when Summoner is active). */
    conjurerSummonTemplateIds?: string[];
    onConjurerSummonsChange?: (templateIds: string[]) => void;
    fairyTamerContracts?: FairyTamerContractsSave;
    onFairyTamerContractsChange?: (contracts: FairyTamerContractsSave) => void;
    specialInvention?: SpecialInventionSave;
    onSpecialInventionChange?: (save: SpecialInventionSave | undefined) => void;
    /** Class passive / skill-training grant pickers shown before Next. */
    skillGrantRequirements?: SkillChooserRequirement[];
    creatorSkillGrantPicks?: Record<string, string[]>;
    skillGrantsComplete?: boolean;
    onSkillGrantPicksChange?: (key: string, ids: string[]) => void;
    /** Skill counts across culture / occupation / grants for picker chrome. */
    grantPickerSkillCounts?: Record<string, number>;
    onBack: () => void;
    onNext: () => void;
}

const ClassSelection: React.FC<ClassSelectionProps> = ({
                                                           selectedOptions,
                                                           classes,
                                                           currentAdventurerLevel,
                                                           availableXP,
                                                           attributes,
                                                           priestDeity = null,
                                                           onPriestDeityChange,
                                                           onUpdateLevel,
                                                           totalXP,
                                                           onUpdateTotalXP,
                                                           onUpdateClassData,
                                                           conjurerSummonTemplateIds = [],
                                                           onConjurerSummonsChange,
                                                           fairyTamerContracts: fairyTamerContractsProp,
                                                           onFairyTamerContractsChange,
                                                           specialInvention,
                                                           onSpecialInventionChange,
                                                           skillGrantRequirements = [],
                                                           creatorSkillGrantPicks = {},
                                                           skillGrantsComplete = true,
                                                           onSkillGrantPicksChange,
                                                           grantPickerSkillCounts = {},
                                                           onBack,
                                                           onNext
                                                       }) => {
    const fairyTamerContracts = fairyTamerContractsProp ?? emptyFairyTamerContracts()
    const [adventurerLevel, setAdventurerLevel] = useState<number>(currentAdventurerLevel);
    const [localClasses, setLocalClasses] = useState<{ id: string; level: number }[]>(classes);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [showTotalXpEditor, setShowTotalXpEditor] = useState(false);
    const [totalXpDraft, setTotalXpDraft] = useState("");

    useEffect(() => {
        setLocalClasses(classes);
    }, [classes]);

    useEffect(() => {
        setAdventurerLevel(currentAdventurerLevel);
    }, [currentAdventurerLevel]);

    // --- SYSTEM MATH ---
    const startingXPPerLvl = rulesData.system.startingXPPerLvl as Record<LevelKey, number>;
    const xpCostPerLvl = rulesData.system.xpCostPerLvl as Record<LevelKey, number>;
    const getStartingXP = (lvl: number) => getStartingXpForAdventurerLevel(lvl, startingXPPerLvl);

    // Use the character's actual XP when provided so an imported character with
    // earned-after-creation XP can spend the surplus on more class levels/talents.
    const totalBudget = getAdventurerXpBudget(
        adventurerLevel,
        totalXP ?? availableXP ?? 0,
        startingXPPerLvl
    );
    const spentBudget = localClasses.reduce(
        (sum, c) => sum + calculateClassXPCost(c.level, xpCostPerLvl),
        0
    );
    const remainingAdventurerXP = totalBudget - spentBudget;

    useEffect(() => {
        if (showTotalXpEditor) {
            setTotalXpDraft(String(totalBudget));
        }
    }, [showTotalXpEditor, totalBudget]);

    const commitTotalXpDraft = () => {
        const parsed = Math.max(0, Math.floor(Number(totalXpDraft) || 0));
        onUpdateTotalXP?.(parsed);
        setTotalXpDraft(String(parsed));
    };
    const hasAtLeastOneClass = localClasses.some((c) => c.level > 0);
    const allClassXPAssigned = localClasses.every((c) => {
        const spentInClass = selectedOptions.filter((o) => o.source === c.id).length;
        return spentInClass === getMaxClassXP(c.level);
    });

    const conjurerSummonerTaken = selectedOptions.some((o) => o.id === "summoner" && o.source === "conjurer");
    const conjurerSlots = getConjurerSummonSlotCount(localClasses, conjurerSummonerTaken);
    const conjurerTraitSketch = useMemo(() => conjurerClassTraitRefsFromPicks(selectedOptions), [selectedOptions]);
    const conjurerSchoolTag = useMemo(
        () => getConjurerSummonSchoolTag(conjurerTraitSketch, rulesData as any),
        [conjurerTraitSketch]
    );
    const conjurerMastery = useMemo(
        () => getSummonMastery(conjurerTraitSketch, localClasses, rulesData as any),
        [conjurerTraitSketch, localClasses]
    );
    const conjurerCatalogIdsBySlot = useMemo(() => {
        if (!conjurerSchoolTag || conjurerMastery < 1 || conjurerSlots <= 0) return [] as string[][];
        return Array.from({ length: conjurerSlots }, (_, i) =>
            listConjurerCatalogTemplateIdsForSlot(rulesData as any, conjurerSchoolTag, conjurerMastery, i)
        );
    }, [conjurerSchoolTag, conjurerMastery, conjurerSlots]);
    const creatureTemplates = useMemo(() => getCreatureTemplates(rulesData as any), []);

    const conjurerSummonPicksComplete = useMemo(() => {
        if (conjurerSlots === 0) return true;
        if (!conjurerSchoolTag) return false;
        const filled: string[] = [];
        for (let i = 0; i < conjurerSlots; i++) {
            const cat = new Set(conjurerCatalogIdsBySlot[i] ?? []);
            const tid = String(conjurerSummonTemplateIds[i] ?? "").trim();
            if (!tid || !cat.has(tid)) return false;
            filled.push(tid);
        }
        if (new Set(filled).size !== filled.length) return false;
        return true;
    }, [conjurerSlots, conjurerSchoolTag, conjurerCatalogIdsBySlot, conjurerSummonTemplateIds]);

    const fairyContractTaken = selectedOptions.some(
        (o) => o.id === "fairyContract" && o.source === "fairytamer"
    );
    const fairytamerLevel = localClasses.find((c) => c.id === "fairytamer")?.level ?? 0;
    const fairyTamerPicksComplete = useMemo(
        () => isFairyTamerPicksComplete(fairyTamerContracts, fairytamerLevel, fairyContractTaken),
        [fairyContractTaken, fairytamerLevel, fairyTamerContracts]
    );

    const artificerLevel = localClasses.find((c) => c.id === "artificer")?.level ?? 0;
    const specialInventionNeeded = artificerHasSpecialInventionPassive(
        selectedOptions,
        localClasses
    );
    const specialInventionComplete =
        !specialInventionNeeded || isSpecialInventionSaveComplete(specialInvention);

    const getTalentLevelForPick = (pick: ClassOptionPick): number => {
        if (pick.source === "fairytamer" && pick.fairySpellSlot != null) {
            return getFairySpellPickMinLevel(pick.fairySpellSlot, fairyTamerContracts, pick.id)
        }
        const classData = (rulesData.classes as any)[pick.source]
        if (classData?.passives?.[pick.id]) return classData.passives[pick.id].minLevel || 1
        if (classData?.actions?.[pick.id]) return classData.actions[pick.id].minLevel || 1
        const react = (classData?.reactions || []).find((r: any) => r.id === pick.id)
        return react ? react.level || react.minLevel || 1 : 1
    }

    // --- SELECTION LOGIC ---
    const handleToggleTalent = (optionId: string, sourceClassId: string) => {
        const isSelected = selectedOptions.some(
            (s) => s.id === optionId && s.source === sourceClassId && s.fairySpellSlot == null
        )
        if (isSelected) {
            onUpdateClassData(
                localClasses,
                selectedOptions.filter(
                    (s) => !(s.id === optionId && s.source === sourceClassId && s.fairySpellSlot == null)
                )
            )
            return
        }

        const currentClassLevel = localClasses.find((c) => c.id === sourceClassId)?.level || 0
        const classData = (rulesData.classes as any)[sourceClassId]
        const passiveDef = classData?.passives?.[optionId]
        const needsPassiveChoice = passiveNeedsEffectChoice(passiveDef)
        const actionDef = classData?.actions?.[optionId] as { deityId?: string } | undefined
        if (sourceClassId === "priest" && actionDef?.deityId) {
            if (!priestDeity || actionDef.deityId !== priestDeity) return
        }

        const classSelections = selectedOptions.filter((o) => o.source === sourceClassId)
        if (classSelections.length >= getMaxClassXP(currentClassLevel)) return

        const mergedPickLevels = [
            ...classSelections.map((s) => getTalentLevelForPick(s)),
            getTalentLevelForPick({ id: optionId, source: sourceClassId }),
        ]
        if (!canAssignClassXpPicksSmallestFirst(mergedPickLevels, currentClassLevel)) return

        const nextPick: ClassOptionPick = needsPassiveChoice
            ? { id: optionId, source: sourceClassId, selectedEffectIndices: [0] }
            : { id: optionId, source: sourceClassId }
        onUpdateClassData(localClasses, [...selectedOptions, nextPick])
    }

    const handleToggleFairySpell = (cardId: string, slot: 0 | 1 | 2 | 3) => {
        const existingIdx = selectedOptions.findIndex(
            (s) => s.id === cardId && s.source === "fairytamer" && s.fairySpellSlot === slot
        )
        if (existingIdx >= 0) {
            const next = selectedOptions.filter((_, i) => i !== existingIdx)
            onUpdateClassData(localClasses, next)
            return
        }
        if (!isFairySpellAllowedForContractSlot(fairyTamerContracts, slot, cardId)) return
        const ftLvl = localClasses.find((c) => c.id === "fairytamer")?.level ?? 0
        const newLevel = getFairySpellPickMinLevel(slot, fairyTamerContracts, cardId)
        const ftPicks = selectedOptions.filter((o) => o.source === "fairytamer")
        if (
            !canAddFairytamerTalentPick(ftLvl, ftPicks, newLevel, getTalentLevelForPick, getMaxClassXP)
        ) {
            return
        }
        const nextPick: ClassOptionPick = { id: cardId, source: "fairytamer", fairySpellSlot: slot }
        onUpdateClassData(localClasses, [...selectedOptions, nextPick])
    }

    const isFairySpellSelected = (cardId: string, slot: 0 | 1 | 2 | 3) =>
        selectedOptions.some((s) => s.id === cardId && s.source === "fairytamer" && s.fairySpellSlot === slot)

    const canSelectFairySpell = (cardId: string, slot: 0 | 1 | 2 | 3) => {
        if (isFairySpellSelected(cardId, slot)) return true
        if (!isFairySpellAllowedForContractSlot(fairyTamerContracts, slot, cardId)) return false
        const ftLvl = localClasses.find((c) => c.id === "fairytamer")?.level ?? 0
        const newLevel = getFairySpellPickMinLevel(slot, fairyTamerContracts, cardId)
        const ftPicks = selectedOptions.filter((o) => o.source === "fairytamer")
        return canAddFairytamerTalentPick(ftLvl, ftPicks, newLevel, getTalentLevelForPick, getMaxClassXP)
    }

    const setPassiveEffectIndex = (classId: string, passiveId: string, effectIdx: number) => {
        onUpdateClassData(
            localClasses,
            selectedOptions.map((s) =>
                s.id === passiveId && s.source === classId
                    ? { ...s, selectedEffectIndices: [effectIdx] }
                    : s
            )
        );
    };

    const handleClassLevelChange = (id: string, delta: number) => {
        const current = localClasses.find(c => c.id === id)?.level || 0;
        const next = Math.max(0, Math.min(10, current + delta));
        const updated = next === 0 ? localClasses.filter(c => c.id !== id)
            : current === 0 ? [...localClasses, { id, level: next }]
                : localClasses.map(c => c.id === id ? { ...c, level: next } : c);
        setLocalClasses(updated);
        const optionsAfterLevelChange =
            next === 0
                ? selectedOptions.filter((o) => o.source !== id)
                : selectedOptions;
        onUpdateClassData(updated, optionsAfterLevelChange);
    };

    const renderTalentSection = (classId: string, type: 'passives' | 'actions' | 'reactions', lvl: number) => {
        const classData = (rulesData.classes as any)[classId];
        let talents: any[];

        if (type === 'reactions') {
            talents = (classData.reactions || []).filter((r: any) => (r.level || r.minLevel || 1) === lvl);
        } else {
            talents = Object.entries(classData[type] || {})
                .filter(([_, d]: any) => (d.minLevel || d.level || 1) === lvl)
                .map(([id, d]: any) => ({ ...d, id }));
            if (type === "actions" && classId === "priest") {
                talents = talents.filter(
                    (t: any) => !t.deityId || (priestDeity && t.deityId === priestDeity)
                );
            }
            if (type === "passives" && classId === "priest") {
                talents = talents.map((t: any) => {
                    if (t.id !== "deityBoon") return t;
                    const base = classData.passives?.deityBoon ?? {};
                    const merged = resolveDeityBoonDisplay(rulesData, priestDeity, base);
                    return { ...t, name: merged.name, description: merged.description };
                });
            }
        }

        if (talents.length === 0) return null;

        return (
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-l-2 border-primary pl-3">{type}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {talents.map((talent) => {
                        const id = talent.id;
                        const isSelected = selectedOptions.some(
                            (s) => s.id === id && s.source === classId && s.fairySpellSlot == null
                        );
                        const selectionRef = selectedOptions.find(
                            (s) => s.id === id && s.source === classId && s.fairySpellSlot == null
                        );
                        const pickedPassiveIdx = selectionRef?.selectedEffectIndices?.[0];
                        const showPassiveChoices =
                            type === "passives" && passiveNeedsEffectChoice(talent) && isSelected;
                        const isLocked = (localClasses.find(c => c.id === classId)?.level || 0) < lvl;

                        let cardData: Record<string, unknown> & { id: string; tags: string[] } | null = null
                        if (talent.actionCard) {
                            const raw = unwrapEmbeddedActionCard(talent.actionCard as Record<string, unknown>)
                            if (raw) {
                                cardData = {
                                    ...raw,
                                    id,
                                    tags: (Array.isArray(raw.tags) ? raw.tags : []) as string[],
                                }
                            }
                        }

                        const isReaction = type === "reactions"
                        const showReactionRuleBlock = isReaction && cardData
                        const reactionInlineCosts = isReaction
                            ? getReactionResourceCostsForInlineRow(
                                  talent as Record<string, unknown>,
                                  cardData as Record<string, unknown> | null
                              )
                            : null

                        return (
                            <div key={id} className="relative h-full">
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 z-20 bg-primary text-white rounded-full p-1 shadow-lg border-2 border-background">
                                        <CheckCircleIcon size={16} />
                                    </div>
                                )}
                                <div onClick={() => !isLocked && handleToggleTalent(id, classId)} className={cn("transition-all h-full cursor-pointer", isSelected && "ring-2 ring-primary rounded-xl ring-offset-2 ring-offset-background", isLocked && "opacity-30 grayscale pointer-events-none")}>
                                    {showReactionRuleBlock ? (
                                        <div className={cn("p-5 rounded-xl border-2 transition-all bg-card h-full flex flex-col gap-3", isSelected ? "border-primary" : "border-border hover:border-primary/40")}>
                                            <div>
                                                <h4 className="font-bold text-base text-foreground mb-2">{talent.name}</h4>
                                                {talent.trigger ? (
                                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 whitespace-pre-line">
                                                        Trigger: {talent.trigger}
                                                    </p>
                                                ) : null}
                                                {reactionInlineCosts ? (
                                                    <ReactionResourceCostBadges
                                                        costs={reactionInlineCosts}
                                                        className="mb-2"
                                                    />
                                                ) : null}
                                                {talent.description ? (
                                                    <p className="text-sm text-muted-foreground leading-relaxed italic whitespace-pre-line">
                                                        {talent.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="pointer-events-none border-t border-border/60 pt-3 mt-1 min-h-0">
                                                <ActionCardComponent
                                                    action={cardData as any}
                                                    attributes={attributes}
                                                    forceCollapsed={false}
                                                    disabled={isLocked}
                                                    currentWeapon={null}
                                                />
                                            </div>
                                        </div>
                                    ) : !cardData ? (
                                        <div className={cn("p-5 rounded-xl border-2 transition-all bg-card h-full", isSelected ? "border-primary" : "border-border hover:border-primary/40")}>
                                            <h4 className="font-bold text-sm uppercase mb-1">{talent.name}</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed italic mb-2 whitespace-pre-line">{talent.trigger}</p>
                                            {reactionInlineCosts ? (
                                                <ReactionResourceCostBadges
                                                    costs={reactionInlineCosts}
                                                    className="mb-2"
                                                />
                                            ) : null}
                                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{talent.description}</p>
                                            {talent.powerRoll && (
                                                <TraitPowerRollCollapsible roll={talent.powerRoll} attributes={attributes} />
                                            )}
                                            {showPassiveChoices && Array.isArray(talent.effects) ? (
                                                <div
                                                    className="flex flex-wrap gap-2 pt-3 mt-2 border-t border-border/70"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                >
                                                    <span className="text-[10px] font-bold uppercase text-muted-foreground w-full">
                                                        Choose one
                                                    </span>
                                                    {talent.effects.map((eff: Record<string, unknown>, idx: number) => {
                                                        const on = pickedPassiveIdx === idx;
                                                        return (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPassiveEffectIndex(classId, id, idx);
                                                                }}
                                                                className={cn(
                                                                    "text-xs font-semibold px-3 py-2 rounded-lg border transition-colors",
                                                                    on
                                                                        ? "bg-primary text-primary-foreground border-primary"
                                                                        : "bg-muted/50 border-border hover:bg-muted"
                                                                )}
                                                            >
                                                                {formatTraitEffectChoiceLabel(eff as any, rulesData as any)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="pointer-events-none">
                                            <ActionCardComponent action={cardData as any} attributes={attributes} forceCollapsed={false} disabled={isLocked} currentWeapon={null} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- VIEW LOGIC ---
    if (expandedClassId) {
        const classData = (rulesData.classes as any)[expandedClassId];
        const currentClassLevel = localClasses.find(c => c.id === expandedClassId)?.level || 0;
        const spentInClass = selectedOptions.filter(o => o.source === expandedClassId).length;
        const maxInClass = getMaxClassXP(currentClassLevel);
        const classXpByCutoff = summarizeClassXpByAdventurerCutoff(
            currentClassLevel,
            selectedOptions.filter((o) => o.source === expandedClassId).map((o) => getTalentLevelForPick(o))
        );
        const priestDeityL3Passives =
            expandedClassId === "priest" && priestDeity && currentClassLevel >= 3
                ? getDeityPassiveEntries(rulesData, priestDeity)
                : [];

        return (
            <div className="p-8 max-w-6xl mx-auto min-h-screen">
                <div className="flex justify-between items-center mb-12">
                    <button onClick={() => setExpandedClassId(null)} className="flex items-center gap-2 text-muted-foreground hover:text-primary font-black uppercase text-[14px] tracking-widest transition-colors">
                        <ArrowLeftIcon size={20} /> Back
                    </button>
                    <div className="bg-card border border-border px-6 py-4 rounded-2xl max-w-xl">
                        <div className="flex items-baseline justify-between gap-4 mb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Class XP
                            </span>
                            <div className="text-2xl font-black tabular-nums">
                                {spentInClass} <span className="text-base opacity-40 font-semibold">/ {maxInClass}</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug mb-3">
                            Class XP gained in earlier levels cannot be spent on higher level options, but higher level class xp can be spent on lower level options.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {classXpByCutoff.map((row) => (
                                <div
                                    key={row.cutoff}
                                    className={cn(
                                        "rounded-xl border px-3.5 py-2.5 min-w-[8rem]",
                                        row.remaining > 0
                                            ? "border-primary/40 bg-primary/5"
                                            : "border-border/80 bg-muted/30"
                                    )}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:text-xs">
                                        Adv. {row.cutoff}{" "}
                                        <span className="font-mono font-semibold opacity-80">(cl {row.classLevelRangeLabel})</span>
                                    </div>
                                    <div className="text-base font-black tabular-nums mt-1">
                                        {row.remaining}
                                        <span className="text-sm opacity-50 font-semibold"> / {row.total}</span>
                                        <span className="text-xs font-semibold text-muted-foreground ml-1">remaining</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <header className="mb-16">
                    <div className="max-w-3xl space-y-6">
                        <h1 className="text-5xl font-black uppercase italic tracking-tighter">{classData.name}</h1>
                        {typeof classData.description === "string" && classData.description.trim() ? (
                            <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                                {classData.description}
                            </p>
                        ) : null}
                        {(classData.focusFeat?.name || classData.focusFeat?.description) ? (
                            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-primary">
                                    Focus feature
                                </p>
                                {classData.focusFeat?.name ? (
                                    <h2 className="mb-2 text-lg font-black uppercase italic tracking-tight text-foreground">
                                        {classData.focusFeat.name}
                                    </h2>
                                ) : null}
                                {typeof classData.focusFeat?.description === "string" &&
                                classData.focusFeat.description.trim() ? (
                                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                        {classData.focusFeat.description}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                        {(() => {
                            if (
                                !onSkillGrantPicksChange ||
                                skillGrantRequirements.length === 0 ||
                                expandedClassId == null
                            ) {
                                return null
                            }
                            const reqsThisClass = skillGrantRequirementsForClass(
                                expandedClassId,
                                skillGrantRequirements
                            )
                            if (reqsThisClass.length === 0) return null
                            const grantsOk = allSkillChooserPicksComplete(reqsThisClass, creatorSkillGrantPicks ?? {})
                            return (
                                <Collapsible defaultOpen className="mt-10 rounded-2xl border border-primary/25 bg-muted/20 overflow-hidden">
                                    <CollapsibleTrigger
                                        type="button"
                                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40 border-b border-transparent data-[state=open]:border-border/60 [&[data-state=open]>svg:last-child]:rotate-180"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                Skill training & passive grants
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground font-medium normal-case tracking-normal">
                                                Choices from this class (e.g. bonus training or Knowledge is Power). Collapse when you&apos;re done to focus on talents.
                                            </p>
                                            {!grantsOk ? (
                                                <p className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                                                    Required picks unfinished — assign skills below.
                                                </p>
                                            ) : null}
                                        </div>
                                        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="border-t border-border/60 bg-card/60 px-4 pb-6 pt-4">
                                            <SkillGrantPickBlocks
                                                density="inline"
                                                showOuterHeading={false}
                                                requirements={reqsThisClass}
                                                picks={creatorSkillGrantPicks}
                                                globalSkillCounts={grantPickerSkillCounts}
                                                attributes={attributes}
                                                onChange={onSkillGrantPicksChange}
                                            />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )
                        })()}
                        {typeof classData.primaryAttribute === "string" && classData.primaryAttribute.trim() ? (
                            <p className="text-sm text-muted-foreground">
                                <span className="font-bold text-foreground">Primary attribute:</span>{" "}
                                {String(classData.primaryAttribute).replace(/^\w/, (c) => c.toUpperCase())}
                            </p>
                        ) : null}
                        {typeof classData.freeFeaturesNote === "string" && classData.freeFeaturesNote.trim() ? (
                            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line border-l-2 border-primary/40 pl-4">
                                {classData.freeFeaturesNote}
                            </p>
                        ) : null}
                        {expandedClassId === "priest" && currentClassLevel > 0 && Array.isArray(classData.deities) && classData.deities.length > 0 ? (
                            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                    Deity (unlocks matching class talents)
                                </label>
                                <select
                                    className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
                                    value={priestDeity ?? ""}
                                    onChange={(e) => onPriestDeityChange?.(e.target.value ? e.target.value : null)}
                                >
                                    <option value="">— Select a deity —</option>
                                    {classData.deities.map((d: { id: string; name: string }) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                                {Array.isArray(classData.elementalAspects) && classData.elementalAspects.length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Elemental aspects: {classData.elementalAspects.join(", ")}
                                    </p>
                                ) : null}
                                {priestDeityL3Passives.length > 0 ? (
                                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                                            Level 3 deity passive
                                        </p>
                                        {priestDeityL3Passives.map((p) => (
                                            <div key={p.slug}>
                                                <p className="text-sm font-bold text-foreground">{p.name}</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                                    {p.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : priestDeity && currentClassLevel >= 3 ? (
                                    <p className="text-xs text-muted-foreground italic">
                                        No passive data for this deity in rules.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </header>

                <div className="space-y-24">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => {
                        const hasContent = ['passives', 'actions', 'reactions'].some(type => {
                            if (type === 'reactions') return (classData.reactions || []).some((r: any) => (r.level || r.minLevel || 1) === lvl);
                            if (type === "actions" && expandedClassId === "priest") {
                                return Object.entries(classData.actions || {}).some(([_, d]: any) => {
                                    if ((d.minLevel || d.level || 1) !== lvl) return false;
                                    if (!d.deityId) return true;
                                    return Boolean(priestDeity && d.deityId === priestDeity);
                                });
                            }
                            return Object.values((classData[type] || {})).some((d: any) => (d.minLevel || d.level || 1) === lvl);
                        });
                        if (!hasContent) return null;
                        return (
                            <section key={lvl} className="space-y-10">
                                <h2 className="text-2xl font-black italic uppercase text-foreground/20">Level {lvl}</h2>
                                <div className="space-y-12 ml-4">
                                    {renderTalentSection(expandedClassId, 'passives', lvl)}
                                    {renderTalentSection(expandedClassId, 'actions', lvl)}
                                    {renderTalentSection(expandedClassId, 'reactions', lvl)}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {expandedClassId === "conjurer" && conjurerSummonerTaken && conjurerSlots > 0 ? (
                    <section className="mt-16 rounded-2xl border border-border bg-card/80 p-6 space-y-4">
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground">
                            Conjurer summons
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Choose one summon or minion per slot here (not on the character sheet). Slots 1–2 use rank-1
                            (level 2) creatures only; each creature can fill only one slot. Summon Mastery{" "}
                            <span className="font-mono font-semibold text-foreground">{conjurerMastery}</span>
                            {conjurerMastery >= 2
                                ? " — slot 3 also lists level 4 creatures (Great Summoner at Conjurer 5+)."
                                : " — tier 4 unlocks on slot 3 with Great Summoner once class level meets that passive."}
                        </p>
                        {!conjurerSchoolTag ? (
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Select <strong>Golemancy</strong> or <strong>Necromancy</strong> on the Summoner passive
                                above, then assign your creatures.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {Array.from({ length: conjurerSlots }, (_, i) => (
                                    <div key={i} className="space-y-1.5 max-w-md">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                            Slot {i + 1} ({conjurerSchoolTag === "geomancy" ? "Geomancy" : "Necromancy"})
                                        </Label>
                                        <Select
                                            value={conjurerSummonTemplateIds[i]?.trim() || undefined}
                                            onValueChange={(v) => {
                                                if (!onConjurerSummonsChange) return;
                                                const next = [...conjurerSummonTemplateIds];
                                                while (next.length < conjurerSlots) next.push("");
                                                for (let j = 0; j < conjurerSlots; j++) {
                                                    if (j !== i && String(next[j] ?? "").trim() === v) next[j] = "";
                                                }
                                                next[i] = v;
                                                onConjurerSummonsChange(next);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 text-sm">
                                                <SelectValue placeholder="Select creature…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(conjurerCatalogIdsBySlot[i] ?? [])
                                                    .filter(
                                                        (tid) =>
                                                            !isConjurerSummonTakenOnOtherSlot(
                                                                conjurerSummonTemplateIds,
                                                                i,
                                                                tid
                                                            ) ||
                                                            String(conjurerSummonTemplateIds[i] ?? "").trim() === tid
                                                    )
                                                    .map((tid) => (
                                                        <SelectItem key={tid} value={tid}>
                                                            {creatureTemplates[tid]?.name ?? tid}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                ) : null}

                {expandedClassId === "artificer" &&
                specialInventionNeeded &&
                onSpecialInventionChange ? (
                    (() => {
                        const si = (rulesData.classes as Record<string, { specialInvention?: SpecialInventionRulesUi }>)
                            .artificer?.specialInvention;
                        const variant = specialInvention?.variant;
                        const armorPool =
                            (rulesData.items as Record<string, { inventionModulePool?: string[] }>)
                                .arm_artificer_armor?.inventionModulePool ?? [];
                        const backpackPool =
                            (rulesData.items as Record<string, { inventionModulePool?: string[] }>)
                                .gear_support_backpack?.inventionModulePool ?? [];
                        const armorModules = specialInvention?.armorModules ?? [];
                        const backpackModules = specialInvention?.backpackModules ?? [];
                        const modulePick =
                            si?.variants?.modularArmor?.modulePick ??
                            si?.variants?.supportBackpack?.modulePick ??
                            2;
                        const needsInfusionType = backpackModules.includes("weaponInfusion");
                        const infusionTypes = (si?.weaponInfusionDamageTypes ?? []).filter((d) =>
                            ["volt", "water", "fire", "earth"].includes(String(d))
                        ) as WeaponInfusionDamageType[];

                        return (
                            <section className="mt-16 rounded-2xl border border-border bg-card/80 p-6 space-y-6">
                                <div>
                                    <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground">
                                        Special Invention
                                    </h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                                        Choose one invention at Artificer level 3. Modular Armor and Support
                                        Backpack each require exactly {modulePick} modules; Weapon Infusion also
                                        needs a damage type.
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {Object.entries(si?.variants ?? {}).map(([id, def]) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() =>
                                                onSpecialInventionChange({
                                                    variant: id as InventionVariant,
                                                    armorModules:
                                                        id === "modularArmor"
                                                            ? specialInvention?.armorModules
                                                            : undefined,
                                                    backpackModules:
                                                        id === "supportBackpack"
                                                            ? specialInvention?.backpackModules
                                                            : undefined,
                                                    weaponInfusionDamageType:
                                                        id === "supportBackpack"
                                                            ? specialInvention?.weaponInfusionDamageType
                                                            : undefined,
                                                })
                                            }
                                            className={cn(
                                                "rounded-xl border p-4 text-left transition-colors",
                                                variant === id
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-primary/40"
                                            )}
                                        >
                                            <div className="font-bold text-sm">{def.name ?? id}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {def.description ?? ""}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {variant === "modularArmor" ? (
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                            Armor modules (pick {modulePick})
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {armorPool.map((mid) => {
                                                const selected = armorModules.includes(mid);
                                                const disabled =
                                                    !selected && armorModules.length >= modulePick;
                                                return (
                                                    <button
                                                        key={mid}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() =>
                                                            onSpecialInventionChange({
                                                                variant: "modularArmor",
                                                                armorModules: toggleInventionModulePick(
                                                                    armorModules,
                                                                    mid,
                                                                    modulePick
                                                                ),
                                                                backpackModules: undefined,
                                                                weaponInfusionDamageType: undefined,
                                                            })
                                                        }
                                                        className={cn(
                                                            "rounded-lg border px-3 py-2 text-xs font-semibold",
                                                            selected
                                                                ? "border-primary bg-primary text-primary-foreground"
                                                                : "border-border disabled:opacity-40"
                                                        )}
                                                    >
                                                        {si?.modules?.[mid]?.label ?? mid}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                                {variant === "supportBackpack" ? (
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                                Backpack modules (pick {modulePick})
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {backpackPool.map((mid) => {
                                                    const selected = backpackModules.includes(mid);
                                                    const disabled =
                                                        !selected &&
                                                        backpackModules.length >= modulePick;
                                                    return (
                                                        <button
                                                            key={mid}
                                                            type="button"
                                                            disabled={disabled}
                                                            onClick={() => {
                                                                const nextMods = toggleInventionModulePick(
                                                                    backpackModules,
                                                                    mid,
                                                                    modulePick
                                                                );
                                                                onSpecialInventionChange({
                                                                    variant: "supportBackpack",
                                                                    backpackModules: nextMods,
                                                                    armorModules: undefined,
                                                                    weaponInfusionDamageType:
                                                                        nextMods.includes("weaponInfusion")
                                                                            ? specialInvention?.weaponInfusionDamageType
                                                                            : undefined,
                                                                });
                                                            }}
                                                            className={cn(
                                                                "rounded-lg border px-3 py-2 text-xs font-semibold",
                                                                selected
                                                                    ? "border-primary bg-primary text-primary-foreground"
                                                                    : "border-border disabled:opacity-40"
                                                            )}
                                                        >
                                                            {si?.modules?.[mid]?.label ?? mid}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {needsInfusionType ? (
                                            <div className="space-y-1.5 max-w-xs">
                                                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                                    Weapon Infusion damage type
                                                </Label>
                                                <Select
                                                    value={
                                                        specialInvention?.weaponInfusionDamageType ?? ""
                                                    }
                                                    onValueChange={(v) =>
                                                        onSpecialInventionChange({
                                                            variant: "supportBackpack",
                                                            backpackModules,
                                                            weaponInfusionDamageType:
                                                                v as WeaponInfusionDamageType,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger className="h-10 text-sm">
                                                        <SelectValue placeholder="Select type…" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {infusionTypes.map((dt) => (
                                                            <SelectItem key={dt} value={dt}>
                                                                {formatWeaponInfusionDamageLabel(dt)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </section>
                        );
                    })()
                ) : null}

                {expandedClassId === "fairytamer" &&
                fairyContractTaken &&
                fairytamerLevel >= 1 &&
                onFairyTamerContractsChange ? (
                    <FairyTamerContractsSection
                        contracts={fairyTamerContracts}
                        ftLevel={fairytamerLevel}
                        creatureTemplates={creatureTemplates}
                        attributes={attributes}
                        onChange={onFairyTamerContractsChange}
                        onToggleFairySpell={handleToggleFairySpell}
                        isFairySpellSelected={isFairySpellSelected}
                        canSelectFairySpell={canSelectFairySpell}
                    />
                ) : null}
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto text-foreground">
            <header className="flex justify-between items-end mb-16">
                <div>
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Classes</h1>
                    <select value={adventurerLevel} onChange={(e) => {const v = Number(e.target.value); setAdventurerLevel(v); onUpdateLevel(v);}} className="bg-secondary p-3 rounded-xl font-black text-xs border border-border">
                        {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>Lvl {i+1} Adventurer</option>)}
                    </select>
                </div>
                <div className="text-right bg-card border border-border p-6 rounded-3xl min-w-[12rem]">
                    <div className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Available XP</div>
                    <div className={cn("text-4xl font-black tabular-nums", remainingAdventurerXP < 0 ? 'text-destructive' : 'text-foreground')}>
                        {remainingAdventurerXP}
                    </div>
                    {onUpdateTotalXP ? (
                        <div className="mt-3 pt-3 border-t border-border/80">
                            <button
                                type="button"
                                onClick={() => setShowTotalXpEditor((v) => !v)}
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                            >
                                {showTotalXpEditor ? "Hide total XP" : "Set total XP"}
                            </button>
                            {showTotalXpEditor ? (
                                <div className="mt-3 space-y-2 text-left">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Total XP
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={totalXpDraft}
                                        onChange={(e) => setTotalXpDraft(e.target.value)}
                                        onBlur={commitTotalXpDraft}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                commitTotalXpDraft();
                                            }
                                        }}
                                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2 font-black text-sm tabular-nums"
                                    />
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        {spentBudget} spent · {totalBudget} total
                                        {totalBudget > getStartingXP(adventurerLevel)
                                            ? " (above adventurer tier minimum)"
                                            : null}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(rulesData.classes as Record<string, { name?: string }>)
                    .slice()
                    .sort((a, b) =>
                        String(a[1].name ?? a[0]).localeCompare(String(b[1].name ?? b[0]), undefined, {
                            sensitivity: "base",
                        })
                    )
                    .map(([id, classData]: any) => {
                    const currentLevel = localClasses.find(c => c.id === id)?.level || 0;
                    const nextCost = (rulesData.system.xpCostPerLvl as any)[(currentLevel + 1).toString()] || 0;
                    const isComplete = getMaxClassXP(currentLevel) === selectedOptions.filter(o => o.source === id).length;
                    const xpBands =
                        currentLevel > 0
                            ? summarizeClassXpByAdventurerCutoff(
                                  currentLevel,
                                  selectedOptions.filter((o) => o.source === id).map((o) => getTalentLevelForPick(o))
                              )
                            : [];

                    return (
                        <div key={id} className={cn("bg-card border-2 rounded-[2.5rem] p-8 transition-all", currentLevel > 0 ? "border-primary shadow-lg shadow-primary/5" : "border-border")}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6">
                                <div className="min-w-0 flex-1 pr-2">
                                    <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter break-words leading-tight">
                                        {classData.name}
                                    </h2>
                                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest block mt-1">
                                        Focus: {classData.focusFeat?.name ?? "None"}
                                    </span>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Next level XP cost: {currentLevel >= 10 ? "MAX" : nextCost}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-secondary rounded-full p-1 border border-border shrink-0 self-start">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleClassLevelChange(id, -1); }} className="p-1 rounded-full hover:bg-background/80"><MinusIcon size={14}/></button>
                                    <span className="font-black text-xs tabular-nums min-w-[1.25rem] text-center">{currentLevel}</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleClassLevelChange(id, 1); }} disabled={remainingAdventurerXP < nextCost} className="p-1 rounded-full hover:bg-background/80 disabled:opacity-40"><PlusIcon size={14}/></button>
                                </div>
                            </div>
                            {xpBands.length > 0 ? (
                                <div className="mb-3 flex flex-wrap gap-2 text-xs leading-snug sm:text-sm">
                                    {xpBands.map((row) => (
                                        <span
                                            key={row.cutoff}
                                            className={cn(
                                                "rounded-md border px-2.5 py-1.5 font-mono tabular-nums",
                                                row.remaining > 0
                                                    ? "border-primary/35 bg-primary/10 text-foreground"
                                                    : "border-border/70 text-muted-foreground"
                                            )}
                                            title={`Adventurer tier ${row.cutoff} (class lv ${row.classLevelRangeLabel}): ${row.remaining} of ${row.total} picks remaining`}
                                        >
                                            {row.cutoff}: {row.remaining}/{row.total}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                            <button onClick={() => setExpandedClassId(id)} disabled={currentLevel === 0} className={cn("w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all", currentLevel > 0 ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-muted text-muted-foreground")}>
                                Build {currentLevel > 0 && !isComplete && "(!)"}
                            </button>
                            {id === "conjurer" && conjurerSummonerTaken && conjurerSlots > 0 ? (
                                <p className="text-xs text-muted-foreground text-center mt-3">
                                    Set summons inside Build.
                                </p>
                            ) : null}
                            {id === "fairytamer" &&
                            selectedOptions.some((o) => o.id === "fairyContract" && o.source === "fairytamer") &&
                            (localClasses.find((c) => c.id === "fairytamer")?.level ?? 0) >= 1 ? (
                                <p className="text-xs text-muted-foreground text-center mt-3">
                                    Set fairy contracts inside Build.
                                </p>
                            ) : null}
                            {id === "artificer" &&
                            artificerLevel >= 3 &&
                            selectedOptions.some(
                                (o) => o.id === "specialInvention" && o.source === "artificer"
                            ) ? (
                                <p className="text-xs text-muted-foreground text-center mt-3">
                                    Set Special Invention inside Build.
                                </p>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <footer className="mt-20 flex justify-between items-center border-t border-border pt-10">
                <button onClick={onBack} className="font-black uppercase text-[10px] text-muted-foreground hover:text-foreground tracking-widest">Back</button>
                <button
                    onClick={onNext}
                    disabled={
                        !hasAtLeastOneClass ||
                        remainingAdventurerXP < 0 ||
                        !allClassXPAssigned ||
                        !conjurerSummonPicksComplete ||
                        !fairyTamerPicksComplete ||
                        !specialInventionComplete ||
                        !skillGrantsComplete
                    }
                    className={cn(
                        "px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest",
                        hasAtLeastOneClass &&
                            remainingAdventurerXP >= 0 &&
                            allClassXPAssigned &&
                            conjurerSummonPicksComplete &&
                            fairyTamerPicksComplete &&
                            specialInventionComplete &&
                            skillGrantsComplete
                            ? "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    Next Step
                </button>
            </footer>
        </div>
    );
};

export default ClassSelection;