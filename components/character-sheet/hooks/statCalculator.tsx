import {useMemo} from 'react';
import {ArmorItem, InventoryItem} from "@/lib/equipment-data";

export function useDerivedStats(character: any, rulesData: any) {
    // const {attributes, classes, equipment, inventory} = character;

    // 1. CHARACTER LEVEL = MAX(CLASS LEVELS)
    const characterLevel = character.classes.length > 0
        ? Math.max(...character.classes.map((c: { level: any; }) => c.level))
        : 1;

    // 2. HELPER: Calculate Class Bonuses from rulesData
    const getClassBonus = (statName: string) => {
        return character.classes.reduce((total: number, cls: any) => {
            const classRule = rulesData.classes?.[cls.id];
            const bonus = classRule?.statBonus;

            if (bonus && bonus.stat === statName) {
                const applications = Math.floor(cls.level / bonus.frequency);
                return total + (applications * bonus.amount);
            }
            return total;
        }, 0);
    };

    const getGearBonus = (statName: string) => {
        // 1. Create an array of the items currently in your slots
        const equippedObjects = [
            character.equipment.activeWeapon,
            character.equipment.armor,
            // This grabs all the objects inside the 'accessories' sub-object
            ...Object.values(character.equipment.accessories || {})
        ].filter(Boolean); // This removes 'null' slots so the loop doesn't crash

        // 2. Now you can use reduce on that array
        return equippedObjects.reduce((total: number, item: any) => {
            const bonus = item.statBonuses?.[statName] ?? 0;
            return total + bonus;
        }, 0);
    };

    // 3. FINAL DERIVATIONS

    // HP
    const maxHp = character.attributes.might + (5 * characterLevel) + getClassBonus("hp") + getGearBonus("hp");
    const deathThreshold = Math.floor(maxHp * -0.5);

    // MP
    const maxMp = characterLevel + (2 * character.attributes.willpower) + getClassBonus("mp") + getGearBonus("mp");

    // IP
    const maxIp = 4 + getClassBonus("ip") + getGearBonus("ip");

    // DEFENSE
    const armorItem = character.equipment.armor;
    const calculateArmorDef = () => {
        if (!armorItem || !armorItem.defense) return 0;

        const {value, attribute, attrMax} = armorItem.defense;
        const bonus = attribute ? (character.attributes[attribute] ?? 0) : 0;
        const cappedBonus = attrMax ? Math.min(bonus, attrMax) : bonus;
        return value + cappedBonus;
    };

    const defense = calculateArmorDef() + getClassBonus("defense") + getGearBonus("defense");

    // STABILITY: Might + Willpower + Class Bonuses
    const stability = (armorItem?.stability ?? 0) + getClassBonus("stability") + getGearBonus("stability");

    return {
        characterLevel,
        maxHp,
        deathThreshold,
        maxMp,
        maxIp,
        defense,
        stability
    };
}