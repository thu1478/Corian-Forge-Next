import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils"
import type { TraitRef } from "@/lib/baseRefs"
import type { InventoryItem, WeaponItem } from "@/lib/equipment-data"
import { traitRefsIncludeId } from "@/lib/trait-helpers"

export type WeaponBondContext = {
    bondedWeaponUids?: readonly string[] | null
    hasWeaponBondPassive?: boolean
}

export function hasWeaponBondPassive(traits: readonly TraitRef[] | undefined): boolean {
    return traitRefsIncludeId(traits, "weaponBond")
}

export function isMeleeWeapon(item: InventoryItem | null | undefined): item is WeaponItem {
    return !!item && item.type === "weapon" && actionTagsIncludeCanonical(item.tags, "melee")
}

export function parseWeaponBaseDamage(weapon: WeaponItem | null | undefined): number {
    if (!weapon) return 0
    const raw = weapon.damage as number | string | undefined
    if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, raw)
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export function getWeaponBondBonus(
    uid: string,
    bondedWeaponUids: readonly string[] | undefined | null,
    hasPassive: boolean
): number {
    if (!hasPassive || !uid) return 0
    const set = bondedWeaponUids ?? []
    return set.includes(uid) ? 1 : 0
}

export function getEffectiveWeaponDamage(
    weapon: WeaponItem | null | undefined,
    ctx: WeaponBondContext
): number {
    const base = parseWeaponBaseDamage(weapon)
    if (!weapon) return base
    const bonus = getWeaponBondBonus(
        weapon.uid,
        ctx.bondedWeaponUids,
        ctx.hasWeaponBondPassive ?? false
    )
    return base + bonus
}

export function buildWeaponBondContext(
    traits: readonly TraitRef[] | undefined,
    bondedWeaponUids: readonly string[] | undefined | null
): WeaponBondContext {
    const passiveActive = hasWeaponBondPassive(traits)
    return {
        bondedWeaponUids,
        hasWeaponBondPassive: passiveActive,
    }
}
