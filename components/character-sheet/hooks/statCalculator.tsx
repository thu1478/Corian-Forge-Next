import {Trait} from "@/lib/rules";
import {resolveDeityBoonDisplay} from "@/lib/priest-deities";
import {
    computeMaxHP,
    computeMaxMP,
    computeSpeed,
    getAttributeModifier,
    getCharacterLevelForStats,
    sumClassStatBonus,
    sumGearStatBonus,
    sumTraitStatChangeEffects,
} from "@/lib/character-data";
import {
    collectConditionImmunitiesFromTraits,
    collectSpecialSightFromTraits,
} from "@/lib/combat-more-info";
import {
    resolveTraitEffectsAfterSelection,
    vulnerabilityAmount,
    vulnerabilityDamageType,
} from "@/lib/trait-selection";
import {useMemo} from "react";

/** Hydrate trait refs into full Trait objects (shared with character creator review). */
export function hydrateTraitRefs(traitRefs: any[], character: any, rulesData: any): Trait[] {
    if (!character) return [];

    return traitRefs.reduce((acc: Trait[], tRef: any) => {
        let ruleData = rulesData.passives?.[tRef.id];
        const raceKey = character.race?.toLowerCase?.();

        if (!ruleData) {
            for (const charClass of character.classes || []) {
                const classId = typeof charClass === "object" ? (charClass.id || charClass.name) : charClass;
                const classRegistry = rulesData.classes?.[classId];
                if (classRegistry?.passives?.[tRef.id]) {
                    ruleData = classRegistry.passives[tRef.id];
                    if (tRef.id === "deityBoon" && classId === "priest") {
                        const merged = resolveDeityBoonDisplay(rulesData, character.priestDeity, ruleData);
                        ruleData = {...ruleData, name: merged.name, description: merged.description};
                    }
                    break;
                }
            }
        }

        if (!ruleData && raceKey) {
            ruleData = rulesData.races?.[raceKey]?.passives?.[tRef.id];
        }

        if (!ruleData) {
            ruleData = rulesData.system?.feats?.[tRef.id];
        }

        if (!ruleData && tRef.itemId) {
            const sourceItem = character.inventory?.find((i: any) => String(i.uid) === String(tRef.itemId));
            const traitDefinition = sourceItem?.traits?.find((t: any) =>
                typeof t === "object" && t[tRef.id]
            );

            if (traitDefinition) {
                ruleData = traitDefinition[tRef.id];
            }
        }

        if (!ruleData && tRef.inlineDefinition) {
            ruleData = tRef.inlineDefinition;
        }

        if (ruleData || tRef.id) {
            const merged: Trait = {
                name: tRef.id,
                description: "",
                ...ruleData,
                ...tRef,
                uid: tRef.id,
                source: tRef.source || ruleData?.source || "other"
            };
            const resolved = resolveTraitEffectsAfterSelection(
                merged,
                tRef.selectedEffectIndices
            );
            if (resolved) {
                merged.effects = resolved;
            }
            acc.push(merged);
        }
        return acc;
    }, []);
}

export function useDerivedStats(character: any, rulesData: any) {

    const activeTraits: Trait[] = useMemo(() => {
        if (!character) return [];
        const allRefs = character.traitRefs || [];
        return hydrateTraitRefs(allRefs, character, rulesData);
    }, [character, rulesData]);

    const characterLevel = getCharacterLevelForStats(character.classes || []);

    // Attributes (Traits can buff the core attribute)
    const attributes = {
        might: character.attributes.might + sumTraitStatChangeEffects(activeTraits, "might") + sumGearStatBonus(character, "might"),
        dexterity: character.attributes.dexterity + sumTraitStatChangeEffects(activeTraits, "dexterity") + sumGearStatBonus(character, "dexterity"),
        reason: character.attributes.reason + sumTraitStatChangeEffects(activeTraits, "reason") + sumGearStatBonus(character, "reason"),
        willpower: character.attributes.willpower + sumTraitStatChangeEffects(activeTraits, "willpower") + sumGearStatBonus(character, "willpower"),
        presence: character.attributes.presence + sumTraitStatChangeEffects(activeTraits, "presence") + sumGearStatBonus(character, "presence"),
    };

    const maxHP = computeMaxHP({
        effectiveMight: attributes.might,
        characterLevel,
        classHpBonus: sumClassStatBonus(character.classes || [], rulesData, "hp"),
        gearHpBonus: sumGearStatBonus(character, "hp"),
        traitMaxHpBonus: sumTraitStatChangeEffects(activeTraits, "maxHP"),
    });
    const deathThreshold = Math.floor(maxHP * -0.5);

    const maxMP = computeMaxMP({
        effectiveWillpower: attributes.willpower,
        characterLevel,
        classMpBonus: sumClassStatBonus(character.classes || [], rulesData, "mp"),
        gearMpBonus: sumGearStatBonus(character, "mp"),
        traitMaxMpBonus: sumTraitStatChangeEffects(activeTraits, "maxMP"),
    });

    // DEFENSE
    const armorItem = character.equipment.armor;
    const calculateArmorBase = () => {
        if (!armorItem || !armorItem.defense) return 0;
        const { value, attribute, attrMax } = armorItem.defense;
        const attrVal = attribute ? (attributes[attribute as keyof typeof attributes] ?? 0) : 0;
        return value + (attrMax ? Math.min(attrVal, attrMax) : attrVal);
    };

    const defense = calculateArmorBase() +
        sumClassStatBonus(character.classes || [], rulesData, "defense") +
        sumGearStatBonus(character, "defense") +
        sumTraitStatChangeEffects(activeTraits, "defense");

    // STABILITY: Might + Willpower + Class Bonuses
    const stability = (armorItem?.stability ?? 0) +
        sumClassStatBonus(character.classes || [], rulesData, "stability") +
        sumGearStatBonus(character, "stability") +
        sumTraitStatChangeEffects(activeTraits, "stability");

    const resistances = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "Resistance")
        .map(e => e.stat)
        .filter((stat): stat is string => !!stat);

    const vulnerabilities = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "Vulnerability")
        .reduce((acc: Record<string, number>, effect) => {
            const type = vulnerabilityDamageType(effect);
            if (!type) return acc;
            const amount = vulnerabilityAmount(effect);
            acc[type] = (acc[type] || 0) + amount;
            return acc;
        }, {});

    const grantedActionIds = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "GrantActionCard")
        .map(e => e.value)
        .filter((v): v is string => typeof v === "string" && v.length > 0);

    const languages = activeTraits
        .flatMap(t => t.effects || [])
        .filter(e => e.type === "Language")
        .map(e => e.value)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
    
    // Also include legacy languages from save data (backward compatibility)
    const legacyLanguages = character?.languages || [];
    
    const allLanguages = ["Common", ...languages, ...legacyLanguages].filter((v, i, a) => a.indexOf(v) === i);

    // console.log(
    //     `%c Traits Hydrated: ${activeTraits.length} `,
    //     'background: #222; color: #bada55; font-weight: bold;'
    // );
    // console.table(activeTraits.map(t => ({
    //     uid: t.uid,
    //     id: t.id,
    //     name: t.name,
    //     effects: t.effects?.map(e => `${e.type}: ${e.value}`).join(", ")
    // })));

    return {
        characterLevel,
        attributes,
        maxHP,
        deathThreshold,
        maxMP,
        maxIP: 6 + sumClassStatBonus(character.classes || [], rulesData, "ip") + sumGearStatBonus(character, "ip") + sumTraitStatChangeEffects(activeTraits, "maxIP"),
        maxRespite:
            6 +
            sumTraitStatChangeEffects(activeTraits, "maxRespites") +
            Math.min(2, Math.max(0, getAttributeModifier(attributes.might))),
        conditionImmunities: collectConditionImmunitiesFromTraits(activeTraits),
        specialSight: collectSpecialSightFromTraits(activeTraits),
        defense,
        stability,
        speed: computeSpeed({
            classSpeedBonus: sumClassStatBonus(character.classes || [], rulesData, "speed"),
            gearSpeedBonus: sumGearStatBonus(character, "speed"),
            traitSpeedBonus: sumTraitStatChangeEffects(activeTraits, "speed"),
        }),
        // UI/System Exports
        activeTraits,
resistances,
        vulnerabilities,
        grantedActionIds,
        languages: allLanguages
    };
}