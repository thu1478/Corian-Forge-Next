import { actionTagsIncludeCanonical } from "@/logic/actions/tag-utils"
import type { TraitRef } from "@/lib/baseRefs"
import type { ActionCard, PowerRoll } from "@/lib/rules"
import type { InventoryItem, ShieldItem, WeaponItem } from "@/lib/equipment-data"
import { resolveWeaponForActionPowerRoll, parseWeaponBaseDamage } from "@/logic/equipment/weapon-utils"
import { traitRefsIncludeId } from "@/logic/traits/helpers"

function isShieldItem(w: InventoryItem | null | undefined): w is ShieldItem {
    return !!w && w.type === "shield"
}

function isWeaponItem(w: InventoryItem | null | undefined): w is WeaponItem {
    return !!w && w.type === "weapon"
}

/** Half defense (round up) with one shield; full defense of stronger shield with two shields equipped. */
export function getShieldMasterWeaponValue(
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined,
): number {
    const defs: number[] = []
    for (const w of [activeWeapon, offhandWeapon]) {
        if (!isShieldItem(w)) continue
        const d = w.defense
        if (typeof d === "number" && Number.isFinite(d)) defs.push(Math.max(0, Math.floor(d)))
    }
    if (defs.length === 0) return 0
    if (defs.length === 1) return Math.ceil(defs[0] / 2)
    return Math.max(...defs)
}

export function getImplementWeaponDamageFromHands(
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined,
): number {
    for (const w of [activeWeapon, offhandWeapon]) {
        if (!isWeaponItem(w)) continue
        if (!actionTagsIncludeCanonical(w.tags || [], "implement")) continue
        return parseWeaponBaseDamage(w)
    }
    return 0
}

export function equippedArmorIsMartial(armor: InventoryItem | null | undefined): boolean {
    if (!armor || armor.type !== "armor") return false
    return actionTagsIncludeCanonical(armor.tags || [], "martial")
}

export function powerRollHasNumericTierDamage(powerRoll: PowerRoll | undefined): boolean {
    if (!powerRoll) return false
    for (const tier of [1, 2, 3] as const) {
        const v = powerRoll[`tier${tier}Dmg` as keyof PowerRoll]
        if (typeof v === "number" && Number.isFinite(v)) return true
    }
    return false
}

export type PowerRollTierAmountSuffix = "DMG" | "HP" | "Barrier"

export function resolvePowerRollTierAmountSuffix(hiddenTags: string[] | undefined): PowerRollTierAmountSuffix {
    const lower = new Set((hiddenTags ?? []).map((t) => String(t).toLowerCase()))
    if (!lower.has("sustain")) return "DMG"
    if (lower.has("heal") && !lower.has("barrier")) return "HP"
    if (lower.has("barrier") && !lower.has("heal")) return "Barrier"
    return "DMG"
}

export function hiddenTagsIncludeShieldAttack(hiddenTags: string[] | undefined): boolean {
    return (hiddenTags ?? []).some((t) => String(t).toLowerCase() === "shield")
}

export function hiddenTagsIncludeSustain(hiddenTags: string[] | undefined): boolean {
    return (hiddenTags ?? []).some((t) => String(t).toLowerCase() === "sustain")
}

export function hiddenTagsIncludeBarrier(hiddenTags: string[] | undefined): boolean {
    return (hiddenTags ?? []).some((t) => String(t).toLowerCase() === "barrier")
}

export function hiddenTagsIncludeSustainOrBarrier(hiddenTags: string[] | undefined): boolean {
    return hiddenTagsIncludeSustain(hiddenTags) || hiddenTagsIncludeBarrier(hiddenTags)
}

export interface CombatRuleBonusInput {
    traits: TraitRef[] | undefined
    activeWeapon: InventoryItem | null | undefined
    offhandWeapon: InventoryItem | null | undefined
    equippedArmor: InventoryItem | null | undefined
    /** Action ids granted by deployed creatures; excluded from Arcane Tradition implement bonus. */
    creatureGrantedActionIds?: ReadonlySet<string> | null
    /** Bonded weapon inventory uids (Weapon Bond passive). */
    bondedWeaponUids?: readonly string[] | null
}

/**
 * Flat bonus added to every power-roll tier (Reward for Faith implement, Shield Master shield-attack card).
 */
export function computePowerRollFlatDamageBonus(
    action: ActionCard,
    ctx: CombatRuleBonusInput | undefined,
): number {
    if (!ctx?.traits) return 0
    const { traits, activeWeapon, offhandWeapon, equippedArmor } = ctx
    const martial = equippedArmorIsMartial(equippedArmor)
    const implementDmg = getImplementWeaponDamageFromHands(activeWeapon, offhandWeapon)
    const shieldVal = getShieldMasterWeaponValue(activeWeapon, offhandWeapon)
    const hidden = action.hiddenTags
    const ap = action.apCost ?? 0

    let bonus = 0

    if (
        traitRefsIncludeId(traits, "rewardForFaith") &&
        ap >= 2 &&
        !martial &&
        implementDmg > 0 &&
        hiddenTagsIncludeSustain(hidden)
    ) {
        bonus += implementDmg
    }

    if (traitRefsIncludeId(traits, "shieldMaster") && shieldVal > 0 && hiddenTagsIncludeShieldAttack(hidden)) {
        bonus += shieldVal
    }

    return bonus
}

export function computeArcaneTraditionImplementBonus(
    action: ActionCard,
    ctx: CombatRuleBonusInput | undefined,
): number {
    if (!ctx?.traits?.length) return 0
    if (!traitRefsIncludeId(ctx.traits, "arcaneTradition")) return 0
    const ap = action.apCost ?? 0
    if (ap < 2) return 0
    if (ctx.creatureGrantedActionIds?.has(action.id)) return 0
    if (!actionTagsIncludeCanonical(action.tags, "Spell")) return 0
    if (hiddenTagsIncludeSustain(action.hiddenTags)) return 0
    if (!powerRollHasNumericTierDamage(action.powerRoll)) return 0
    if (equippedArmorIsMartial(ctx.equippedArmor)) return 0
    const d = getImplementWeaponDamageFromHands(ctx.activeWeapon, ctx.offhandWeapon)
    return d > 0 ? d : 0
}

/** When +Wpn tier applies but no normal weapon resolved, Shield Master uses shield defense value as weapon damage. */
export function computeShieldSubstituteWeaponDamage(
    action: ActionCard,
    ctx: CombatRuleBonusInput | undefined,
): number | undefined {
    if (!ctx?.traits?.length) return undefined
    if (!traitRefsIncludeId(ctx.traits, "shieldMaster")) return undefined
    const resolved = resolveWeaponForActionPowerRoll(
        action.tags,
        action.powerRoll?.rollStats,
        ctx.activeWeapon,
        ctx.offhandWeapon,
        { traits: ctx.traits },
    )
    if (resolved != null) return undefined
    const v = getShieldMasterWeaponValue(ctx.activeWeapon, ctx.offhandWeapon)
    return v > 0 ? v : undefined
}
