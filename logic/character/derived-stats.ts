import type { RulesRoot } from "@/lib/rules-data"
import type { Trait } from "@/lib/rules"
import type { RulesWithBestiary } from "@/logic/creatures/roster"
import {
    computeArmorDefenseValue,
    computeMaxHP,
    computeMaxMP,
    computeSpeed,
    getAttributeModifier,
    getCharacterLevelForStats,
    getCrossBlockStabilityBonus,
    sumClassStatBonus,
    sumGearStatBonus,
    sumTraitStatChangeEffects,
} from "@/logic/character/stats"
import {
    collectConditionImmunitiesFromTraits,
    collectSpecialMovement,
    collectSpecialMovementDisplayLines,
    collectSpecialSightFromTraits,
} from "@/logic/combat/more-info"
import { resolveMountedRiderBonuses } from "@/logic/creatures/mounted-creature"
import {
    resistanceDamageType,
    vulnerabilityAmount,
    vulnerabilityDamageType,
} from "@/logic/traits/selection"
import { isGrantSkillEffect } from "@/logic/traits/grant-skill-effects"
import { isDualWielding, resolveEquippedHands } from "@/logic/equipment/weapon-utils"
import { getBestiaryTraitMap, getCreatureTemplates, type CreatureDefinition } from "@/logic/creatures/roster"
import {
    getDruidAnimaSlots,
    hasMartialArmorEquipped,
    sanitizeDruidAnimaTemplateIds,
} from "@/logic/creatures/druid-anima"
import { hydrateTraitRefs } from "@/logic/traits/trait-hydration"
import { getTraitRefs } from "@/logic/traits/trait-refs"

/** Save or hydrated sheet character — mixed equipment/inventory shapes at runtime. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeDerivedStats(character: any, rulesData: RulesRoot) {
    const rosterRules = rulesData as RulesWithBestiary
    const activeTraits: Trait[] = !character
        ? []
        : hydrateTraitRefs(getTraitRefs(character), character, rulesData);

    let activeAnimaTemplate: CreatureDefinition | null = null
    if (character?.activeDruidAnimaTemplateId) {
        const templates = getCreatureTemplates(rosterRules)
        const slots = getDruidAnimaSlots(character.classes ?? [], getTraitRefs(character))
        const selected = new Set(
            sanitizeDruidAnimaTemplateIds(character.druidAnimaTemplateIds, slots, templates)
        )
        const templateId = String(character.activeDruidAnimaTemplateId ?? "").trim()
        if (templateId && selected.has(templateId)) {
            activeAnimaTemplate = templates[templateId] ?? null
        }
    }

    const activeAnimaTraits: Trait[] = (() => {
        if (!activeAnimaTemplate?.traitRefs?.length) return []
        const bestiaryTraits = getBestiaryTraitMap(rosterRules)
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
    })()

    const effectiveTraits = activeAnimaTemplate
        ? [...activeTraits.filter((trait) => trait.source !== "racial"), ...activeAnimaTraits]
        : activeTraits;

    const characterLevel = getCharacterLevelForStats(character.classes || []);

    const { activeWeapon: handActive, offhandWeapon: handOff } = resolveEquippedHands(character, {
        rules: rosterRules,
        activeDruidAnimaTemplateId: character.activeDruidAnimaTemplateId,
    })
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
    const calculateArmorBase = () =>
        computeArmorDefenseValue(armorItem?.defense, attributes as Record<string, number>);

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
    const traitRefList = getTraitRefs(character);
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

    const mounted = resolveMountedRiderBonuses(character, rosterRules);
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
        rules: rosterRules,
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
