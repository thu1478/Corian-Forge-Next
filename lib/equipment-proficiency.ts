import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils"
import type { InventoryItem } from "@/lib/equipment-data"

export const HEAVY_MIGHT_REQUIREMENT = 13

/** Class `proficiencies` entries from rules.json that gate martial gear. */
export type MartialProficiencyId =
  | "martialMelee"
  | "martialRanged"
  | "martialArmor"
  | "martialShields"

export const MARTIAL_PROFICIENCY_ROWS: ReadonlyArray<{ id: MartialProficiencyId; label: string }> = [
  { id: "martialMelee", label: "Melee martial weapons" },
  { id: "martialRanged", label: "Ranged martial weapons" },
  { id: "martialShields", label: "Martial shields" },
  { id: "martialArmor", label: "Martial armor" },
]

type ClassEntry = { id: string; level?: number }

export function collectClassProficiencies(
  classes: ClassEntry[] | undefined,
  rulesClasses: Record<string, { proficiencies?: string[] }> | undefined,
): Set<string> {
  const out = new Set<string>()
  if (!classes?.length || !rulesClasses) return out
  for (const c of classes) {
    const lvl = Number(c.level)
    if (!c.id || !Number.isFinite(lvl) || lvl <= 0) continue
    const list = rulesClasses[c.id]?.proficiencies
    if (!Array.isArray(list)) continue
    for (const p of list) {
      if (typeof p === "string" && p) out.add(p)
    }
  }
  return out
}

function itemRequiresMartialCheck(item: InventoryItem | null | undefined): boolean {
  if (!item) return false
  return actionTagsIncludeCanonical(item.tags, "martial")
}

export function itemHasHeavyTag(item: InventoryItem | null | undefined): boolean {
  if (!item) return false
  return actionTagsIncludeCanonical(item.tags, "heavy")
}

export function heavyMightRequirementDeficitMessage(
  item: InventoryItem | null | undefined,
  might: number | null | undefined,
): string | null {
  if (!itemHasHeavyTag(item)) return null
  const score = Number(might)
  if (Number.isFinite(score) && score >= HEAVY_MIGHT_REQUIREMENT) return null
  return `Heavy equipment requires Might ${HEAVY_MIGHT_REQUIREMENT} to use effectively. Your Might is ${
    Number.isFinite(score) ? score : "unknown"
  }. See glossary: Heavy.`
}

/**
 * When non-null, the equipped item needs a proficiency the character lacks.
 * Message is suitable for a tooltip.
 */
export function martialProficiencyDeficitMessage(
  item: InventoryItem | null | undefined,
  proficiencies: Set<string> | ReadonlySet<string>,
): string | null {
  if (!item || !itemRequiresMartialCheck(item)) return null

  if (item.type === "armor") {
    return proficiencies.has("martialArmor")
      ? null
      : "You are not proficient with martial armor. See glossary: Martial."
  }

  if (item.type === "shield") {
    return proficiencies.has("martialShields")
      ? null
      : "You are not proficient with martial shields. See glossary: Martial."
  }

  if (item.type === "weapon") {
    const melee = actionTagsIncludeCanonical(item.tags, "Melee")
    const ranged = actionTagsIncludeCanonical(item.tags, "Ranged")

    if (melee && ranged) {
      if (proficiencies.has("martialMelee") || proficiencies.has("martialRanged")) return null
      return "You are not proficient with martial melee or martial ranged weapons (this item is both)."
    }
    if (ranged) {
      return proficiencies.has("martialRanged")
        ? null
        : "You are not proficient with martial ranged weapons."
    }
    if (melee) {
      return proficiencies.has("martialMelee")
        ? null
        : "You are not proficient with martial melee weapons."
    }
    return proficiencies.has("martialMelee")
      ? null
      : "You are not proficient with martial melee weapons (this martial weapon has no melee/ranged tag)."
  }

  return null
}
