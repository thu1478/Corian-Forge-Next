import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils"
import type { TraitRef } from "@/lib/baseRefs"
import type { InventoryItem, ShieldItem, WeaponItem } from "@/lib/equipment-data"
import { traitRefsIncludeId } from "@/lib/trait-helpers"

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isWeaponItem(w: InventoryItem | null | undefined): w is WeaponItem {
    return !!w && w.type === "weapon"
}

function isShieldItem(w: InventoryItem | null | undefined): w is ShieldItem {
    return !!w && w.type === "shield"
}

export function isMeleeWeapon(item: InventoryItem | null | undefined): item is WeaponItem {
    return !!item && item.type === "weapon" && actionTagsIncludeCanonical(item.tags, "melee")
}

/** Unarmed placeholder (`wp_fist`); does not block Dueling Stance in the offhand. */
export function isFistWeapon(item: InventoryItem | null | undefined): boolean {
    if (!isWeaponItem(item)) return false
    if (String(item.id ?? "").trim() === "wp_fist") return true
    return false
}

function isImplementWeapon(item: InventoryItem | null | undefined): boolean {
    return isWeaponItem(item) && actionTagsIncludeCanonical(item.tags || [], "implement")
}

// ---------------------------------------------------------------------------
// Equipment / dual wield
// ---------------------------------------------------------------------------

function resolveHandSlot(slot: unknown, inventory: unknown[] | undefined): InventoryItem | null {
    if (slot == null) return null
    if (typeof slot === "object" && slot !== null && "type" in slot) {
        const t = (slot as InventoryItem).type
        if (t === "weapon" || t === "shield") return slot as InventoryItem
        return null
    }
    const uid = typeof slot === "string" ? slot : null
    if (!uid || !Array.isArray(inventory)) return null
    const item = inventory.find((i: unknown) => {
        if (!i || typeof i !== "object") return false
        return String((i as { uid?: string }).uid) === String(uid)
    }) as InventoryItem | undefined
    if (!item) return null
    if (item.type === "weapon" || item.type === "shield") return item
    return null
}

/** Hydrated equipment objects or inventory UIDs (creator / save). */
export function resolveEquippedHands(character: {
    equipment?: { activeWeapon?: unknown; offhand?: unknown } | null
    inventory?: unknown[]
} | null | undefined): {
    activeWeapon: InventoryItem | null
    offhandWeapon: InventoryItem | null
} {
    const eq = character?.equipment
    if (!eq) {
        return { activeWeapon: null, offhandWeapon: null }
    }
    return {
        activeWeapon: resolveHandSlot(eq.activeWeapon, character?.inventory),
        offhandWeapon: resolveHandSlot(eq.offhand, character?.inventory),
    }
}

/** Both hands hold weapons (any tags); shields do not count. */
export function isDualWielding(
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined
): boolean {
    return isWeaponItem(activeWeapon) && isWeaponItem(offhandWeapon)
}

// ---------------------------------------------------------------------------
// Damage parsing
// ---------------------------------------------------------------------------

export function parseWeaponBaseDamage(weapon: WeaponItem | null | undefined): number {
    if (!weapon) return 0
    const raw = weapon.damage as number | string | undefined
    if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, raw)
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export type WeaponDamageContext = {
    traits?: readonly TraitRef[]
    activeWeapon?: InventoryItem | null
    offhandWeapon?: InventoryItem | null
}

/** Base weapon damage plus equipment-derived bonuses (e.g. Dueling Stance). */
export function getEffectiveWeaponDamage(
    weapon: WeaponItem | null | undefined,
    ctx?: WeaponDamageContext
): number {
    const base = parseWeaponBaseDamage(weapon)
    if (!weapon?.uid || !ctx?.traits?.length) return base
    const bonus = duelingStanceDamageBonus(weapon.uid, ctx)
    return base + bonus
}

// ---------------------------------------------------------------------------
// Hand profile / Tight Grip
// ---------------------------------------------------------------------------

export function hasTightGrip(traits: readonly TraitRef[] | undefined): boolean {
    return !!traits && traitRefsIncludeId(traits, "tightGrip")
}

/** Effective 1H/2H profile for action tag matching (Tight Grip: non-Heavy 2H counts as 1H). */
export function weaponEffectiveHandProfile(
    w: WeaponItem,
    hasTightGripFeat: boolean
): { oneHand: boolean; twoHand: boolean } {
    const twoHand = actionTagsIncludeCanonical(w.tags, "2H")
    const oneHand =
        actionTagsIncludeCanonical(w.tags, "1H") ||
        (hasTightGripFeat && twoHand && !actionTagsIncludeCanonical(w.tags, "heavy"))
    return { oneHand, twoHand }
}

export function isQualifyingOneHandWeapon(
    w: WeaponItem,
    traits: readonly TraitRef[] | undefined
): boolean {
    if (isFistWeapon(w)) return false
    return weaponEffectiveHandProfile(w, hasTightGrip(traits)).oneHand
}

/** Glossary 1H/2H action tags vs equipped weapon hand profile. */
export function weaponSatisfiesActionHandTags(
    actionTags: string[],
    w: WeaponItem,
    hasTightGripFeat: boolean
): boolean {
    const wants1H = actionTagsIncludeCanonical(actionTags, "1H")
    const wants2H = actionTagsIncludeCanonical(actionTags, "2H")
    if (!wants1H && !wants2H) return true
    const { oneHand, twoHand } = weaponEffectiveHandProfile(w, hasTightGripFeat)
    if (wants1H && !oneHand) return false
    if (wants2H && !twoHand) return false
    return true
}

function offhandAllowsDuelingStance(offhand: InventoryItem | null | undefined): boolean {
    if (offhand == null) return true
    if (isFistWeapon(offhand)) return true
    return false
}

export type DuelingStanceState = {
    active: boolean
    duelingWeaponUid?: string
}

export function qualifiesForDuelingStance(
    traits: readonly TraitRef[] | undefined,
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined
): DuelingStanceState {
    if (!traits?.length || !traitRefsIncludeId(traits, "duelingStance")) {
        return { active: false }
    }

    const candidates: WeaponItem[] = []
    for (const hand of [activeWeapon, offhandWeapon]) {
        if (!isWeaponItem(hand)) continue
        if (isFistWeapon(hand)) continue
        if (isImplementWeapon(hand)) continue
        if (!isQualifyingOneHandWeapon(hand, traits)) continue
        candidates.push(hand)
    }

    if (candidates.length !== 1) return { active: false }

    const weapon = candidates[0]
    const otherHand = weapon.uid === activeWeapon?.uid ? offhandWeapon : activeWeapon

    if (!offhandAllowsDuelingStance(otherHand)) return { active: false }
    if (isShieldItem(otherHand)) return { active: false }
    if (isWeaponItem(otherHand) && !isFistWeapon(otherHand)) return { active: false }
    if (isImplementWeapon(otherHand)) return { active: false }

    return { active: true, duelingWeaponUid: weapon.uid }
}

export function duelingStanceDamageBonus(
    weaponUid: string | undefined,
    ctx: WeaponDamageContext | undefined
): number {
    if (!weaponUid || !ctx) return 0
    const state = qualifiesForDuelingStance(
        ctx.traits,
        ctx.activeWeapon ?? null,
        ctx.offhandWeapon ?? null
    )
    if (!state.active || state.duelingWeaponUid !== weaponUid) return 0
    return 1
}

export function isDuelingStanceWeapon(
    weaponUid: string | undefined,
    ctx: WeaponDamageContext | undefined
): boolean {
    if (!weaponUid || !ctx) return false
    const state = qualifiesForDuelingStance(
        ctx.traits,
        ctx.activeWeapon ?? null,
        ctx.offhandWeapon ?? null
    )
    return state.active && state.duelingWeaponUid === weaponUid
}

// ---------------------------------------------------------------------------
// Power roll weapon resolution
// ---------------------------------------------------------------------------

function weaponAttributesCompatible(w: WeaponItem, rollStats: readonly string[]): boolean {
    if (rollStats.length === 0) return true
    const attrs = w.attributes || []
    return attrs.some((attr) => rollStats.includes(attr))
}

function weaponMatchesActionKind(w: WeaponItem, actionTags: string[]): boolean {
    const wantsMelee = actionTagsIncludeCanonical(actionTags, "Melee")
    const wantsRanged = actionTagsIncludeCanonical(actionTags, "Ranged")
    if (!wantsMelee && !wantsRanged) return true

    const wTags = w.tags || []
    const wMelee = actionTagsIncludeCanonical(wTags, "Melee")
    const wRanged = actionTagsIncludeCanonical(wTags, "Ranged")
    const wThrowing = actionTagsIncludeCanonical(wTags, "Throwing")
    const actionThrowing = actionTagsIncludeCanonical(actionTags, "Throwing")
    const satisfiesRanged = wRanged || (actionThrowing && wThrowing)

    if (wantsMelee && wantsRanged) return wMelee || satisfiesRanged
    if (wantsMelee) return wMelee
    if (wantsRanged) return satisfiesRanged
    return true
}

function weaponSatisfiesBrawlingTag(w: WeaponItem, actionTags: string[]): boolean {
    if (!actionTagsIncludeCanonical(actionTags, "brawling")) return true
    return actionTagsIncludeCanonical(w.tags || [], "brawling")
}

function isFirearmAction(actionTags: string[]): boolean {
    return actionTagsIncludeCanonical(actionTags, "Firearm")
}

function weaponIsFirearm(w: WeaponItem): boolean {
    return actionTagsIncludeCanonical(w.tags || [], "Firearm")
}

function shieldHandSatisfiesWeaponActionKind(_actionTags: string[]): boolean {
    return true
}

export type WeaponActionEligibilityOptions = {
    traits?: readonly TraitRef[]
}

function weaponPassesActionChecks(
    w: WeaponItem,
    actionTags: string[],
    rollStats: readonly string[],
    firearmAction: boolean,
    tightGrip: boolean
): boolean {
    if (firearmAction) {
        if (!weaponIsFirearm(w)) return false
    } else if (!weaponAttributesCompatible(w, rollStats)) {
        return false
    }
    if (!weaponMatchesActionKind(w, actionTags)) return false
    if (!weaponSatisfiesBrawlingTag(w, actionTags)) return false
    if (!weaponSatisfiesActionHandTags(actionTags, w, tightGrip)) return false
    return true
}

export function hasBrawlingWeaponInHands(
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined
): boolean {
    for (const w of [activeWeapon, offhandWeapon]) {
        if (!isWeaponItem(w)) continue
        if (actionTagsIncludeCanonical(w.tags || [], "brawling")) return true
    }
    return false
}

export function hasEquippedWeaponForWeaponAction(
    actionTags: string[] | undefined,
    rollStats: readonly string[] | undefined,
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined,
    options?: WeaponActionEligibilityOptions
): boolean {
    const tags = actionTags ?? []
    const stats = rollStats ?? []
    const firearmAction = isFirearmAction(tags)
    const tightGrip = hasTightGrip(options?.traits)

    for (const w of [activeWeapon, offhandWeapon]) {
        if (!isWeaponItem(w)) continue
        if (weaponPassesActionChecks(w, tags, stats, firearmAction, tightGrip)) return true
    }

    const shieldMaster = options?.traits && traitRefsIncludeId(options.traits, "shieldMaster")
    if (shieldMaster && actionTagsIncludeCanonical(tags, "Weapon") && !firearmAction) {
        for (const s of [activeWeapon, offhandWeapon]) {
            if (!isShieldItem(s)) continue
            if (actionTagsIncludeCanonical(tags, "brawling")) continue
            if (stats.length > 0 && !weaponAttributesCompatibleShieldMaster(stats)) continue
            if (!shieldHandSatisfiesWeaponActionKind(tags)) continue
            return true
        }
    }

    return false
}

function weaponAttributesCompatibleShieldMaster(_rollStats: readonly string[]): boolean {
    return true
}

export function resolveWeaponForActionPowerRoll(
    actionTags: string[] | undefined,
    rollStats: readonly string[] | undefined,
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined,
    options?: WeaponActionEligibilityOptions
): WeaponItem | null {
    const tags = actionTags ?? []
    const stats = rollStats ?? []
    const firearmAction = isFirearmAction(tags)
    const tightGrip = hasTightGrip(options?.traits)

    for (const w of [activeWeapon, offhandWeapon]) {
        if (!isWeaponItem(w)) continue
        if (weaponPassesActionChecks(w, tags, stats, firearmAction, tightGrip)) return w
    }
    return null
}

// ---------------------------------------------------------------------------
// Weapon Bond
// ---------------------------------------------------------------------------

export type WeaponBondContext = {
    bondedWeaponUids?: readonly string[] | null
    hasWeaponBondPassive?: boolean
}

export function hasWeaponBondPassive(traits: readonly TraitRef[] | undefined): boolean {
    return traitRefsIncludeId(traits, "weaponBond")
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

export function isBondedWeapon(
    uid: string | undefined,
    ctx: WeaponBondContext | undefined
): boolean {
    if (!uid || !ctx?.hasWeaponBondPassive) return false
    return (ctx.bondedWeaponUids ?? []).includes(uid)
}
