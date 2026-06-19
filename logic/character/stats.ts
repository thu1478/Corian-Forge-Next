import { traitRefsIncludeId } from "@/logic/traits/helpers"
import type {
    ClassBonusRule,
    ClassLevel,
    ClassSkillTrainingRule,
    StatChangeContext,
} from "@/lib/character-data"

export function getAttributeModifier(score: number): number {
    return Math.floor((score - 10) / 2)
}

export type ArmorDefenseRule = {
    value?: number
    attribute?: string
    attrMax?: number
}

/** Armor defense from base value plus optional attribute modifier (attrMax caps positive contribution). */
export function computeArmorDefenseValue(
    defense: ArmorDefenseRule | null | undefined,
    attributes: Record<string, number>
): number {
    if (!defense) return 0
    const base = defense.value ?? 0
    const attribute = defense.attribute?.trim()
    if (!attribute) return Math.max(0, base)
    const score = attributes[attribute] ?? 10
    const mod = getAttributeModifier(score)
    const contribution = defense.attrMax != null ? Math.min(mod, defense.attrMax) : mod
    return Math.max(0, base + contribution)
}

export function formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

export function classSkillTrainingEntries(
    classRule: { skillTraining?: ClassSkillTrainingRule; skillTrainings?: ClassSkillTrainingRule[] } | undefined
): ClassSkillTrainingRule[] {
    if (!classRule) return []
    if (Array.isArray(classRule.skillTrainings) && classRule.skillTrainings.length > 0) {
        return classRule.skillTrainings
    }
    const single = classRule.skillTraining
    if (single && typeof single === "object") return [single]
    return []
}

export function countClassSkillTrainingApplications(classLevel: number, rule: ClassSkillTrainingRule): number {
    const lvl = Math.max(0, Math.floor(Number(classLevel) || 0))
    if (rule.once === true) {
        return lvl >= 1 ? 1 : 0
    }
    const freq = typeof rule.frequency === "number" && rule.frequency > 0 ? rule.frequency : 1
    return Math.floor(lvl / freq)
}

export function classStatBonusEntries(classRule: {
    statBonus?: ClassBonusRule
    statBonuses?: ClassBonusRule[]
} | undefined): ClassBonusRule[] {
    if (!classRule) return []
    if (Array.isArray(classRule.statBonuses) && classRule.statBonuses.length > 0) {
        return classRule.statBonuses
    }
    const single = classRule.statBonus
    if (single && typeof single === "object") return [single]
    return []
}

export function getCharacterLevelForStats(classes: ClassLevel[]): number {
    return classes.length > 0 ? Math.max(...classes.map((c) => c.level)) : 1
}

export function sumClassStatBonus(
    classes: ClassLevel[],
    rulesData: any,
    statName: string
): number {
    return classes.reduce((total: number, cls: ClassLevel) => {
        const classRule = rulesData?.classes?.[cls.id]
        let row = 0
        for (const bonus of classStatBonusEntries(classRule)) {
            if (bonus.stat !== statName) continue
            if (bonus.once) {
                if (cls.level >= 1) row += bonus.amount
            } else {
                const applications = Math.floor(cls.level / (bonus.frequency || 1))
                row += applications * bonus.amount
            }
        }
        return total + row
    }, 0)
}

type TraitLike = {
    effects?: Array<{ type: string; stat?: string; value?: string; when?: string }>
}

function statChangeApplies(
    effect: { when?: string },
    context: StatChangeContext | undefined
): boolean {
    const when = effect.when?.trim()
    if (!when) return true
    if (when === "dualWielding") return context?.isDualWielding === true
    return false
}

export function sumTraitStatChangeEffects(
    traits: TraitLike[],
    statName: string,
    context?: StatChangeContext
): number {
    return traits.reduce((total, trait) => {
        const bonuses =
            trait.effects?.filter(
                (e) =>
                    e.type === "StatChange" &&
                    e.stat === statName &&
                    statChangeApplies(e, context)
            ) || []
        const sum = bonuses.reduce((s, b) => s + parseInt(b.value ?? "0", 10), 0)
        return total + sum
    }, 0)
}

export function getCrossBlockStabilityBonus(
    traitRefs: readonly { id?: string }[] | undefined,
    isDualWielding: boolean
): number {
    if (!isDualWielding) return 0
    return traitRefsIncludeId(traitRefs, "crossBlock") ? 1 : 0
}

export function sumGearStatBonus(
    character: { equipment?: any; inventory?: any[] } | null | undefined,
    statName: string
): number {
    if (!character?.equipment) return 0
    const eq = character.equipment
    const inv = character.inventory || []

    const resolve = (slot: unknown): any => {
        if (slot == null) return null
        if (typeof slot === "object" && slot !== null && "statBonuses" in (slot as object)) {
            return slot
        }
        const uid = typeof slot === "string" ? slot : (slot as { uid?: string })?.uid
        if (!uid) return null
        return inv.find((i: any) => String(i.uid) === String(uid)) ?? null
    }

    const equipped = [
        resolve(eq.activeWeapon),
        resolve(eq.offhand),
        resolve(eq.armor),
        ...Object.values(eq.accessories || {}).map(resolve),
    ].filter(Boolean)

    return equipped.reduce(
        (total: number, item: any) => total + (item.statBonuses?.[statName] ?? 0),
        0
    )
}

export function computeMaxHP(params: {
    effectiveMight: number
    characterLevel: number
    classHpBonus: number
    gearHpBonus: number
    traitMaxHpBonus: number
}): number {
    return (
        Math.floor((params.effectiveMight - 10) / 2) +
        2 * params.characterLevel +
        16 +
        params.classHpBonus +
        params.gearHpBonus +
        params.traitMaxHpBonus
    )
}

export function computeMaxMP(params: {
    effectiveWillpower: number
    characterLevel: number
    classMpBonus: number
    gearMpBonus: number
    traitMaxMpBonus: number
}): number {
    return (
        params.characterLevel +
        2 * params.effectiveWillpower +
        params.classMpBonus +
        params.gearMpBonus +
        params.traitMaxMpBonus
    )
}

export function computeSpeed(params: {
    classSpeedBonus: number
    gearSpeedBonus: number
    traitSpeedBonus: number
}): number {
    return 4 + params.classSpeedBonus + params.gearSpeedBonus + params.traitSpeedBonus
}
