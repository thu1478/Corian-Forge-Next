import React, { useMemo, useRef, useState } from "react";
import rulesData from "@/lib/rules.json";
import { CharacterSaveData } from "@/lib/character-data";
import { FeatLevelPick } from "@/lib/baseRefs";
import { createEmptyCreatorCharacter, parseCreatorImportJson } from "@/lib/creator-import";
import {
    conjurerClassTraitRefsFromPicks,
    getConjurerSummonSchoolTag,
    getConjurerSummonSlotCount,
    getSummonMastery,
    listConjurerCatalogTemplateIdsForSlot,
} from "@/lib/creature-roster";
import {
    getOccupationDefinition,
    type OccupationRule,
    resolveOccupationLanguagePicks,
    resolveOccupationSkillsCount,
} from "@/lib/occupation";
import { UploadIcon } from "lucide-react";
import { RaceSelection } from "./steps/RaceSelection";
import ClassSelection from "@/components/character-creator/steps/ClassSelection";
import { AbilityScores } from "@/components/character-creator/steps/AbilityScores";
import { CultureStep } from "@/components/character-creator/steps/CultureStep";
import { OccupationStep } from "@/components/character-creator/steps/OccupationStep";
import { FeatsStep } from "@/components/character-creator/steps/FeatsStep";
import { CharacterReview } from "@/components/character-creator/CharacterReview";
import { StepProgress } from "@/components/character-creator/steps/StepProgress";

type AttributeKey = "might" | "dexterity" | "reason" | "willpower" | "presence";

type ClassOptionSelection = { id: string; source: string; selectedEffectIndices?: number[] };

const STARTING_XP = rulesData.system.startingXPPerLvl as Record<string, number>;
const OCCUPATION_RULES = (rulesData.system as { occupation?: Record<string, OccupationRule> }).occupation;

export default function CharacterCreator() {
    const importInputRef = useRef<HTMLInputElement>(null);
    const [charData, setCharData] = useState<CharacterSaveData>(() => createEmptyCreatorCharacter());

    const STEPS = ["Race", "Class", "Abilities", "Culture", "Occupation", "Feats", "Review"];
    const [currentStep, setCurrentStep] = useState(0);
    const [adventurerLevel, setAdventurerLevel] = useState(1);
    const [classSelections, setClassSelections] = useState<ClassOptionSelection[]>([]);
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

    const effectiveAttributes = useMemo(() => {
        const a = { ...charData.attributes };
        for (const attr of Object.values(levelBonuses)) {
            if (attr && attr in a) {
                a[attr as keyof typeof a] += 1;
            }
        }
        return a;
    }, [charData.attributes, levelBonuses]);

    const combinedSkillIds = useMemo(() => [...cultureSkills, ...occupationSkills], [cultureSkills, occupationSkills]);
    const skillCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        combinedSkillIds.forEach((id) => {
            counts[id] = (counts[id] || 0) + 1;
        });
        return counts;
    }, [combinedSkillIds]);

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
                <RaceSelection
                    raceId={charData.race}
                    racialTraits={charData.traits.filter((t) => t.source === "racial")}
                    attributes={effectiveAttributes}
                    onSelectRace={handleSelectRace}
                    onToggleSelectable={handleTogglePassives}
                    onNext={handleNext}
                />
            )}

            {currentStep === 1 && (
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
                        setCharData((prev) => ({ ...prev, xp: STARTING_XP[String(lvl)] ?? prev.xp }));
                    }}
                    onUpdateClassData={(classes, options) => {
                        const hasPriest = classes.some((c) => c.id === "priest" && c.level > 0);
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
                            return { ...next, conjurerSummonTemplateIds: ids }
                        })
                        setClassSelections(options);
                    }}
                    conjurerSummonTemplateIds={charData.conjurerSummonTemplateIds ?? []}
                    onConjurerSummonsChange={(ids) =>
                        setCharData((prev) => ({ ...prev, conjurerSummonTemplateIds: ids }))
                    }
                    onBack={handleBack}
                    onNext={handleNext}
                />
            )}

            {currentStep === 2 && (
                <AbilityScores
                    adventurerLevel={adventurerLevel}
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

            {currentStep === 3 && (
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

            {currentStep === 4 && (
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

            {currentStep === 5 && (
                <FeatsStep
                    selectedFeats={selectedFeats}
                    adventurerLevel={adventurerLevel}
                    classes={charData.classes}
                    classSelections={classSelections}
                    characterTraits={charData.traits}
                    attributes={effectiveAttributes}
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

            {currentStep === 6 && (
                <CharacterReview
                    charData={charData}
                    adventurerLevel={adventurerLevel}
                    levelBonuses={levelBonuses}
                    classSelections={classSelections}
                    selectedFeats={selectedFeats}
                    selectedSkillIds={combinedSkillIds}
                    occupationLanguages={occupationLanguages}
                    onUpdateField={(field, value) => {
                        setCharData((prev) => ({ ...prev, [field]: value }));
                    }}
                    onBack={handleBack}
                    onStartOver={() => {
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
                    }}
                />
            )}
        </div>
    );
}