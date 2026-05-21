import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils"
import type { InventoryItem, ShieldItem, WeaponItem } from "@/lib/equipment-data"
import type { TraitRef } from "@/lib/baseRefs"
import { traitRefsIncludeId } from "@/lib/trait-helpers"

function isWeaponItem(w: InventoryItem | null | undefined): w is WeaponItem {
  return !!w && w.type === "weapon"
}

function weaponAttributesCompatible(w: WeaponItem, rollStats: readonly string[]): boolean {
  if (rollStats.length === 0) return true
  const attrs = w.attributes || []
  return attrs.some((attr) => rollStats.includes(attr))
}

/**
 * Melee/ranged on the action must align with the weapon's tags (after normalization).
 * Actions with neither tag impose no range-style constraint (attribute match only).
 */
function weaponMatchesActionKind(w: WeaponItem, actionTags: string[]): boolean {
  const wantsMelee = actionTagsIncludeCanonical(actionTags, "Melee")
  const wantsRanged = actionTagsIncludeCanonical(actionTags, "Ranged")
  if (!wantsMelee && !wantsRanged) return true

  const wTags = w.tags || []
  const wMelee = actionTagsIncludeCanonical(wTags, "Melee")
  const wRanged = actionTagsIncludeCanonical(wTags, "Ranged")

  if (wantsMelee && wantsRanged) return wMelee || wRanged
  if (wantsMelee) return wMelee
  if (wantsRanged) return wRanged
  return true
}

/** Actions tagged Brawling only count a weapon if it also has the Brawling tag (e.g. fists, gauntlets). */
function weaponSatisfiesBrawlingTag(w: WeaponItem, actionTags: string[]): boolean {
  if (!actionTagsIncludeCanonical(actionTags, "brawling")) return true
  return actionTagsIncludeCanonical(w.tags || [], "brawling")
}

/** Actions tagged Firearm require a Firearm-tagged weapon (and waive the attribute-overlap check). */
function isFirearmAction(actionTags: string[]): boolean {
  return actionTagsIncludeCanonical(actionTags, "Firearm")
}

function weaponIsFirearm(w: WeaponItem): boolean {
  return actionTagsIncludeCanonical(w.tags || [], "Firearm")
}

function isShieldItem(w: InventoryItem | null | undefined): w is ShieldItem {
  return !!w && w.type === "shield"
}

/** Shields count for Weapon actions when Shield Master applies (melee bashes and ranged throws). */
function shieldHandSatisfiesWeaponActionKind(_actionTags: string[]): boolean {
  return true
}

export type WeaponActionEligibilityOptions = {
  traits?: readonly TraitRef[]
}

function hasTightGrip(traits: readonly TraitRef[] | undefined): boolean {
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

/** At least one hand holds a weapon with the Brawling tag (for brawling-only non-Weapon actions). */
export function hasBrawlingWeaponInHands(
  activeWeapon: InventoryItem | null | undefined,
  offhandWeapon: InventoryItem | null | undefined,
): boolean {
  for (const w of [activeWeapon, offhandWeapon]) {
    if (!isWeaponItem(w)) continue
    if (actionTagsIncludeCanonical(w.tags || [], "brawling")) return true
  }
  return false
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

/**
 * True if active or offhand holds a weapon that can legally use this weapon-tagged action:
 * roll stat overlap (when roll stats exist), melee/ranged alignment, and if the action is tagged Brawling,
 * the weapon must be tagged Brawling too.
 *
 * Firearm-tagged actions skip the attribute-overlap check but require an equipped Firearm weapon.
 */
export function hasEquippedWeaponForWeaponAction(
  actionTags: string[] | undefined,
  rollStats: readonly string[] | undefined,
  activeWeapon: InventoryItem | null | undefined,
  offhandWeapon: InventoryItem | null | undefined,
  options?: WeaponActionEligibilityOptions,
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

/**
 * For +Wpn damage: first equipped weapon (active, then offhand) that matches roll stat overlap, melee/ranged,
 * and Brawling tag when the action has Brawling. Shields are skipped.
 *
 * Firearm-tagged actions skip the attribute-overlap check and instead require a Firearm-tagged weapon.
 */
export function resolveWeaponForActionPowerRoll(
  actionTags: string[] | undefined,
  rollStats: readonly string[] | undefined,
  activeWeapon: InventoryItem | null | undefined,
  offhandWeapon: InventoryItem | null | undefined,
  options?: WeaponActionEligibilityOptions,
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
