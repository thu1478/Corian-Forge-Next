import type { CharAttribute } from "@/lib/rules"
import {
    formatModifier,
    getAttributeModifier,
    pickRollStat,
} from "@/packages/combat-kit/src/rolls"

function normalizeWeaponAttributes(attrs: readonly string[] | undefined | null): string[] {
    return (attrs ?? []).filter((a): a is string => typeof a === "string" && a.trim().length > 0)
}

/** Intersect action rollStats with weapon attributes; empty weapon attrs = "Any". */
export function getWeaponConstrainedRollStats(
    rollStats: readonly CharAttribute[],
    weaponAttributes: readonly string[] | undefined | null,
): CharAttribute[] {
    if (rollStats.length === 0) return []
    const weaponAttrs = normalizeWeaponAttributes(weaponAttributes)
    if (weaponAttrs.length === 0) return [...rollStats]
    const filtered = rollStats.filter((stat) => weaponAttrs.includes(stat))
    return filtered.length > 0 ? [...filtered] : [...rollStats]
}

export function resolvePowerRollHeaderModifier(
    rollStats: readonly CharAttribute[],
    attributes: Partial<Record<CharAttribute, number>>,
    weaponAttributes?: readonly string[] | null,
): number {
    const effective = getWeaponConstrainedRollStats(rollStats, weaponAttributes)
    if (effective.length === 0) return 0
    const stat = pickRollStat(attributes, effective)
    return getAttributeModifier(attributes[stat] ?? 10)
}

export function formatPowerRollHeaderSimple(
    rollStats: readonly CharAttribute[],
    attributes: Partial<Record<CharAttribute, number>>,
    weapon?: { attributes?: readonly string[] | null } | null,
): string {
    return formatModifier(
        resolvePowerRollHeaderModifier(rollStats, attributes, weapon?.attributes),
    )
}
