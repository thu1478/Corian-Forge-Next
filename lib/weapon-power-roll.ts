import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils"
import type { InventoryItem, WeaponItem } from "@/lib/equipment-data"

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

/**
 * True if active or offhand holds a weapon that can legally use this weapon-tagged action:
 * roll stat overlap (when roll stats exist), melee/ranged alignment, and if the action is tagged Brawling,
 * the weapon must be tagged Brawling too.
 */
export function hasEquippedWeaponForWeaponAction(
  actionTags: string[] | undefined,
  rollStats: readonly string[] | undefined,
  activeWeapon: InventoryItem | null | undefined,
  offhandWeapon: InventoryItem | null | undefined,
): boolean {
  const tags = actionTags ?? []
  const stats = rollStats ?? []
  for (const w of [activeWeapon, offhandWeapon]) {
    if (!isWeaponItem(w)) continue
    if (!weaponAttributesCompatible(w, stats)) continue
    if (!weaponMatchesActionKind(w, tags)) continue
    if (!weaponSatisfiesBrawlingTag(w, tags)) continue
    return true
  }
  return false
}

/**
 * For +Wpn damage: first equipped weapon (active, then offhand) that matches roll stat overlap, melee/ranged,
 * and Brawling tag when the action has Brawling. Shields are skipped.
 */
export function resolveWeaponForActionPowerRoll(
  actionTags: string[] | undefined,
  rollStats: readonly string[] | undefined,
  activeWeapon: InventoryItem | null | undefined,
  offhandWeapon: InventoryItem | null | undefined,
): WeaponItem | null {
  const tags = actionTags ?? []
  const stats = rollStats ?? []
  for (const w of [activeWeapon, offhandWeapon]) {
    if (!isWeaponItem(w)) continue
    if (!weaponAttributesCompatible(w, stats)) continue
    if (!weaponMatchesActionKind(w, tags)) continue
    if (!weaponSatisfiesBrawlingTag(w, tags)) continue
    return w
  }
  return null
}
