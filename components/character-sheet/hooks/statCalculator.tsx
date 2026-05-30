import {Trait} from "@/lib/rules";
import {resolveDeityBoonDisplay} from "@/lib/priest-deities";
import {
    computeMaxHP,
    computeMaxMP,
    computeSpeed,
    getAttributeModifier,
    getCharacterLevelForStats,
    getCrossBlockStabilityBonus,
    sumClassStatBonus,
    sumGearStatBonus,
    sumTraitStatChangeEffects,
} from "@/lib/character-data";
import {
    collectConditionImmunitiesFromTraits,
    collectSpecialMovement,
    collectSpecialMovementDisplayLines,
    collectSpecialSightFromTraits,
} from "@/lib/combat-more-info";
import { resolveMountedRiderBonuses } from "@/lib/mounted-creature";
import {
    resolveTraitEffectsAfterSelection,
    resistanceDamageType,
    vulnerabilityAmount,
    vulnerabilityDamageType,
} from "@/lib/trait-selection";
import {isGrantSkillEffect} from "@/lib/grant-skill-effects";
import { isDualWielding, resolveEquippedHands } from "@/lib/weapon-utils";
import {useMemo} from "react";
import { getBestiaryTraitMap, getCreatureTemplates } from "@/lib/creature-roster";
import {
    getDruidAnimaSlots,
    hasMartialArmorEquipped,
    sanitizeDruidAnimaTemplateIds,
} from "@/lib/druid-anima";

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
            const saveEffects = Array.isArray((tRef as { effects?: unknown }).effects)
                ? (tRef as { effects: Trait["effects"] }).effects
                : undefined
            const merged: Trait = {
                name: tRef.id,
                description: "",
                ...ruleData,
                ...tRef,
                id: tRef.id,
                uid: tRef.id,
                source: tRef.source || ruleData?.source || "other",
                effects: saveEffects?.length ? saveEffects : ruleData?.effects,
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
        const allRefs =
            Array.isArray(character.traitRefs) && character.traitRefs.length > 0
                ? character.traitRefs
                : (character.traits ?? []);
        return hydrateTraitRefs(allRefs, character, rulesData);
    }, [character, rulesData]);

    const activeAnimaTemplate = useMemo(() => {
        if (!character?.activeDruidAnimaTemplateId) return null;
        const templates = getCreatureTemplates(rulesData);
        const slots = getDruidAnimaSlots(character.classes ?? [], character.traitRefs ?? character.traits ?? []);
        const selected = new Set(
            sanitizeDruidAnimaTemplateIds(character.druidAnimaTemplateIds, slots, templates)
        );
        const templateId = String(character.activeDruidAnimaTemplateId ?? "").trim();
        if (!templateId || !selected.has(templateId)) return null;
        return templates[templateId] ?? null;
    }, [
        character?.activeDruidAnimaTemplateId,
        character?.druidAnimaTemplateIds,
        character?.classes,
        character?.traitRefs,
        character?.traits,
        rulesData,
    ]);

    const activeAnimaTraits: Trait[] = useMemo(() => {
        if (!activeAnimaTemplate?.traitRefs?.length) return []
        const bestiaryTraits = getBestiaryTraitMap(rulesData)
        return activeAnimaTemplate.traitRefs.map((id) => {
            const def = bestiaryTraits[id]
            return {
                id,
                uid: `anima:${id}`,
                name: def?.name ?? id,
                source: "other" as const,
                description: def?.description ?? "",
                minLevel: 1,
                effects: def?.effects,
            }
        })
    }, [activeAnimaTemplate?.traitRefs, rulesData])

    const effectiveTraits = activeAnimaTemplate
        ? [...activeTraits.filter((trait) => trait.source !== "racial"), ...activeAnimaTraits]
        : activeTraits;

    // #region agent log
    if (character?.activeDruidAnimaTemplateId) {
        const slots = getDruidAnimaSlots(character.classes ?? [], character.traitRefs ?? character.traits ?? [])
        const selected = new Set(
            sanitizeDruidAnimaTemplateIds(character.druidAnimaTemplateIds, slots, getCreatureTemplates(rulesData))
        )
        fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f4e9fe" },
            body: JSON.stringify({
                sessionId: "f4e9fe",
                runId: "post-fix",
                hypothesisId: "A,B",
                location: "statCalculator.tsx:animaTraits",
                message: "Anima trait merge",
                data: {
                    activeTemplateId: character.activeDruidAnimaTemplateId,
                    templateResolved: Boolean(activeAnimaTemplate),
                    templateTraitRefs: activeAnimaTemplate?.traitRefs ?? null,
                    activeAnimaTraitsCount: activeAnimaTraits.length,
                    activeAnimaTraitIds: activeAnimaTraits.map((t) => t.id),
                    effectiveTraitsCount: effectiveTraits.length,
                    inSelectedSet: selected.has(String(character.activeDruidAnimaTemplateId ?? "").trim()),
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {})
    }
    // #endregion

    const characterLevel = getCharacterLevelForStats(character.classes || []);

    const { activeWeapon: handActive, offhandWeapon: handOff } = resolveEquippedHands(character, {
        rules: rulesData,
        activeDruidAnimaTemplateId: character.activeDruidAnimaTemplateId,
    });
    const dualWielding = isDualWielding(handActive, handOff);
    const shieldStabilityBonus = Math.max(
        0,
        ...[handActive, handOff].map((item) =>
            item?.type === "shield" && typeof item.stability === "number" ? item.stability : 0
        )
    );

    const baseMight = activeAnimaTemplate?.attributes?.might ?? character.attributes.might
    const baseDexterity = activeAnimaTemplate?.attributes?.dexterity ?? character.attributes.dexterity

    const normalAttributes = {
        might: character.attributes.might + sumTraitStatChangeEffects(activeTraits, "might") + sumGearStatBonus(character, "might"),
        dexterity: character.attributes.dexterity + sumTraitStatChangeEffects(activeTraits, "dexterity") + sumGearStatBonus(character, "dexterity"),
        reason: character.attributes.reason + sumTraitStatChangeEffects(activeTraits, "reason") + sumGearStatBonus(character, "reason"),
        willpower: character.attributes.willpower + sumTraitStatChangeEffects(activeTraits, "willpower") + sumGearStatBonus(character, "willpower"),
        presence: character.attributes.presence + sumTraitStatChangeEffects(activeTraits, "presence") + sumGearStatBonus(character, "presence"),
    }

    // Max HP uses the untransformed stat line (Anima replaces Might/Dex for combat only).
    const hpStatSource =
        activeAnimaTemplate && character.equipmentBeforeAnima
            ? { equipment: character.equipmentBeforeAnima, inventory: character.inventory }
            : character
    const hpMight =
        character.attributes.might +
        sumTraitStatChangeEffects(activeTraits, "might") +
        sumGearStatBonus(hpStatSource, "might")

    // Attributes (Traits can buff the core attribute)
    const attributes = {
        might: baseMight + sumTraitStatChangeEffects(effectiveTraits, "might") + sumGearStatBonus(character, "might"),
        dexterity: baseDexterity + sumTraitStatChangeEffects(effectiveTraits, "dexterity") + sumGearStatBonus(character, "dexterity"),
        reason: character.attributes.reason + sumTraitStatChangeEffects(effectiveTraits, "reason") + sumGearStatBonus(character, "reason"),
        willpower: character.attributes.willpower + sumTraitStatChangeEffects(effectiveTraits, "willpower") + sumGearStatBonus(character, "willpower"),
        presence: character.attributes.presence + sumTraitStatChangeEffects(effectiveTraits, "presence") + sumGearStatBonus(character, "presence"),
    };

    const maxHP = computeMaxHP({
        effectiveMight: hpMight,
        characterLevel,
        classHpBonus: sumClassStatBonus(character.classes || [], rulesData, "hp"),
        gearHpBonus: sumGearStatBonus(hpStatSource, "hp"),
        traitMaxHpBonus: sumTraitStatChangeEffects(activeTraits, "maxHP"),
    });
    const deathThreshold = Math.floor(maxHP * -0.5);

    const maxMP = computeMaxMP({
        effectiveWillpower: attributes.willpower,
        characterLevel,
        classMpBonus: sumClassStatBonus(character.classes || [], rulesData, "mp"),
        gearMpBonus: sumGearStatBonus(character, "mp"),
        traitMaxMpBonus: sumTraitStatChangeEffects(effectiveTraits, "maxMP"),
    });

    // DEFENSE
    const armorItem = character.equipment.armor;
    const calculateArmorBase = () => {
        if (!armorItem || !armorItem.defense) return 0;
        const {value, attribute, attrMax} = armorItem.defense;
        const attrVal = attribute ? (attributes[attribute as keyof typeof attributes] ?? 0) : 0;
        return value + (attrMax ? Math.min(attrVal, attrMax) : attrVal);
    };

    const hasShieldEquipped = handActive?.type === "shield" || handOff?.type === "shield"
    const hasUnarmoredDefense = effectiveTraits.some(
        (trait) => trait.id === "unarmoredDefense" && trait.source === "class"
    )
    const unarmoredDefenseBonus =
        hasUnarmoredDefense && !hasMartialArmorEquipped(character) && !hasShieldEquipped
            ? Math.max(0, Math.min(3, getAttributeModifier(attributes.dexterity)))
            : 0
    const replacedDefenseBase =
        activeAnimaTemplate && typeof activeAnimaTemplate.defense === "number"
            ? activeAnimaTemplate.defense
            : calculateArmorBase()

    const baseDefense = replacedDefenseBase +
        sumClassStatBonus(character.classes || [], rulesData, "defense") +
        sumGearStatBonus(character, "defense") +
        sumTraitStatChangeEffects(effectiveTraits, "defense") +
        unarmoredDefenseBonus;

    // STABILITY: armor + equipped shield + class + gear + traits (shield Defense is not passive).
    const replacedStabilityBase =
        activeAnimaTemplate && typeof activeAnimaTemplate.stability === "number"
            ? activeAnimaTemplate.stability
            : (armorItem?.stability ?? 0) + shieldStabilityBonus
    const traitRefList =
        (Array.isArray(character.traitRefs) && character.traitRefs.length > 0
            ? character.traitRefs
            : character.traits) ?? [];
    const traitStabilityBonus = sumTraitStatChangeEffects(effectiveTraits, "stability", {
        isDualWielding: dualWielding,
    });
    const crossBlockFromTraits = sumTraitStatChangeEffects(
        effectiveTraits.filter((t) => t.id === "crossBlock" || t.uid === "crossBlock"),
        "stability",
        { isDualWielding: dualWielding }
    );
    const crossBlockFallback = getCrossBlockStabilityBonus(traitRefList, dualWielding);
    const stabilityTraitBonus =
        traitStabilityBonus +
        (crossBlockFallback > 0 && crossBlockFromTraits === 0 ? crossBlockFallback : 0);

    const baseStability = replacedStabilityBase +
        sumClassStatBonus(character.classes || [], rulesData, "stability") +
        sumGearStatBonus(character, "stability") +
        stabilityTraitBonus;

    const speedBonuses = {
        classSpeedBonus: sumClassStatBonus(character.classes || [], rulesData, "speed"),
        gearSpeedBonus: sumGearStatBonus(character, "speed"),
        traitSpeedBonus: sumTraitStatChangeEffects(effectiveTraits, "speed"),
    }
    const walkSpeed = activeAnimaTemplate && typeof activeAnimaTemplate.speed === "number"
        ? activeAnimaTemplate.speed +
          speedBonuses.classSpeedBonus +
          speedBonuses.gearSpeedBonus +
          speedBonuses.traitSpeedBonus
        : computeSpeed(speedBonuses);

    const mounted = resolveMountedRiderBonuses(character, rulesData);
    const defense = baseDefense + (mounted?.defenseBonus ?? 0);
    const stability = baseStability + (mounted?.stabilityBonus ?? 0);
    const speed = mounted?.speed ?? walkSpeed;

    const statHighlights = {
        attributes: {
            might: Boolean(activeAnimaTemplate && attributes.might !== normalAttributes.might),
            dexterity: Boolean(activeAnimaTemplate && attributes.dexterity !== normalAttributes.dexterity),
            reason: Boolean(activeAnimaTemplate && attributes.reason !== normalAttributes.reason),
            willpower: Boolean(activeAnimaTemplate && attributes.willpower !== normalAttributes.willpower),
            presence: Boolean(activeAnimaTemplate && attributes.presence !== normalAttributes.presence),
        },
        combat: {
            defense: Boolean(activeAnimaTemplate || (mounted?.defenseBonus ?? 0) !== 0),
            stability: Boolean(activeAnimaTemplate || (mounted?.stabilityBonus ?? 0) !== 0),
            speed: Boolean(activeAnimaTemplate || (mounted && mounted.speed !== walkSpeed)),
        },
    }

    const specialMovement = collectSpecialMovement({
        traits: effectiveTraits,
        landSpeed: walkSpeed,
        character,
        rules: rulesData,
        mounted,
    });

    const traitResistances = effectiveTraits
        .flatMap((t) => t.effects || [])
        .filter((e) => !isGrantSkillEffect(e))
        .filter((e): e is typeof e & { type: "Resistance" } => e.type === "Resistance")
        .map((e) => resistanceDamageType(e))
        .filter((type): type is string => !!type);

    const traitVulnerabilities = effectiveTraits
        .flatMap((t) => t.effects || [])
        .filter((e) => !isGrantSkillEffect(e))
        .filter((e): e is typeof e & { type: "Vulnerability" } => e.type === "Vulnerability")
        .reduce((acc: Record<string, number>, effect) => {
            const type = vulnerabilityDamageType(effect);
            if (!type) return acc;
            const amount = vulnerabilityAmount(effect);
            acc[type] = (acc[type] || 0) + amount;
            return acc;
        }, {});

    const resistances = activeAnimaTemplate?.resistances ?? traitResistances

    const vulnerabilities = activeAnimaTemplate?.vulnerabilities
        ? activeAnimaTemplate.vulnerabilities.reduce((acc: Record<string, number>, effect) => {
              const stat = String(effect.stat ?? "").trim()
              if (!stat) return acc
              const value = Number(effect.value ?? 1)
              acc[stat] = Number.isFinite(value) ? value : 1
              return acc
          }, {})
        : traitVulnerabilities

    const grantedActionIds = effectiveTraits
        .flatMap((t) => t.effects || [])
        .filter((e) => !isGrantSkillEffect(e))
        .filter((e): e is typeof e & { type: "GrantActionCard" } => e.type === "GrantActionCard")
        .map((e) => e.value)
        .filter((v): v is string => typeof v === "string" && v.length > 0);

    const languages = effectiveTraits
        .flatMap((t) => t.effects || [])
        .filter((e) => !isGrantSkillEffect(e))
        .filter((e): e is typeof e & { type: "Language" } => e.type === "Language")
        .map((e) => e.value)
        .filter((v): v is string => typeof v === "string" && v.length > 0)

    // Also include legacy languages from save data (backward compatibility)
    const legacyLanguages = character?.languages || [];

    const allLanguages = activeAnimaTemplate
        ? []
        : ["Common", ...languages, ...legacyLanguages].filter((v, i, a) => a.indexOf(v) === i);

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
        maxIP: 6 + sumClassStatBonus(character.classes || [], rulesData, "ip") + sumGearStatBonus(character, "ip") + sumTraitStatChangeEffects(effectiveTraits, "maxIP"),
        maxRespite:
            6 +
            sumTraitStatChangeEffects(effectiveTraits, "maxRespites") +
            Math.min(2, getAttributeModifier(attributes.might)),
        conditionImmunities: activeAnimaTemplate?.immunities ?? collectConditionImmunitiesFromTraits(effectiveTraits),
        specialSight: collectSpecialSightFromTraits(effectiveTraits),
        specialMovement: collectSpecialMovementDisplayLines(specialMovement),
        defense,
        stability,
        speed,
        statHighlights,
        mountedContext: mounted
            ? {
                  creatureName: mounted.creatureName,
                  defenseBonus: mounted.defenseBonus,
                  stabilityBonus: mounted.stabilityBonus,
              }
            : null,
        // UI/System Exports
        activeTraits: effectiveTraits,
        activeDruidAnima: activeAnimaTemplate
            ? {
                  name: activeAnimaTemplate.name,
                  templateId: character.activeDruidAnimaTemplateId,
              }
            : null,
        resistances,
        vulnerabilities,
        grantedActionIds,
        languages: allLanguages
    };
}