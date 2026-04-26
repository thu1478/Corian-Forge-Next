import {Trait} from "@/lib/rules";
import {useMemo} from "react";

export function useDerivedStats(character: any, rulesData: any) {

    const activeTraits: Trait[] = useMemo(() => {
        if (!character) return [];

        // 1. Use ONLY the unique list from the loader (this is the 8 traits)
        const allRefs = character.traitRefs || [];

        // 2. Hydrate all references into full Trait objects
        // We keep all your logic here so nothing "vanishes"
        return allRefs.reduce((acc: Trait[], tRef: any) => {
            // Check Global Passives
            let ruleData = rulesData.passives?.[tRef.id];

            // Search class passives
            if (!ruleData) {
                for (const charClass of (character.classes || [])) {
                    const classId = typeof charClass === 'object' ? (charClass.id || charClass.name) : charClass;
                    const classRegistry = rulesData.classes?.[classId];
                    if (classRegistry?.passives?.[tRef.id]) {
                        ruleData = classRegistry.passives[tRef.id];
                        break;
                    }
                }
            }

            // Check for item passives (Crucial for Earring/WeaponBond)
            if (!ruleData && tRef.itemId) {
                const sourceItem = character.inventory?.find((i: any) => String(i.uid) === String(tRef.itemId));
                const traitDefinition = sourceItem?.traits?.find((t: any) =>
                    typeof t === 'object' && t[tRef.id]
                );

                if (traitDefinition) {
                    ruleData = traitDefinition[tRef.id];
                }
            }

            // Final check for inline data passed from the loader
            if (!ruleData && tRef.inlineDefinition) {
                ruleData = tRef.inlineDefinition;
            }

            // Push if we found data OR if it's a known ref (to prevent vanishing)
            if (ruleData || tRef.id) {
                acc.push({
                    name: tRef.id,
                    description: "",
                    ...ruleData,
                    ...tRef,
                    uid: tRef.id, // Identity lock
                    source: tRef.source || ruleData?.source || "other"
                });
            }
            return acc;
        }, []);
    }, [character?.traitRefs, rulesData]);

    // CHARACTER LEVEL = MAX(CLASS LEVELS)
    const characterLevel = character.classes.length > 0
        ? Math.max(...character.classes.map((c: { level: any; }) => c.level))
        : 1;

    // 3. FINAL DERIVATIONS

    // Attributes (Traits can buff the core attribute)
    const attributes = {
        might: character.attributes.might + getTraitStatBonus(activeTraits, "might") + getGearBonus(character, "might"),
        dexterity: character.attributes.dexterity + getTraitStatBonus(activeTraits, "dexterity") + getGearBonus(character, "dexterity"),
        reason: character.attributes.reason + getTraitStatBonus(activeTraits, "reason") + getGearBonus(character, "reason"),
        willpower: character.attributes.willpower + getTraitStatBonus(activeTraits, "willpower") + getGearBonus(character, "willpower"),
        presence: character.attributes.presence + getTraitStatBonus(activeTraits, "presence") + getGearBonus(character, "presence"),
    };

    // HP
    const maxHP = attributes.might + (5 * characterLevel) +
        getClassBonus(character, rulesData, "hp") +
        getGearBonus(character, "hp") +
        getTraitStatBonus(activeTraits, "maxHP");
    const deathThreshold = Math.floor(maxHP * -0.5);

    // MP
    const maxMP = characterLevel + (2 * attributes.willpower) +
        getClassBonus(character, rulesData, "mp") +
        getGearBonus(character, "mp") +
        getTraitStatBonus(activeTraits, "maxMP");

    // DEFENSE
    const armorItem = character.equipment.armor;
    const calculateArmorBase = () => {
        if (!armorItem || !armorItem.defense) return 0;
        const { value, attribute, attrMax } = armorItem.defense;
        const attrVal = attribute ? (attributes[attribute as keyof typeof attributes] ?? 0) : 0;
        return value + (attrMax ? Math.min(attrVal, attrMax) : attrVal);
    };

    const defense = calculateArmorBase() +
        getClassBonus(character, rulesData, "defense") +
        getGearBonus(character, "defense") +
        getTraitStatBonus(activeTraits, "defense");

    // STABILITY: Might + Willpower + Class Bonuses
    const stability = (armorItem?.stability ?? 0) +
        getClassBonus(character, rulesData, "stability") +
        getGearBonus(character, "stability") +
        getTraitStatBonus(activeTraits, "stability");

    const resistances = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "Resistance")
        .map(e => e.value);

    const vulnerabilities = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "Vulnerability")
        .map(e => e.value);

    const grantedActionIds = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "GrantActionCard")
        .map(e => e.value);

    const languages = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "Language")
        .map(e => e.value)

    console.log(
        `%c Traits Hydrated: ${activeTraits.length} `,
        'background: #222; color: #bada55; font-weight: bold;'
    );
    console.table(activeTraits.map(t => ({
        uid: t.uid,
        id: t.id,
        name: t.name,
        effects: t.effects?.map(e => `${e.type}: ${e.value}`).join(", ")
    })));

    return {
        characterLevel,
        attributes,
        maxHP,
        deathThreshold,
        maxMP,
        maxIP: 4 + getClassBonus(character, rulesData, "ip") + getGearBonus(character, "ip") + getTraitStatBonus(activeTraits, "maxIP"),
        defense,
        stability,
        speed: 4 + getClassBonus(character, rulesData, "speed") + getGearBonus(character, "speed") + getTraitStatBonus(activeTraits, "speed"),
        // UI/System Exports
        activeTraits,
        resistances,
        vulnerabilities,
        grantedActionIds,
        languages
    };
}

const getTraitStatBonus = (traits: Trait[], statName: string) => {
    return traits.reduce((total, trait) => {
        // Find ALL effects that match the stat, not just the first one
        const bonuses = trait.effects?.filter(e => e.type === "StatChange" && e.stat === statName) || [];
        const sum = bonuses.reduce((s, b) => s + parseInt(b.value), 0);
        return total + sum;
    }, 0);
};

const getClassBonus = (character: any, rulesData: any, statName: string) => {
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

const getGearBonus = (character: any, statName: string) => {
    const equipped = [
        character.equipment.activeWeapon,
        character.equipment.armor,
        ...Object.values(character.equipment.accessories || {})
    ].filter(Boolean);

    return equipped.reduce((total: number, item: any) => {
        return total + (item.statBonuses?.[statName] ?? 0);
    }, 0);
};