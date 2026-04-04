import {useMemo} from 'react';
import {Character, getAttributeModifier} from "@/lib/character-data";

export function useDerivedStats(character: any, rulesData: any) {
    return useMemo(() => {
        const {attributes, classes} = character;

        // 1. CHARACTER LEVEL = MAX(CLASS LEVELS)
        const characterLevel = classes.length > 0
            ? Math.max(...classes.map(c => c.level))
            : 1;

        // 2. HELPER: Calculate Class Bonuses from rulesData
        const getBonus = (statName: string) => {
            return classes.reduce((total: number, cls: any) => {
                const classRule = rulesData.classes?.[cls.id];
                const bonus = classRule?.statBonus;

                if (bonus && bonus.stat === statName) {
                    // (Class Level / Frequency) * Amount
                    // e.g. Level 3 / Frequency 1 = 3 applications
                    const applications = Math.floor(cls.level / bonus.frequency);
                    return total + (applications * bonus.amount);
                }
                return total;
            }, 0);
        };

        // 3. FINAL DERIVATIONS

        // HP: Might + (5 * Character Level) + Class Bonuses
        const maxHp = attributes.might + (5 * characterLevel) + getBonus("hp");
        const deathThreshold = Math.floor(maxHp * -0.5);

        // MP: Character Level + (2 * Willpower) + Class Bonuses
        const maxMp = characterLevel + (2 * attributes.willpower) + getBonus("mp");

        // DEFENSE: 0 (Base)
        const defense = 0;

        // STABILITY: Might + Willpower + Class Bonuses
        const stability = 0;

        return {
            characterLevel,
            maxHp,
            deathThreshold,
            maxMp,
            defense,
            stability
        };
    }, [character.attributes, character.classes, rulesData]);
}