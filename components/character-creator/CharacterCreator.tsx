import React, {useState} from 'react';
import rulesData from "@/lib/rules.json";

// NATIVE PROJECT IMPORTS
import {CharacterSaveData} from "@/lib/character-data";
import {CharAttribute} from "@/lib/rules";

// STEP COMPONENTS
import {RaceSelection} from './steps/RaceSelection';
import ClassSelection from "@/components/character-creator/steps/ClassSelection";

export default function CharacterCreator() {
    // Initialize as a proper, full CharacterSaveData object
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
            [CharAttribute.Presence]: 8,
        },
        speed: 4,
        xp: 0,
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
                waist: null, feet: null,
            }
        },
        bonds: []
    });

    // Step trackers
    const STEPS = ["Race", "Class", "Abilities", "Culture", "Occupation", "Feats", "Review"];
    const [currentStep, setCurrentStep] = useState(0);

    // <editor-fold desc="Update Handlers">
    // Forward back in steps
    const handleNext = () => {
        if (currentStep === 0) handleFinalizeRace();
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };
    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSelectRace = (id: string) => {
        setCharData((prev) => ({
            ...prev,
            race: id,
            traits: prev.traits.filter(t => t.source !== 'racial')
        }));
    };

    const handleTogglePassives = (traitId: string) => {
        setCharData((prev) => ({
            ...prev,
            traits: prev.traits.some(t => t.id === traitId)
                ? prev.traits.filter(t => t.id !== traitId)
                : [...prev.traits, {id: traitId, source: 'racial'}]
        }));
    };

    // Final step for race selection
    const handleFinalizeRace = () => {
        const selectedRaceId = charData.race;
        if (!selectedRaceId) return;

        // Pull the actual race definition from rules
        const raceDefinition = (rulesData.races as any)[selectedRaceId];
        if (!raceDefinition) return;

        // 1. Identify Innate Traits (freebies)
        const innateTraits = Object.entries(raceDefinition.passives)
            .filter(([_, p]: [string, any]) => p.type === 'innate')
            .map(([pId, _]) => ({id: pId, source: 'racial'}));

        setCharData((prev) => {
            // 2. Keep traits from other sources (e.g. if we add Background traits later)
            const nonRacialTraits = prev.traits.filter(t => t.source !== 'racial');

            // 3. Keep current selectable racial choices
            // (Note: handleTogglePassives already put these in prev.traits)
            const selectedPassives = prev.traits.filter(t => t.source === 'racial');

            return {
                ...prev,
                traits: [...nonRacialTraits, ...innateTraits, ...selectedPassives]
            };
        });

        console.log("Race Finalized. Data Cleaned and Saved.");
        // move to next step logic here...
    };

    // --- STEP 1: CLASS HANDLERS ---


    // </editor-fold>

    return (
        <div className="creator-root">
            {currentStep === 0 && (
                <RaceSelection
                    raceId={charData.race}
                    raceSelectablePassives={charData.traits
                        .filter(t => t.source === 'racial')
                        .map(t => t.id)
                    }
                    onSelectRace={handleSelectRace}
                    onToggleSelectable={handleTogglePassives}
                    onNext={handleNext}
                />
            )}

            {currentStep === 1 && (
                <ClassSelection
                    // Only pass traits that actually belong to classes defined in rules
                    selectedOptions={charData.traits.filter(t =>
                        Object.keys(rulesData.classes).includes(t.source)
                    )}
                    // Pass the current attributes so Action Cards can calculate modifiers
                    attributes={charData.attributes}
                    // Simple updater for character level
                    onUpdateLevel={(lvl) => setCharData(prev => ({ ...prev, xp: lvl }))}
                    // Simplified handler to merge class data into global state
                    onUpdateClassData={(classes, traits) => {
                        setCharData(prev => {
                            const classIds = new Set(Object.keys(rulesData.classes));
                            const nonClassTraits = prev.traits.filter(t => !classIds.has(t.source));

                            return {
                                ...prev,
                                classes: classes,
                                traits: [...nonClassTraits, ...traits]
                            };
                        });
                    }}
                    onBack={handleBack}
                    onNext={handleNext}
                />
            )}
        </div>
    );
}