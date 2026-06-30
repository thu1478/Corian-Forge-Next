import type { CharAttribute, PotencyEffect, PowerRoll } from "@corian-forge/rules-kit"
import { getAttributeModifier, resolveNaturalWeaponBonus } from "./rolls.js"
import type { AttributeBlock } from "./types.js"

export type TierIndex = 1 | 2 | 3

const TIER_LABELS: Record<TierIndex, string> = {
    1: "≤11",
    2: "12–16",
    3: "≥17",
}

const ATTR_ABBR: Record<CharAttribute, string> = {
    might: "M",
    dexterity: "D",
    reason: "R",
    willpower: "W",
    presence: "P",
}

function potencyStrengthToModifier(strength: unknown): number {
    if (typeof strength === "number" && Number.isFinite(strength)) return strength
    if (typeof strength === "string") {
        const k = strength.trim().toLowerCase()
        if (k === "weak") return -2
        if (k === "average") return -1
        if (k === "strong") return 0
    }
    return 0
}

function potencyStrengthLabel(strength: unknown): string | null {
    if (typeof strength === "string") {
        const k = strength.trim().toLowerCase()
        if (k === "weak" || k === "average" || k === "strong") return k
    }
    if (typeof strength === "number") {
        if (strength === -2) return "weak"
        if (strength === -1) return "average"
        if (strength === 0) return "strong"
    }
    return null
}

function formatDuration(raw: unknown): string | null {
    if (raw == null) return null
    const s = String(raw).trim()
    if (!s || s.toLowerCase() === "none") return null
    return s
}

function formatStatList(stats: readonly CharAttribute[] | undefined): string | null {
    if (!stats?.length) return null
    return stats.map((s) => ATTR_ABBR[s] ?? s[0]?.toUpperCase() ?? s).join("/")
}

export type PotencyEffectPreview = {
    summary: string
    duration: string | null
    potencyThreshold: number | null
    potencyTargetStats: string | null
    potencySourceStats: string | null
    potencyStrength: string | null
}

export function formatPotencyEffectPreview(
    effect: PotencyEffect,
    attributes: Partial<AttributeBlock>,
): PotencyEffectPreview {
    if (effect.type === "ForcedMovement") {
        const duration = "duration" in effect ? formatDuration(effect.duration) : null
        return {
            summary: `${effect.effect} ${effect.distance}`,
            duration,
            potencyThreshold: null,
            potencyTargetStats: formatStatList(effect.targetStats),
            potencySourceStats: formatStatList(effect.srcStats),
            potencyStrength: potencyStrengthLabel(effect.strength),
        }
    }

    if (effect.type === "Special") {
        const raw = effect.effect.trim()
        const trailing = raw.match(/\s+(\[[^\]]+\])\s*$/i)
        const body = trailing?.index != null ? raw.slice(0, trailing.index).trim() : raw
        const bracket = trailing?.[1]?.slice(1, -1).trim() ?? null
        return {
            summary: body || raw,
            duration: formatDuration(effect.duration) ?? bracket,
            potencyThreshold: null,
            potencyTargetStats: null,
            potencySourceStats: null,
            potencyStrength: null,
        }
    }

    const strMod = potencyStrengthToModifier(effect.strength)
    let threshold: number | null = null
    if (typeof effect.fixedSrcVal === "number" && Number.isFinite(effect.fixedSrcVal)) {
        threshold = effect.fixedSrcVal + strMod
    } else if (effect.srcStats?.length) {
        const mods = effect.srcStats.map((s) => getAttributeModifier(attributes[s] ?? 10))
        threshold = Math.max(...mods) + strMod
    }

    return {
        summary: String(effect.effect),
        duration: formatDuration(effect.duration),
        potencyThreshold: threshold,
        potencyTargetStats: formatStatList(effect.targetStats),
        potencySourceStats: formatStatList(effect.srcStats),
        potencyStrength: potencyStrengthLabel(effect.strength),
    }
}

export type PowerRollTierPreview = {
    tier: TierIndex
    label: string
    baseDamage: number
    weaponBonus: number
    totalDamage: number
    usesWeapon: boolean
    effect: PotencyEffectPreview | null
}

function readTierFields(powerRoll: PowerRoll, tier: TierIndex) {
    if (tier === 1) {
        return {
            baseDamage: powerRoll.tier1Dmg ?? 0,
            usesWeapon: powerRoll.tier1Wpn === true,
            effect: powerRoll.tier1Effect,
        }
    }
    if (tier === 2) {
        return {
            baseDamage: powerRoll.tier2Dmg ?? 0,
            usesWeapon: powerRoll.tier2Wpn === true,
            effect: powerRoll.tier2Effect,
        }
    }
    return {
        baseDamage: powerRoll.tier3Dmg ?? 0,
        usesWeapon: powerRoll.tier3Wpn === true,
        effect: powerRoll.tier3Effect,
    }
}

export function buildPowerRollTierPreviews(input: {
    powerRoll: PowerRoll
    attributes: Partial<AttributeBlock>
    naturalWeapons?: Record<string, { damage: number }>
    defaultNaturalWeaponKey?: string
}): PowerRollTierPreview[] {
    const tiers: TierIndex[] = [1, 2, 3]
    return tiers.map((tier) => {
        const { baseDamage, usesWeapon, effect } = readTierFields(input.powerRoll, tier)
        const weaponBonus = resolveNaturalWeaponBonus(
            input.naturalWeapons,
            input.defaultNaturalWeaponKey,
            usesWeapon,
        )
        return {
            tier,
            label: TIER_LABELS[tier],
            baseDamage,
            weaponBonus,
            totalDamage: baseDamage + weaponBonus,
            usesWeapon,
            effect: effect ? formatPotencyEffectPreview(effect, input.attributes) : null,
        }
    })
}

export function formatTierDamageLine(preview: PowerRollTierPreview): string {
    if (preview.usesWeapon && preview.weaponBonus > 0) {
        return `${preview.baseDamage} + ${preview.weaponBonus} Wpn = ${preview.totalDamage} DMG`
    }
    if (preview.totalDamage > 0 || preview.baseDamage === 0) {
        return `${preview.totalDamage} DMG`
    }
    return ""
}
