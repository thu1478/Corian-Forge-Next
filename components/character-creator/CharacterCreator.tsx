import React, { useMemo, useState } from "react";
import rulesData from "@/lib/rules.json";
import { CharacterSaveData } from "@/lib/character-data";
import { CharAttribute } from "@/lib/rules";
import { RaceSelection } from "./steps/RaceSelection";
import ClassSelection from "@/components/character-creator/steps/ClassSelection";
import { AbilityScores } from "@/components/character-creator/steps/AbilityScores";
import { CultureStep } from "@/components/character-creator/steps/CultureStep";
import { OccupationStep } from "@/components/character-creator/steps/OccupationStep";
import { FeatsStep } from "@/components/character-creator/steps/FeatsStep";
import { CharacterReview } from "@/components/character-creator/CharacterReview";
import { StepProgress } from "@/components/character-creator/steps/StepProgress";

type AttributeKey = "might" | "dexterity" | "reason" | "willpower" | "presence";

type ClassOptionSelection = { id: string; source: string };

const STARTING_XP = rulesData.system.startingXPPerLvl as Record<string, number>;

export default function CharacterCreator() {
    const [charData, setCharData] = useState<CharacterSaveData>({
        name: "",
        age: 0,
        gender: "",
        race: "",
        background: "",
        backstory: "",
        classes: [],
        hp: 10,
        barrier: 0,
        mp: 10,
        focus: 0,
        attributes: {
            [CharAttribute.Might]: 8,
            [CharAttribute.Dexterity]: 8,
            [CharAttribute.Reason]: 8,
            [CharAttribute.Willpower]: 8,
            [CharAttribute.Presence]: 8
        },
        speed: 4,
        xp: STARTING_XP["1"] ?? 100,
        inspiration: 0,
        victories: 0,
        focusFeatures: [],
        reactions: [],
        actions: [],
        traits: [],
        languages: ["Common"],
        skills: [],
        money: 0,
        ip: 0,
        inventory: [],
        equipment: {
            activeWeapon: null,
            offhand: null,
            armor: null,
            accessories: {
                head: null, face: null, ears: null, neck: null,
                back: null, hands: null, ringLeft: null, ringRight: null,
                waist: null, feet: null
            }
        },
        bonds: []
    });

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
    const [selectedFeats, setSelectedFeats] = useState<Partial<Record<number, string>>>({});

    const handleBack = () => setCurrentStep((prev) => Math.max(0, prev - 1));
    const handleNext = () => setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));

    const handleSelectRace = (id: string) => {
        setCharData((prev) => ({
            ...prev,
            race: id,
            traits: prev.traits.filter((t) => t.source !== "racial")
        }));
    };

    const handleTogglePassives = (traitId: string) => {
        setCharData((prev) => ({
            ...prev,
            traits: prev.traits.some((t) => t.id === traitId)
                ? prev.traits.filter((t) => t.id !== traitId)
                : [...prev.traits, { id: traitId, source: "racial" }]
        }));
    };

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
            <StepProgress currentStep={currentStep} steps={STEPS} />
            {currentStep === 0 && (
                <RaceSelection
                    raceId={charData.race}
                    raceSelectablePassives={charData.traits.filter((t) => t.source === "racial").map((t) => t.id)}
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
                    attributes={charData.attributes}
                    onUpdateLevel={(lvl) => {
                        setAdventurerLevel(lvl);
                        setCharData((prev) => ({ ...prev, xp: STARTING_XP[String(lvl)] ?? prev.xp }));
                    }}
                    onUpdateClassData={(classes, options) => {
                        setCharData((prev) => ({ ...prev, classes }));
                        setClassSelections(options);
                    }}
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
                    onSelectEnvironment={setCultureEnvironment}
                    onSelectOrganization={setCultureOrganization}
                    onSelectUpbringing={setCultureUpbringing}
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
                    occupationSkills={occupationSkills}
                    occupationLanguages={occupationLanguages}
                    globalSkillCounts={skillCounts}
                    onToggleSkill={(id) => {
                        setOccupationSkills((prev) => {
                            const idx = prev.indexOf(id);
                            if (idx >= 0) {
                                const next = [...prev];
                                next.splice(idx, 1);
                                return next;
                            }
                            if (prev.length >= 2) return prev;
                            return [...prev, id];
                        });
                    }}
                    onToggleLanguage={(id) => {
                        setOccupationLanguages((prev) => {
                            if (id === "common") return prev.includes(id) ? prev : [...prev, id];
                            if (prev.includes(id)) return prev.filter((l) => l !== id);
                            if (prev.filter((l) => l !== "common").length >= 1) return prev;
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
                    onSelectFeat={(level, featId) =>
                        setSelectedFeats((prev) => {
                            if (!featId) {
                                const next = { ...prev };
                                delete next[level];
                                return next;
                            }
                            return { ...prev, [level]: featId };
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
                        setCharData((prev) => ({
                            ...prev,
                            race: "",
                            classes: [],
                            traits: [],
                            actions: [],
                            reactions: [],
                            focusFeatures: [],
                            skills: [],
                            languages: ["Common"]
                        }));
                    }}
                />
            )}
        </div>
    );
}