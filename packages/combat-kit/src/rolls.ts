import type { CharAttribute, PowerRoll } from "./types.js"
import type { AttributeBlock } from "./types.js"

export type PowerRollTier = 1 | 2 | 3

export type DiceRoll = {
    d1: number
    d2: number
    natural: number
}

export type AttributeRollResult = DiceRoll & {
    stat: CharAttribute
    score: number
    modifier: number
    total: number
    tier: PowerRollTier
}

export type ActionRollResult = AttributeRollResult & {
    actionId: string
    actionName: string
    tierDamage: number
    weaponBonus: number
    totalDamage: number
}

export type Rng = () => number

export function getAttributeModifier(score: number): number {
    return Math.floor((score - 10) / 2)
}

export function formatModifier(mod: number): string {
    if (mod >= 0) return `+${mod}`
    return String(mod)
}

export function resolvePowerRollTier(total: number): PowerRollTier {
    if (total <= 11) return 1
    if (total <= 16) return 2
    return 3
}

export function roll2d10(rng: Rng = Math.random): DiceRoll {
    const d1 = Math.floor(rng() * 10) + 1
    const d2 = Math.floor(rng() * 10) + 1
    return { d1, d2, natural: d1 + d2 }
}

export function pickRollStat(
    attributes: Partial<AttributeBlock>,
    rollStats: readonly CharAttribute[],
    chosenStat?: CharAttribute,
): CharAttribute {
    if (chosenStat && rollStats.includes(chosenStat)) return chosenStat
    if (rollStats.length === 0) return "might"
    if (rollStats.length === 1) return rollStats[0]!

    let best = rollStats[0]!
    let bestMod = getAttributeModifier(attributes[best] ?? 10)
    for (const stat of rollStats.slice(1)) {
        const mod = getAttributeModifier(attributes[stat] ?? 10)
        if (mod > bestMod) {
            best = stat
            bestMod = mod
        }
    }
    return best
}

export function rollAttributeCheck(
    attributes: Partial<AttributeBlock>,
    stat: CharAttribute,
    rng: Rng = Math.random,
): AttributeRollResult {
    const score = attributes[stat] ?? 10
    const modifier = getAttributeModifier(score)
    const dice = roll2d10(rng)
    const total = dice.natural + modifier
    return {
        ...dice,
        stat,
        score,
        modifier,
        total,
        tier: resolvePowerRollTier(total),
    }
}

function tierDamageForRoll(powerRoll: PowerRoll, tier: PowerRollTier): {
    baseDamage: number
    usesWeapon: boolean
} {
    if (tier === 1) {
        return { baseDamage: powerRoll.tier1Dmg ?? 0, usesWeapon: powerRoll.tier1Wpn === true }
    }
    if (tier === 2) {
        return { baseDamage: powerRoll.tier2Dmg ?? 0, usesWeapon: powerRoll.tier2Wpn === true }
    }
    return { baseDamage: powerRoll.tier3Dmg ?? 0, usesWeapon: powerRoll.tier3Wpn === true }
}

export function resolveNaturalWeaponBonus(
    naturalWeapons: Record<string, { damage: number }> | undefined,
    defaultKey: string | undefined,
    usesWeapon: boolean,
): number {
    if (!usesWeapon || !naturalWeapons || !defaultKey) return 0
    return naturalWeapons[defaultKey]?.damage ?? 0
}

export function rollActionPowerRoll(input: {
    attributes: Partial<AttributeBlock>
    powerRoll: PowerRoll
    actionId: string
    actionName: string
    chosenStat?: CharAttribute
    naturalWeapons?: Record<string, { damage: number }>
    defaultNaturalWeaponKey?: string
    rng?: Rng
}): ActionRollResult {
    const stat = pickRollStat(input.attributes, input.powerRoll.rollStats ?? [], input.chosenStat)
    const base = rollAttributeCheck(input.attributes, stat, input.rng)
    const { baseDamage, usesWeapon } = tierDamageForRoll(input.powerRoll, base.tier)
    const weaponBonus = resolveNaturalWeaponBonus(
        input.naturalWeapons,
        input.defaultNaturalWeaponKey,
        usesWeapon,
    )
    return {
        ...base,
        actionId: input.actionId,
        actionName: input.actionName,
        tierDamage: baseDamage,
        weaponBonus,
        totalDamage: baseDamage + weaponBonus,
    }
}
