import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import rulesData from "@/lib/rules.json";
import { CharacterSaveData, getCharacterLevelForStats } from "@/lib/character-data";
import { FeatLevelPick } from "@/lib/baseRefs";
import {
    adventurerLevelFromXp,
    createEmptyCreatorCharacter,
    parseCreatorImportJson,
} from "@/lib/creator-import";
import {
    conjurerClassTraitRefsFromPicks,
    getConjurerSummonSchoolTag,
    getConjurerSummonSlotCount,
    getSummonMastery,
    listConjurerCatalogTemplateIdsForSlot,
} from "@/lib/creature-roster";
import {
    characterHasFairyContractFromPicks,
    emptyFairyTamerContracts,
    getFairytamerLevel,
    sanitizeFairyTamerContracts,
    stripInvalidFairySpellPicks,
    syncFairyTamerContractSpellsFromPicks,
} from "@/lib/fairy-tamer";
import {
    getOccupationDefinition,
    type OccupationRule,
    resolveOccupationLanguagePicks,
    resolveOccupationSkillsCount,
} from "@/lib/occupation";
import {
    allSkillChooserPicksComplete,
    isClassStepSkillRequirementKey,
    isFeatStepSkillRequirementKey,
    listAutoGrantedSkillIds,
    listSkillChooserRequirements,
    pruneSkillGrantPicks,
    requirementKeys,
    type ListSkillGrantsContext,
} from "@/lib/grant-skill-effects";
import { UploadIcon } from "lucide-react";
import { RaceSelection } from "./steps/RaceSelection";
import ClassSelection, { type ClassOptionPick } from "@/components/character-creator/steps/ClassSelection";
import {
    artificerHasSpecialInventionPassive,
    sanitizeSpecialInvention,
} from "@/lib/creator-import";
import { AbilityScores } from "@/components/character-creator/steps/AbilityScores";
import { CultureStep } from "@/components/character-creator/steps/CultureStep";
import { OccupationStep } from "@/components/character-creator/steps/OccupationStep";
import { FeatsStep } from "@/components/character-creator/steps/FeatsStep";
import { CharacterReview } from "@/components/character-creator/CharacterReview";
import { StepProgress } from "@/components/character-creator/steps/StepProgress";
import { WelcomeStep } from "@/components/character-creator/steps/WelcomeStep";
import { CREATOR_STEPS, listCreatorTodoItems } from "@/lib/creator-todos";

type AttributeKey = "might" | "dexterity" | "reason" | "willpower" | "presence";

/** Adventurer levels at which a +1 attribute pick is unlocked (must be <= current adventurer level). */
const ATTRIBUTE_BONUS_MILESTONES = [3, 5, 7, 9, 10] as const;

/** Adventurer levels at which a feat slot unlocks (must be <= current adventurer level). */
const FEAT_LEVEL_MILESTONES = [1, 3, 5, 7, 9, 10] as const;

function pruneLevelBonusesForAdventurerLevel(
    bonuses: Partial<Record<number, AttributeKey>>,
    adventurerLevel: number
): Partial<Record<number, AttributeKey>> {
    const next = { ...bonuses };
    for (const milestone of ATTRIBUTE_BONUS_MILESTONES) {
        if (milestone > adventurerLevel) delete next[milestone];
    }
    return next;
}

function pruneSelectedFeatsForAdventurerLevel(
    feats: Partial<Record<number, FeatLevelPick>>,
    adventurerLevel: number
): Partial<Record<number, FeatLevelPick>> {
    const next = { ...feats };
    for (const milestone of FEAT_LEVEL_MILESTONES) {
        if (milestone > adventurerLevel) delete next[milestone];
    }
    return next;
}

const STARTING_XP = rulesData.system.startingXPPerLvl as Record<string, number>;
const OCCUPATION_RULES = (rulesData.system as { occupation?: Record<string, OccupationRule> }).occupation;

export default function CharacterCreator() {
    const importInputRef = useRef<HTMLInputElement>(null);
    const [charData, setCharData] = useState<CharacterSaveData>(() => createEmptyCreatorCharacter());

    const STEPS = [...CREATOR_STEPS];
    const [currentStep, setCurrentStep] = useState(0);
    const [adventurerLevel, setAdventurerLevel] = useState(1);
    const [classSelections, setClassSelections] = useState<ClassOptionPick[]>([]);
    const [levelBonuses, setLevelBonuses] = useState<Partial<Record<number, AttributeKey>>>({});
    const [cultureEnvironment, setCultureEnvironment] = useState<string | null>(null);
    const [cultureOrganization, setCultureOrganization] = useState<string | null>(null);
    const [cultureUpbringing, setCultureUpbringing] = useState<string | null>(null);
    const [cultureSkills, setCultureSkills] = useState<string[]>([]);
    const [occupationSkills, setOccupationSkills] = useState<string[]>([]);
    const [occupationLanguages, setOccupationLanguages] = useState<string[]>(["common"]);
    const [selectedFeats, setSelectedFeats] = useState<Partial<Record<number, FeatLevelPick>>>({});

    const handleBack = () => setCurrentStep((prev) => Math.max(0, prev - 1));
    const handleNext = () => setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));

    const applyImportedCharacter = (parsed: ReturnType<typeof parseCreatorImportJson>) => {
        if ("error" in parsed) {
            window.alert(parsed.error);
            return;
        }
        setCharData(parsed.charData);
        setAdventurerLevel(parsed.adventurerLevel);
        setClassSelections(parsed.classSelections);
        setLevelBonuses(parsed.levelBonuses);
        setCultureEnvironment(parsed.charData.cultureEnvironment);
        setCultureOrganization(parsed.charData.cultureOrganization);
        setCultureUpbringing(parsed.charData.cultureUpbringing);
        setCultureSkills(parsed.cultureSkills);
        setOccupationSkills(parsed.occupationSkills);
        setOccupationLanguages(parsed.occupationLanguages);
        setSelectedFeats(parsed.selectedFeats);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(String(reader.result));
                applyImportedCharacter(parseCreatorImportJson(json, createEmptyCreatorCharacter()));
            } catch (err) {
                console.error(err);
                window.alert("Could not read that file. Choose a valid character JSON export.");
            }
        };
        reader.readAsText(file);
    };

    const handleSelectRace = (id: string) => {
        setCharData((prev) => ({
            ...prev,
            race: id,
            traits: prev.traits.filter((t) => t.source !== "racial")
        }));
    };

    const handleTogglePassives = (
        traitId: string,
        options?: { selectedEffectIndices: number[] }
    ) => {
        setCharData((prev) => {
            const nonRacial = prev.traits.filter((t) => t.source !== "racial");
            const racial = prev.traits.filter((t) => t.source === "racial");
            const exists = racial.find((t) => t.id === traitId);
            const raceKey = prev.race?.toLowerCase?.();
            const passive = raceKey
                ? (rulesData.races as Record<string, any>)[raceKey]?.passives?.[traitId]
                : null;
            const n = passive?.selectAmount;
            const effects = passive?.effects;
            const needsEffectChoice =
                typeof n === "number" &&
                n > 0 &&
                Array.isArray(effects) &&
                effects.length > n;

            const idx = options?.selectedEffectIndices;
            const indicesValid =
                Array.isArray(idx) &&
                needsEffectChoice &&
                Array.isArray(effects) &&
                idx.length === n &&
                idx.every((i) => Number.isInteger(i) && i >= 0 && i < effects.length);

            if (exists && indicesValid) {
                return {
                    ...prev,
                    traits: [
                        ...nonRacial,
                        ...racial.filter((t) => t.id !== traitId),
                        { id: traitId, source: "racial", selectedEffectIndices: idx },
                    ],
                };
            }

            if (exists) {
                return {
                    ...prev,
                    traits: [...nonRacial, ...racial.filter((t) => t.id !== traitId)],
                };
            }

            if (needsEffectChoice) {
                if (!indicesValid) {
                    return prev;
                }
                return {
                    ...prev,
                    traits: [
                        ...nonRacial,
                        ...racial,
                        { id: traitId, source: "racial", selectedEffectIndices: idx },
                    ],
                };
            }
            return {
                ...prev,
                traits: [...nonRacial, ...racial, { id: traitId, source: "racial" }],
            };
        });
    };

    /** Highest class level from XP spent (matches sheet `getCharacterLevelForStats`). */
    const effectiveAdventurerLevel = useMemo(
        () => getCharacterLevelForStats(charData.classes ?? []),
        [charData.classes]
    );

    useEffect(() => {
        setLevelBonuses((prev) => pruneLevelBonusesForAdventurerLevel(prev, effectiveAdventurerLevel));
        setSelectedFeats((prev) => pruneSelectedFeatsForAdventurerLevel(prev, effectiveAdventurerLevel));
        setCharData((prev) => ({
            ...prev,
            attributeLevelBonuses: pruneLevelBonusesForAdventurerLevel(
                prev.attributeLevelBonuses ?? {},
                effectiveAdventurerLevel
            ),
        }));
    }, [effectiveAdventurerLevel]);

    const effectiveAttributes = useMemo(() => {
        const a = { ...charData.attributes };
        for (const attr of Object.values(levelBonuses)) {
            if (attr && attr in a) {
                a[attr as keyof typeof a] += 1;
            }
        }
        return a;
    }, [charData.attributes, levelBonuses]);

    const grantSkillContext: ListSkillGrantsContext = useMemo(
        () => ({
            classes: charData.classes,
            classSelections,
            racialTraitRefs: charData.traits.filter((t) => t.source === "racial"),
            raceKey: charData.race || null,
            selectedFeats,
            rules: rulesData as ListSkillGrantsContext["rules"],
        }),
        [charData.classes, charData.traits, charData.race, classSelections, selectedFeats]
    );

    const skillGrantRequirements = useMemo(
        () => listSkillChooserRequirements(grantSkillContext),
        [grantSkillContext]
    );

    const skillGrantStableKey = useMemo(
        () =>
            [...skillGrantRequirements.map((r) => r.key)].sort((a, b) => a.localeCompare(b)).join("\0"),
        [skillGrantRequirements]
    );

    useEffect(() => {
        const valid = requirementKeys(skillGrantRequirements);
        setCharData((prev) => {
            const nextMap = pruneSkillGrantPicks(prev.creatorSkillGrantPicks ?? {}, valid);
            const prevJson = JSON.stringify(prev.creatorSkillGrantPicks ?? {});
            const nextJson = JSON.stringify(nextMap);
            if (prevJson === nextJson) return prev;
            return { ...prev, creatorSkillGrantPicks: nextMap };
        });
    }, [skillGrantStableKey]);

    const autoGrantedSkillIds = useMemo(
        () => listAutoGrantedSkillIds(grantSkillContext),
        [grantSkillContext]
    );

    const grantChosenSkillIds = useMemo(() => {
        const keys = [...skillGrantRequirements.map((r) => r.key)].sort((a, b) =>
            a.localeCompare(b)
        );
        return keys.flatMap((k) => charData.creatorSkillGrantPicks?.[k] ?? []);
    }, [skillGrantRequirements, charData.creatorSkillGrantPicks]);

    const combinedSkillIds = useMemo(
        () => [...cultureSkills, ...occupationSkills, ...grantChosenSkillIds, ...autoGrantedSkillIds],
        [cultureSkills, occupationSkills, grantChosenSkillIds, autoGrantedSkillIds]
    );

    const skillCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        combinedSkillIds.forEach((id) => {
            counts[id] = (counts[id] || 0) + 1;
        });
        return counts;
    }, [combinedSkillIds]);

    const skillGrantsComplete = useMemo(
        () => allSkillChooserPicksComplete(skillGrantRequirements, charData.creatorSkillGrantPicks ?? {}),
        [skillGrantRequirements, charData.creatorSkillGrantPicks]
    );

    const classStepSkillRequirements = useMemo(
        () => skillGrantRequirements.filter((r) => isClassStepSkillRequirementKey(r.key)),
        [skillGrantRequirements]
    );

    const classStepSkillGrantsComplete = useMemo(
        () =>
            classStepSkillRequirements.length === 0 ||
            allSkillChooserPicksComplete(classStepSkillRequirements, charData.creatorSkillGrantPicks ?? {}),
        [classStepSkillRequirements, charData.creatorSkillGrantPicks]
    );

    const featStepSkillRequirements = useMemo(
        () => skillGrantRequirements.filter((r) => isFeatStepSkillRequirementKey(r.key)),
        [skillGrantRequirements]
    );

    const featStepSkillGrantsComplete = useMemo(
        () =>
            featStepSkillRequirements.length === 0 ||
            allSkillChooserPicksComplete(featStepSkillRequirements, charData.creatorSkillGrantPicks ?? {}),
        [featStepSkillRequirements, charData.creatorSkillGrantPicks]
    );

    const handleSkillGrantPicksChange = useCallback((key: string, ids: string[]) => {
        setCharData((prev) => ({
            ...prev,
            creatorSkillGrantPicks: {...(prev.creatorSkillGrantPicks ?? {}), [key]: ids},
        }));
    }, []);

    const handleStartOver = useCallback(() => {
        setCurrentStep(0);
        setAdventurerLevel(1);
        setLevelBonuses({});
        setCultureEnvironment(null);
        setCultureOrganization(null);
        setCultureUpbringing(null);
        setCultureSkills([]);
        setOccupationSkills([]);
        setOccupationLanguages(["common"]);
        setSelectedFeats({});
        setClassSelections([]);
        setCharData(createEmptyCreatorCharacter());
    }, []);

    const creatorTodos = useMemo(
        () =>
            listCreatorTodoItems({
                charData,
                classSelections,
                levelBonuses,
                cultureEnvironment,
                cultureOrganization,
                cultureUpbringing,
                cultureSkills,
                occupationSkills,
                occupationLanguages,
                selectedFeats,
                adventurerLevel,
                effectiveAdventurerLevel,
                skillGrantRequirements,
            }),
        [
            charData,
            classSelections,
            levelBonuses,
            cultureEnvironment,
            cultureOrganization,
            cultureUpbringing,
            cultureSkills,
            occupationSkills,
            occupationLanguages,
            selectedFeats,
            adventurerLevel,
            effectiveAdventurerLevel,
            skillGrantRequirements,
        ]
    );

    return (
        <div className="w-full max-w-7xl mx-auto px-8 py-8 min-h-screen text-slate-900 dark:text-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-4">
                <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportFile}
                />
                <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border-2 border-border bg-card hover:bg-muted/60 text-foreground transition-colors"
                >
                    <UploadIcon className="w-4 h-4 shrink-0" aria-hidden />
                    Import JSON
                </button>
            </div>
            <StepProgress currentStep={currentStep} steps={STEPS} onStepClick={setCurrentStep} />
            {currentStep === 0 && (
                <WelcomeStep
                    todos={creatorTodos}
                    onGoToStep={setCurrentStep}
                    onStartOver={handleStartOver}
                    onNext={handleNext}
                />
            )}

            {currentStep === 1 && (
                <RaceSelection
                    raceId={charData.race}
                    racialTraits={charData.traits.filter((t) => t.source === "racial")}
                    attributes={effectiveAttributes}
                    onSelectRace={handleSelectRace}
                    onToggleSelectable={handleTogglePassives}
                    onNext={handleNext}
                />
            )}

            {currentStep === 2 && (
                <ClassSelection
                    selectedOptions={classSelections}
                    classes={charData.classes}
                    currentAdventurerLevel={adventurerLevel}
                    availableXP={charData.xp}
                    attributes={effectiveAttributes}
                    priestDeity={charData.priestDeity ?? null}
                    onPriestDeityChange={(deityId) => {
                        setCharData((prev) => ({ ...prev, priestDeity: deityId }));
                        setClassSelections((prev) =>
                            prev.filter((sel) => {
                                if (sel.source !== "priest") return true;
                                const a = (rulesData.classes as Record<string, any>).priest?.actions?.[sel.id] as
                                    | { deityId?: string }
                                    | undefined;
                                if (!a?.deityId) return true;
                                return Boolean(deityId && a.deityId === deityId);
                            })
                        );
                    }}
                    onUpdateLevel={(lvl) => {
                        setAdventurerLevel(lvl);
                        setLevelBonuses((prev) => pruneLevelBonusesForAdventurerLevel(prev, lvl));
                        setSelectedFeats((prev) => pruneSelectedFeatsForAdventurerLevel(prev, lvl));
                        setCharData((prev) => ({
                            ...prev,
                            xp: STARTING_XP[String(lvl)] ?? prev.xp,
                            attributeLevelBonuses: pruneLevelBonusesForAdventurerLevel(
                                prev.attributeLevelBonuses ?? {},
                                lvl
                            ),
                        }));
                    }}
                    totalXP={charData.xp}
                    onUpdateTotalXP={(xp) => {
                        const clamped = Math.max(0, Math.floor(Number(xp) || 0));
                        const lvl = adventurerLevelFromXp(clamped, STARTING_XP);
                        setAdventurerLevel(lvl);
                        setLevelBonuses((prev) => pruneLevelBonusesForAdventurerLevel(prev, lvl));
                        setSelectedFeats((prev) => pruneSelectedFeatsForAdventurerLevel(prev, lvl));
                        setCharData((prev) => ({
                            ...prev,
                            xp: clamped,
                            attributeLevelBonuses: pruneLevelBonusesForAdventurerLevel(
                                prev.attributeLevelBonuses ?? {},
                                lvl
                            ),
                        }));
                    }}
                    onUpdateClassData={(classes, options) => {
                        const hasPriest = classes.some((c) => c.id === "priest" && c.level > 0);
                        let classOptsAfterFairy: ClassOptionPick[] = options;
                        setCharData((prev) => {
                            const next: CharacterSaveData = {
                                ...prev,
                                classes,
                                ...(!hasPriest ? { priestDeity: null } : {}),
                            }
                            const hasSummoner = options.some((o) => o.id === "summoner" && o.source === "conjurer")
                            const slots = getConjurerSummonSlotCount(classes, hasSummoner)
                            const sketch = conjurerClassTraitRefsFromPicks(options)
                            const school = getConjurerSummonSchoolTag(sketch, rulesData as any)
                            const mastery = getSummonMastery(sketch, classes, rulesData as any)
                            let ids = [...(next.conjurerSummonTemplateIds ?? [])]
                            if (slots === 0) {
                                ids = []
                            } else {
                                while (ids.length < slots) ids.push("")
                                if (ids.length > slots) ids = ids.slice(0, slots)
                                if (school && mastery >= 1) {
                                    ids = ids.map((tid, slotIdx) => {
                                        const t = String(tid ?? "").trim()
                                        const cat = new Set(
                                            listConjurerCatalogTemplateIdsForSlot(
                                                rulesData as any,
                                                school,
                                                mastery,
                                                slotIdx
                                            )
                                        )
                                        return t && cat.has(t) ? t : ""
                                    })
                                    const seenSummon = new Set<string>()
                                    ids = ids.map((tid) => {
                                        const t = String(tid ?? "").trim()
                                        if (!t) return ""
                                        if (seenSummon.has(t)) return ""
                                        seenSummon.add(t)
                                        return t
                                    })
                                } else {
                                    ids = Array.from({ length: slots }, () => "")
                                }
                            }
                            const ftLvl = getFairytamerLevel(classes)
                            const hasFC = characterHasFairyContractFromPicks(options)
                            const fairySan = sanitizeFairyTamerContracts(
                                prev.fairyTamerContracts,
                                ftLvl,
                                hasFC
                            )
                            let nextOptions = options
                            if (!hasFC || ftLvl < 1) {
                                nextOptions = options.filter(
                                    (o) => !(o.source === "fairytamer" && o.fairySpellSlot != null)
                                )
                            } else {
                                nextOptions = stripInvalidFairySpellPicks(options, fairySan)
                            }
                            const fairySynced = syncFairyTamerContractSpellsFromPicks(fairySan, nextOptions)
                            classOptsAfterFairy = nextOptions
                            const needsInvention = artificerHasSpecialInventionPassive(
                                nextOptions,
                                classes
                            )
                            const invention = needsInvention
                                ? sanitizeSpecialInvention(prev.specialInvention) ?? prev.specialInvention
                                : undefined
                            return {
                                ...next,
                                conjurerSummonTemplateIds: ids,
                                fairyTamerContracts: fairySynced,
                                specialInvention: invention,
                            }
                        })
                        setClassSelections(classOptsAfterFairy)
                    }}
                    specialInvention={charData.specialInvention}
                    onSpecialInventionChange={(save) =>
                        setCharData((prev) => ({ ...prev, specialInvention: save }))
                    }
                    conjurerSummonTemplateIds={charData.conjurerSummonTemplateIds ?? []}
                    onConjurerSummonsChange={(ids) =>
                        setCharData((prev) => ({ ...prev, conjurerSummonTemplateIds: ids }))
                    }
                    fairyTamerContracts={charData.fairyTamerContracts ?? emptyFairyTamerContracts()}
                    onFairyTamerContractsChange={(contracts) => {
                        setClassSelections((prevSel) => {
                            const stripped = stripInvalidFairySpellPicks(prevSel, contracts)
                            const synced = syncFairyTamerContractSpellsFromPicks(contracts, stripped)
                            setCharData((d) => ({ ...d, fairyTamerContracts: synced }))
                            return stripped
                        })
                    }}
                    skillGrantRequirements={classStepSkillRequirements}
                    creatorSkillGrantPicks={charData.creatorSkillGrantPicks ?? {}}
                    skillGrantsComplete={classStepSkillGrantsComplete}
                    onSkillGrantPicksChange={handleSkillGrantPicksChange}
                    grantPickerSkillCounts={skillCounts}
                    onBack={handleBack}
                    onNext={handleNext}
                />
            )}

            {currentStep === 3 && (
                <AbilityScores
                    adventurerLevel={effectiveAdventurerLevel}
                    scores={charData.attributes}
                    levelBonuses={levelBonuses}
                    onChangeScore={(ability, newScore) => {
                        setCharData((prev) => ({
                            ...prev,
                            attributes: { ...prev.attributes, [ability]: newScore }
                        }));
                    }}
                    onChangeLevelBonus={(level, ability) => {
                        setLevelBonuses((prev) => ({ ...prev, [level]: ability }));
                        setCharData((prev) => ({
                            ...prev,
                            attributeLevelBonuses: {
                                ...(prev.attributeLevelBonuses ?? {}),
                                [level]: ability,
                            },
                        }));
                    }}
                    onBack={handleBack}
                    onNext={handleNext}
                />
            )}

            {currentStep === 4 && (
                <CultureStep
                    cultureEnvironment={cultureEnvironment}
                    cultureOrganization={cultureOrganization}
                    cultureUpbringing={cultureUpbringing}
                    selectedSkills={cultureSkills}
                    globalSkillCounts={skillCounts}
                    attributes={effectiveAttributes}
                    onSelectEnvironment={(id) => {
                        setCultureEnvironment(id);
                        setCharData((prev) => ({ ...prev, cultureEnvironment: id }));
                    }}
                    onSelectOrganization={(id) => {
                        setCultureOrganization(id);
                        setCharData((prev) => ({ ...prev, cultureOrganization: id }));
                    }}
                    onSelectUpbringing={(id) => {
                        setCultureUpbringing(id);
                        setCharData((prev) => ({ ...prev, cultureUpbringing: id }));
                    }}
                    onToggleSkill={(id) => {
                        setCultureSkills((prev) => {
                            const idx = prev.indexOf(id);
                            if (idx >= 0) {
                                const next = [...prev];
                                next.splice(idx, 1);
                                return next;
                            }
                            if (prev.length >= 3) return prev;
                            return [...prev, id];
                        });
                    }}
                    onBack={handleBack}
                    onNext={handleNext}
                />
            )}

            {currentStep === 5 && (
                <OccupationStep
                    occupationId={charData.occupation}
                    occupationSkills={occupationSkills}
                    occupationLanguages={occupationLanguages}
                    globalSkillCounts={skillCounts}
                    attributes={effectiveAttributes}
                    onSelectOccupation={(id) => {
                        setCharData((prev) => ({ ...prev, occupation: id }));
                        setOccupationSkills([]);
                        setOccupationLanguages(["common"]);
                    }}
                    onToggleSkill={(id) => {
                        const def = getOccupationDefinition(OCCUPATION_RULES, charData.occupation);
                        const cap = resolveOccupationSkillsCount(def);
                        setOccupationSkills((prev) => {
                            const idx = prev.indexOf(id);
                            if (idx >= 0) {
                                const next = [...prev];
                                next.splice(idx, 1);
                                return next;
                            }
                            if (prev.length >= cap) return prev;
                            return [...prev, id];
                        });
                    }}
                    onToggleLanguage={(id) => {
                        const def = getOccupationDefinition(OCCUPATION_RULES, charData.occupation);
                        const maxAdd = resolveOccupationLanguagePicks(def);
                        setOccupationLanguages((prev) => {
                            if (id === "common") return prev.includes(id) ? prev : [...prev, id];
                            if (prev.includes(id)) return prev.filter((l) => l !== id);
                            if (prev.filter((l) => l !== "common").length >= maxAdd) return prev;
                            return [...prev, id];
                        });
                    }}
                    onBack={handleBack}
                    onNext={handleNext}
                />
            )}

            {currentStep === 6 && (
                <FeatsStep
                    selectedFeats={selectedFeats}
                    adventurerLevel={effectiveAdventurerLevel}
                    classes={charData.classes}
                    classSelections={classSelections}
                    characterTraits={charData.traits}
                    attributes={effectiveAttributes}
                    featSkillGrantRequirements={featStepSkillRequirements}
                    creatorSkillGrantPicks={charData.creatorSkillGrantPicks ?? {}}
                    skillGrantsComplete={featStepSkillGrantsComplete}
                    onSkillGrantPicksChange={handleSkillGrantPicksChange}
                    grantPickerSkillCounts={skillCounts}
                    onSelectFeat={(level, pick) =>
                        setSelectedFeats((prev) => {
                            if (!pick) {
                                const next = { ...prev };
                                delete next[level];
                                return next;
                            }
                            return { ...prev, [level]: pick };
                        })
                    }
                    onBack={handleBack}
                    onNext={handleNext}
                />
            )}

            {currentStep === 7 && (
                <CharacterReview
                    charData={charData}
                    adventurerLevel={effectiveAdventurerLevel}
                    levelBonuses={levelBonuses}
                    classSelections={classSelections}
                    selectedFeats={selectedFeats}
                    selectedSkillIds={combinedSkillIds}
                    occupationLanguages={occupationLanguages}
                    skillGrantsComplete={skillGrantsComplete}
                    onUpdateField={(field, value) => {
                        setCharData((prev) => ({ ...prev, [field]: value }));
                    }}
                    onBack={handleBack}
                    onStartOver={handleStartOver}
                />
            )}
        </div>
    );
}